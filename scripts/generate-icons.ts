/**
 * PWA 아이콘 생성 스크립트
 * SVG를 PNG로 변환하여 192x192, 512x512 크기 생성
 * 실행: npx tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import path from 'path';

// 파란색 배경에 십자가 + "봉" 텍스트 아이콘 SVG
const createIconSvg = (size: number) => {
  const fontSize = Math.round(size * 0.4);
  const crossSize = Math.round(size * 0.15);
  const borderRadius = Math.round(size * 0.2);

  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb"/>
          <stop offset="100%" style="stop-color:#1d4ed8"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bg)"/>
      <!-- 십자가 -->
      <text
        x="${size / 2}"
        y="${size * 0.35}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="${crossSize}"
        font-family="serif"
      >✝</text>
      <!-- "봉" 텍스트 -->
      <text
        x="${size / 2}"
        y="${size * 0.65}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="${fontSize}"
        font-weight="bold"
        font-family="sans-serif"
      >봉</text>
    </svg>
  `);
};

async function generateIcons() {
  const outputDir = path.join(process.cwd(), 'public', 'icons');

  // 192x192 아이콘 생성
  await sharp(createIconSvg(192))
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));
  console.log('✅ icon-192.png 생성 완료');

  // 512x512 아이콘 생성
  await sharp(createIconSvg(512))
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('✅ icon-512.png 생성 완료');
}

generateIcons()
  .then(() => console.log('🎉 모든 아이콘 생성 완료'))
  .catch((err) => {
    console.error('❌ 아이콘 생성 실패:', err);
    process.exit(1);
  });
