// 사이트 공용 OG 이미지(1200x630 PNG)를 생성한다.
// 실행: node scripts/make-og-image.mjs  → public/og.png
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="630" fill="#2563eb"/>
  <text x="80" y="150" font-family="Malgun Gothic, 'Noto Sans KR', sans-serif" font-size="34" letter-spacing="8" font-weight="700" fill="#60a5fa">LEARNING LOG</text>
  <text x="80" y="300" font-family="Malgun Gothic, 'Noto Sans KR', sans-serif" font-size="104" font-weight="800" fill="#f8fafc">공부 아카이브</text>
  <text x="80" y="380" font-family="Malgun Gothic, 'Noto Sans KR', sans-serif" font-size="40" fill="#cbd5e1">배운 것을 내 언어로 다시 정리하는 공간</text>
  <text x="80" y="560" font-family="Malgun Gothic, 'Noto Sans KR', sans-serif" font-size="30" font-weight="600" fill="#64748b">Notion → 검수 → Publish</text>
  <text x="1120" y="560" text-anchor="end" font-family="Malgun Gothic, sans-serif" font-size="26" fill="#475569">stux12.github.io/study-archive</text>
</svg>`;

const out = path.resolve('public/og.png');
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`OG 이미지 생성: ${out}`);
