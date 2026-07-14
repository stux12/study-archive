import fs from 'node:fs/promises';
import path from 'node:path';

const token = process.env.NOTION_TOKEN;
const configuredDataSourceId = process.env.NOTION_DATA_SOURCE_ID;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!token || (!configuredDataSourceId && !databaseId)) {
  throw new Error('NOTION_TOKEN과 NOTION_DATABASE_ID(또는 NOTION_DATA_SOURCE_ID)를 설정해야 합니다. .env.example을 확인하세요.');
}

const property = {
  title: process.env.NOTION_TITLE_PROPERTY || '제목',
  status: process.env.NOTION_STATUS_PROPERTY || '상태',
  tags: process.env.NOTION_TAGS_PROPERTY || '태그',
  category: process.env.NOTION_CATEGORY_PROPERTY || '카테고리',
  slug: process.env.NOTION_SLUG_PROPERTY || '슬러그',
  summary: process.env.NOTION_SUMMARY_PROPERTY || '요약',
  date: process.env.NOTION_DATE_PROPERTY || '학습일',
};
const headers = { Authorization: `Bearer ${token}`, 'Notion-Version': '2026-03-11', 'Content-Type': 'application/json' };
const api = async (url, options = {}) => {
  const response = await fetch(`https://api.notion.com/v1${url}`, { headers, ...options });
  if (!response.ok) throw new Error(`Notion API ${response.status}: ${await response.text()}`);
  return response.json();
};
const text = (items = []) => items.map((item) => item.plain_text ?? item.text?.content ?? '').join('');
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || 'untitled';
const value = (page, name, kind) => page.properties[name]?.[kind];

async function blocksFor(blockId) {
  const blocks = [];
  let cursor;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const result = await api(`/blocks/${blockId}/children${query}`);
    blocks.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function blockToMarkdown(block) {
  const type = block.type;
  const data = block[type] || {};
  const content = text(data.rich_text);
  if (type === 'paragraph') return content ? `${content}\n` : '';
  if (type === 'heading_1') return `# ${content}\n`;
  if (type === 'heading_2') return `## ${content}\n`;
  if (type === 'heading_3') return `### ${content}\n`;
  if (type === 'bulleted_list_item') return `- ${content}\n`;
  if (type === 'numbered_list_item') return `1. ${content}\n`;
  if (type === 'to_do') return `- [${data.checked ? 'x' : ' '}] ${content}\n`;
  if (type === 'quote') return `> ${content}\n`;
  if (type === 'code') return `\`\`\`${data.language || ''}\n${content}\n\`\`\`\n`;
  if (type === 'divider') return '---\n';
  if (type === 'bookmark') return `[${data.caption ? text(data.caption) : data.url}](${data.url})\n`;
  if (type === 'callout') return `> ${content}\n`;
  return content ? `${content}\n` : '';
}

async function queryPublishedPages(dataSourceId) {
  const pages = [];
  let cursor;
  do {
    const result = await api(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor, filter: { property: property.status, status: { equals: 'Published' } } }),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// 노션 페이지를 사이트에 쓰기 좋은 형태로 정리한다(본문 blocks 포함).
async function preparePages(pages) {
  const entries = [];
  for (const page of pages) {
    const title = text(value(page, property.title, 'title')) || '제목 없음';
    const slug = value(page, property.slug, 'rich_text')?.length ? slugify(text(value(page, property.slug, 'rich_text'))) : slugify(title);
    const tags = (value(page, property.tags, 'multi_select') || []).map((tag) => tag.name);
    const category = value(page, property.category, 'select')?.name || '미분류';
    const summary = text(value(page, property.summary, 'rich_text'));
    const date = value(page, property.date, 'date')?.start || page.last_edited_time.slice(0, 10);
    const blocks = await blocksFor(page.id);
    const body = blocks.map(blockToMarkdown).join('\n');
    entries.push({ id: page.id, title, slug, tags, category, summary, date, body });
  }
  return entries;
}

// 발행 안전장치: 배포로 넘어가기 전에 조용한 데이터 손실을 막는다.
function validateEntries(entries, { allowEmpty }) {
  const problems = [];
  const warnings = [];

  // (1) 0건 가드: 상태값 오타/필터 문제로 전체 글이 지워지는 사고 방지
  if (entries.length === 0 && !allowEmpty) {
    problems.push('Published 상태의 글이 0건입니다. 상태값/필터를 확인하세요. 의도한 것이라면 ALLOW_EMPTY_SYNC=1 로 실행하세요.');
  }

  // (2) 중복 슬러그: 같은 파일명으로 저장돼 한 글이 조용히 덮어써지는 것 차단
  const bySlug = new Map();
  for (const entry of entries) {
    if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, []);
    bySlug.get(entry.slug).push(entry.title);
  }
  for (const [slug, titles] of bySlug) {
    if (titles.length > 1) {
      problems.push(`중복 슬러그 "${slug}" → ${titles.map((t) => JSON.stringify(t)).join(', ')} (노션 '슬러그' 속성으로 구분하세요)`);
    }
  }

  // (3) 경고: 발행은 막지 않되 품질 문제를 드러낸다
  for (const entry of entries) {
    if (!entry.summary.trim()) warnings.push(`요약 없음: ${JSON.stringify(entry.title)} (${entry.slug})`);
    if (!entry.body.trim()) warnings.push(`본문이 비어 있음: ${JSON.stringify(entry.title)} (${entry.slug})`);
  }

  return { problems, warnings };
}

async function writeEntries(entries) {
  const output = path.resolve('src/content/posts');
  await fs.mkdir(output, { recursive: true });
  await Promise.all((await fs.readdir(output)).filter((file) => file.endsWith('.md') && file !== 'welcome.md').map((file) => fs.unlink(path.join(output, file))));

  for (const entry of entries) {
    const frontmatter = `---\ntitle: ${JSON.stringify(entry.title)}\ndescription: ${JSON.stringify(entry.summary)}\ndate: ${entry.date}\ncategory: ${JSON.stringify(entry.category)}\ntags: ${JSON.stringify(entry.tags)}\ndraft: false\nnotionId: ${JSON.stringify(entry.id)}\n---\n\n`;
    await fs.writeFile(path.join(output, `${entry.slug}.md`), frontmatter + entry.body, 'utf8');
  }
}

async function main() {
  let dataSourceId = configuredDataSourceId;
  if (!dataSourceId) {
    const database = await api(`/databases/${databaseId}`);
    dataSourceId = database.data_sources?.[0]?.id;
    if (!dataSourceId) throw new Error('노션 데이터베이스에서 Data Source를 찾지 못했습니다.');
  }

  const pages = await queryPublishedPages(dataSourceId);
  const entries = await preparePages(pages);
  const { problems, warnings } = validateEntries(entries, { allowEmpty: process.env.ALLOW_EMPTY_SYNC === '1' });

  for (const warning of warnings) console.warn(`⚠️  ${warning}`);

  if (problems.length) {
    console.error('\n❌ 동기화를 중단합니다. 다음 문제를 먼저 해결하세요:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  await writeEntries(entries);
  console.log(`✅ ${entries.length}개의 Published 노션 페이지를 동기화했습니다.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
