import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const raw = import.meta.env.BASE_URL;
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  const site = new URL(base, context.site); // 채널 링크가 base까지 포함하도록
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: '공부 아카이브',
    description: 'AI 초안을 직접 검수한 뒤 공개하는 학습 기록',
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `posts/${post.id}/`,
    })),
    customData: '<language>ko</language>',
  });
}
