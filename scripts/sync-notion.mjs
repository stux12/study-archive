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
  group: process.env.NOTION_GROUP_PROPERTY || '분야',
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

const ASSETS_ROOT = 'src/assets/posts';

const value = (page, name, kind) => page.properties[name]?.[kind];
const slugify = (v) => v.toLowerCase().trim().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || 'untitled';

// ── 리치 텍스트 렌더 ──────────────────────────────────────────
const plain = (items = []) => (items || []).map((i) => i.plain_text ?? i.text?.content ?? '').join('');
const escapeHtml = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s = '') => escapeHtml(s).replace(/"/g, '&quot;');

function richMd(items = []) {
  return (items || []).map((i) => {
    let s = i.plain_text ?? i.text?.content ?? '';
    if (!s) return '';
    const a = i.annotations || {};
    if (a.code) { s = '`' + s + '`'; }
    else {
      if (a.bold) s = `**${s}**`;
      if (a.italic) s = `*${s}*`;
      if (a.strikethrough) s = `~~${s}~~`;
    }
    const href = i.href || i.text?.link?.url;
    return href ? `[${s}](${href})` : s;
  }).join('');
}

function richHtml(items = []) {
  return (items || []).map((i) => {
    let s = escapeHtml(i.plain_text ?? i.text?.content ?? '');
    if (!s) return '';
    const a = i.annotations || {};
    if (a.code) { s = `<code>${s}</code>`; }
    else {
      if (a.bold) s = `<strong>${s}</strong>`;
      if (a.italic) s = `<em>${s}</em>`;
      if (a.strikethrough) s = `<s>${s}</s>`;
    }
    const href = i.href || i.text?.link?.url;
    return href ? `<a href="${escapeAttr(href)}">${s}</a>` : s;
  }).join('');
}

// ── 블록 조회 ────────────────────────────────────────────────
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

// ── 이미지 다운로드(만료 URL 방지) ───────────────────────────
function extFromUrl(url, contentType) {
  const m = url.split('?')[0].match(/\.(png|jpe?g|gif|webp|svg|avif)$/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('avif')) return 'avif';
  return 'png';
}

async function downloadImage(url, ctx) {
  if (ctx.dryRun) { ctx.imageIndex += 1; return `../../assets/posts/${ctx.slug}/${String(ctx.imageIndex).padStart(2, '0')}.png`; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 다운로드 실패 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  ctx.imageIndex += 1;
  const file = `${String(ctx.imageIndex).padStart(2, '0')}.${extFromUrl(url, res.headers.get('content-type'))}`;
  const dir = path.resolve(ASSETS_ROOT, ctx.slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), buf);
  return `../../assets/posts/${ctx.slug}/${file}`;
}

// ── HTML 컨텍스트(콜아웃/토글 내부) ──────────────────────────
async function renderBlocksHtml(blocks, ctx) {
  let html = '';
  let i = 0;
  while (i < blocks.length) {
    const type = blocks[i].type;
    if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const tag = type === 'bulleted_list_item' ? 'ul' : 'ol';
      let items = '';
      while (i < blocks.length && blocks[i].type === type) {
        items += `<li>${richHtml(blocks[i][type].rich_text)}</li>`;
        i += 1;
      }
      html += `<${tag}>${items}</${tag}>`;
    } else {
      html += await renderBlockHtml(blocks[i], ctx);
      i += 1;
    }
  }
  return html;
}

async function renderBlockHtml(block, ctx) {
  const type = block.type;
  const data = block[type] || {};
  const content = richHtml(data.rich_text);
  if (type === 'paragraph') return content ? `<p>${content}</p>` : '';
  if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') return `<p><strong>${content}</strong></p>`;
  if (type === 'to_do') return `<p>${data.checked ? '☑' : '☐'} ${content}</p>`;
  if (type === 'quote') return `<blockquote>${content}</blockquote>`;
  if (type === 'code') return `<pre><code>${escapeHtml(plain(data.rich_text))}</code></pre>`;
  if (type === 'callout') return await renderCallout(block, ctx);
  if (type === 'toggle') return await renderToggle(block, ctx);
  if (type === 'image') return `<p><em>🖼 ${escapeHtml(plain(data.caption) || '이미지')}</em></p>`;
  return content ? `<p>${content}</p>` : '';
}

// ── 콜아웃 / 토글 / 표 / 이미지 ──────────────────────────────
function calloutTone(color = '') {
  if (/green/.test(color)) return 'tip';
  if (/red|orange|yellow|pink|brown/.test(color)) return 'warn';
  return 'note';
}

async function renderCallout(block, ctx) {
  const data = block.callout;
  const icon = data.icon?.type === 'emoji' ? data.icon.emoji : '💡';
  let inner = richHtml(data.rich_text) ? `<p>${richHtml(data.rich_text)}</p>` : '';
  if (block.has_children) inner += await renderBlocksHtml(await blocksFor(block.id), ctx);
  return `<aside class="callout callout--${calloutTone(data.color)}"><span class="callout-icon" aria-hidden="true">${icon}</span><div class="callout-body">${inner}</div></aside>`;
}

async function renderToggle(block, ctx) {
  const data = block.toggle;
  const summary = richHtml(data.rich_text) || '자세히 보기';
  const inner = block.has_children ? await renderBlocksHtml(await blocksFor(block.id), ctx) : '';
  return `<details class="toggle"><summary>${summary}</summary><div class="toggle-body">${inner}</div></details>`;
}

async function renderTable(block) {
  const rows = block.has_children ? await blocksFor(block.id) : [];
  const header = block.table?.has_column_header;
  let body = '';
  rows.forEach((row, index) => {
    if (row.type !== 'table_row') return;
    const cells = row.table_row.cells || [];
    const tag = header && index === 0 ? 'th' : 'td';
    body += `<tr>${cells.map((c) => `<${tag}>${richHtml(c)}</${tag}>`).join('')}</tr>`;
  });
  return `<div class="table-wrap"><table>${body}</table></div>`;
}

async function renderImage(block, ctx) {
  const data = block.image;
  const url = data.type === 'external' ? data.external?.url : data.file?.url;
  if (!url) return '';
  const caption = plain(data.caption);
  const src = await downloadImage(url, ctx);
  const alt = (caption || ctx.title).replace(/[[\]]/g, '');
  const img = `![${alt}](${src})`;
  return caption ? `${img}\n\n<span class="figcaption">${escapeHtml(caption)}</span>\n` : `${img}\n`;
}

// ── Markdown 컨텍스트(문서 본문) ─────────────────────────────
async function renderBlocksMd(blocks, ctx) {
  const parts = [];
  for (const block of blocks) parts.push(await renderBlockMd(block, ctx));
  return parts.filter((p) => p !== '').join('\n');
}

async function listItemMd(block, ctx, marker) {
  const data = block[block.type];
  let out = `${marker} ${richMd(data.rich_text)}\n`;
  if (block.has_children) {
    const child = await renderBlocksMd(await blocksFor(block.id), ctx);
    out += child.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n') + '\n';
  }
  return out;
}

async function renderBlockMd(block, ctx) {
  const type = block.type;
  const data = block[type] || {};
  const content = richMd(data.rich_text);
  if (type === 'paragraph') return content ? `${content}\n` : '';
  if (type === 'heading_1') return `# ${content}\n`;
  if (type === 'heading_2') return `## ${content}\n`;
  if (type === 'heading_3') return `### ${content}\n`;
  if (type === 'bulleted_list_item') return await listItemMd(block, ctx, '-');
  if (type === 'numbered_list_item') return await listItemMd(block, ctx, '1.');
  if (type === 'to_do') return `- [${data.checked ? 'x' : ' '}] ${content}\n`;
  if (type === 'quote') return `> ${content}\n`;
  if (type === 'code') return `\`\`\`${data.language || ''}\n${plain(data.rich_text)}\n\`\`\`\n`;
  if (type === 'divider') return '---\n';
  if (type === 'bookmark') return `[${data.caption ? plain(data.caption) : data.url}](${data.url})\n`;
  if (type === 'callout') return `${await renderCallout(block, ctx)}\n`;
  if (type === 'toggle') return `${await renderToggle(block, ctx)}\n`;
  if (type === 'table') return `${await renderTable(block)}\n`;
  if (type === 'image') return await renderImage(block, ctx);
  if (block.has_children) return await renderBlocksMd(await blocksFor(block.id), ctx);
  return content ? `${content}\n` : '';
}

// ── 페이지 조회 / 준비 / 검증 ────────────────────────────────
async function queryByStatus(dataSourceId, statusValue) {
  const pages = [];
  let cursor;
  do {
    const result = await api(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor, filter: { property: property.status, status: { equals: statusValue } } }),
    });
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function slugFor(page) {
  const title = plain(value(page, property.title, 'title')) || '제목 없음';
  const slugProp = value(page, property.slug, 'rich_text');
  return slugProp?.length ? slugify(plain(slugProp)) : slugify(title);
}

// 저장소에 이미 커밋된, Notion에서 생성된 글(frontmatter에 notionId 있음)의 slug 집합
async function readExistingNotionSlugs(outputDir) {
  const slugs = new Set();
  let files = [];
  try { files = await fs.readdir(outputDir); } catch { return slugs; }
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = await fs.readFile(path.join(outputDir, file), 'utf8');
    if (/^notionId:/m.test(content)) slugs.add(file.replace(/\.md$/, ''));
  }
  return slugs;
}

async function preparePages(pages, { dryRun }) {
  const entries = [];
  for (const page of pages) {
    const title = plain(value(page, property.title, 'title')) || '제목 없음';
    const slug = slugFor(page);
    const tags = (value(page, property.tags, 'multi_select') || []).map((tag) => tag.name);
    const group = value(page, property.group, 'select')?.name || '기타';
    const category = value(page, property.category, 'select')?.name || '미분류';
    const summary = plain(value(page, property.summary, 'rich_text'));
    const date = value(page, property.date, 'date')?.start || page.last_edited_time.slice(0, 10);
    // 재생성 대상만 이미지 자산을 새로 내려받는다(오래된 이미지 제거). 고정된 완료 글의 자산은 건드리지 않음.
    if (!dryRun) await fs.rm(path.resolve(ASSETS_ROOT, slug), { recursive: true, force: true });
    const ctx = { slug, title, imageIndex: 0, dryRun };
    const body = await renderBlocksMd(await blocksFor(page.id), ctx);
    entries.push({ id: page.id, title, slug, group, tags, category, summary, date, body });
  }
  return entries;
}

function validateEntries(entries, { allowEmpty, liveCount, frozenSlugs }) {
  const problems = [];
  const warnings = [];

  if (liveCount === 0 && !allowEmpty) {
    problems.push('사이트에 올릴 글(Published·완료)이 0건입니다. 상태값/필터를 확인하세요. 의도한 것이라면 ALLOW_EMPTY_SYNC=1 로 실행하세요.');
  }

  const bySlug = new Map();
  for (const entry of entries) {
    if (!bySlug.has(entry.slug)) bySlug.set(entry.slug, []);
    bySlug.get(entry.slug).push(entry.title);
  }
  for (const [slug, titles] of bySlug) {
    if (titles.length > 1) {
      problems.push(`중복 슬러그 "${slug}" → ${titles.map((t) => JSON.stringify(t)).join(', ')} (노션 '슬러그' 속성으로 구분하세요)`);
    }
    if (frozenSlugs.has(slug)) {
      problems.push(`슬러그 "${slug}"가 이미 고정된 '완료' 글과 겹칩니다. 노션 '슬러그' 속성으로 구분하세요.`);
    }
  }

  for (const entry of entries) {
    if (!entry.summary.trim()) warnings.push(`요약 없음: ${JSON.stringify(entry.title)} (${entry.slug})`);
    if (!entry.body.trim()) warnings.push(`본문이 비어 있음: ${JSON.stringify(entry.title)} (${entry.slug})`);
  }

  return { problems, warnings };
}

function printPreview(entries, frozenSlugs) {
  console.log(`\n📋 배포 대상 미리보기 — 새로 생성 ${entries.length}건 · 고정(완료) ${frozenSlugs.size}건`);
  entries
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .forEach((entry, index) => {
      const tags = entry.tags.length ? `  ${entry.tags.map((tag) => `#${tag}`).join(' ')}` : '';
      const flags = [!entry.summary.trim() && '요약없음', !entry.body.trim() && '본문없음'].filter(Boolean);
      const flag = flags.length ? `  ⚠️ ${flags.join(', ')}` : '';
      console.log(`  ${String(index + 1).padStart(2)}. [${entry.category}] ${entry.title}  (${entry.slug}, ${entry.date})${tags}${flag}`);
    });
  if (frozenSlugs.size) console.log(`  🔒 고정 유지(완료): ${[...frozenSlugs].join(', ')}`);
}

async function writeEntries(entries, keepSlugs, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  // 정리 규칙: Notion에서 생성된 글(frontmatter에 notionId 있음) 중, 이번에 사이트에
  // 남겨야 할 글(Published 재생성 + 완료 고정)이 아닌 것만 지운다 — 글과 이미지 자산을 함께.
  // 직접 작성한 글(notionId 없음, 예: welcome.md)은 항상 보존한다.
  for (const file of await fs.readdir(outputDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    if (keepSlugs.has(slug)) continue;
    const content = await fs.readFile(path.join(outputDir, file), 'utf8');
    if (/^notionId:/m.test(content)) {
      await fs.unlink(path.join(outputDir, file));
      await fs.rm(path.resolve(ASSETS_ROOT, slug), { recursive: true, force: true });
    }
  }

  // Published 재생성분만 새로 쓴다. 완료 고정 글은 이미 커밋된 파일을 그대로 둔다.
  for (const entry of entries) {
    const frontmatter = `---\ntitle: ${JSON.stringify(entry.title)}\ndescription: ${JSON.stringify(entry.summary)}\ndate: ${entry.date}\ngroup: ${JSON.stringify(entry.group)}\ncategory: ${JSON.stringify(entry.category)}\ntags: ${JSON.stringify(entry.tags)}\ndraft: false\nnotionId: ${JSON.stringify(entry.id)}\n---\n\n`;
    await fs.writeFile(path.join(outputDir, `${entry.slug}.md`), frontmatter + entry.body, 'utf8');
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
  // 평소엔 '완료' 글을 고정하지만, 이 옵션을 켜면 완료 글도 다시 가져와 갱신한다.
  const forceResync = process.argv.includes('--force-resync') || process.env.FORCE_RESYNC === '1';

  let dataSourceId = configuredDataSourceId;
  if (!dataSourceId) {
    const database = await api(`/databases/${databaseId}`);
    dataSourceId = database.data_sources?.[0]?.id;
    if (!dataSourceId) throw new Error('노션 데이터베이스에서 Data Source를 찾지 못했습니다.');
  }

  const outputDir = path.resolve('src/content/posts');
  const existingSlugs = await readExistingNotionSlugs(outputDir);

  // Published = 새 글/수정본 → 매번 재생성. 완료 = 확정본 → 이미 커밋된 파일은 재조회 없이 고정.
  const publishedPages = await queryByStatus(dataSourceId, 'Published');
  const donePages = await queryByStatus(dataSourceId, '완료');

  const frozenSlugs = new Set();
  const doneToBake = [];
  for (const page of donePages) {
    const slug = slugFor(page);
    // forceResync면 고정하지 않고 전부 다시 생성한다.
    if (!forceResync && existingSlugs.has(slug)) frozenSlugs.add(slug); // 이미 파일이 있으면 재조회 없이 고정
    else doneToBake.push(page);                                         // 파일이 없거나 강제 갱신이면 생성
  }
  if (forceResync) console.log('🔄 force-resync: 완료 글도 다시 가져옵니다(고정 해제).');

  const entries = await preparePages([...publishedPages, ...doneToBake], { dryRun });
  const keepSlugs = new Set([...entries.map((entry) => entry.slug), ...frozenSlugs]);

  const { problems, warnings } = validateEntries(entries, {
    allowEmpty: process.env.ALLOW_EMPTY_SYNC === '1',
    liveCount: keepSlugs.size,
    frozenSlugs,
  });

  if (dryRun) printPreview(entries, frozenSlugs);
  for (const warning of warnings) console.warn(`⚠️  ${warning}`);

  if (problems.length) {
    console.error('\n❌ 검증 실패. 다음 문제를 먼저 해결하세요:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n🔍 dry-run: 파일을 쓰지 않고 종료합니다. 재생성 ${entries.length}건 + 고정(완료) ${frozenSlugs.size}건이 사이트 대상입니다.`);
    return;
  }

  await writeEntries(entries, keepSlugs, outputDir);
  console.log(`✅ 동기화 완료 — 재생성 ${entries.length}건, 고정(완료) ${frozenSlugs.size}건 유지.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
