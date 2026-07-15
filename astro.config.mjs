import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const base = process.env.BASE_PATH || '/';

// ```mermaid 코드펜스를 Shiki가 건드리지 않도록 <pre class="mermaid">로 치환.
// 클라이언트에서 mermaid.js가 이 요소를 다이어그램으로 렌더한다.
function remarkMermaid() {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const walk = (node) => {
    if (!node || !Array.isArray(node.children)) return;
    node.children = node.children.map((child) => {
      if (child.type === 'code' && child.lang === 'mermaid') {
        return { type: 'html', value: `<pre class="mermaid">${esc(child.value)}</pre>` };
      }
      walk(child);
      return child;
    });
  };
  return (tree) => { walk(tree); };
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base,
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
});
