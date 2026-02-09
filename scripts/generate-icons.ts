/**
 * PWA 아이콘 생성 스크립트
 * 교회 실루엣 + 중앙 "V" 디자인
 * SVG를 PNG로 변환하여 192x192, 512x512 크기 생성
 * 실행: npx tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import path from 'path';

// 교회 모양 + "V" 아이콘 SVG 생성
const createIconSvg = (s: number) => {
  // 비율 기반 좌표 계산
  const r = Math.round(s * 0.2); // 둥근 모서리
  const cx = s / 2; // 중심 X

  // 십자가 첨탑
  const crossW = Math.round(s * 0.03); // 십자가 두께
  const crossTopY = Math.round(s * 0.04); // 십자가 상단 Y
  const crossH = Math.round(s * 0.12); // 십자가 세로 길이
  const crossArmW = Math.round(s * 0.08); // 십자가 가로 길이
  const crossArmY = Math.round(s * 0.07); // 십자가 팔 Y 위치
  const crossArmH = Math.round(s * 0.025); // 십자가 팔 두께

  // 교회 지붕 (삼각형)
  const roofTopY = Math.round(s * 0.16); // 지붕 꼭대기
  const roofBottomY = Math.round(s * 0.38); // 지붕 하단
  const roofLeft = Math.round(s * 0.15); // 지붕 좌측
  const roofRight = Math.round(s * 0.85); // 지붕 우측

  // 교회 몸체 (사각형)
  const bodyTop = roofBottomY;
  const bodyBottom = Math.round(s * 0.88);
  const bodyLeft = roofLeft;
  const bodyRight = roofRight;
  const bodyR = Math.round(s * 0.02); // 몸체 하단 둥근 모서리

  // "V" 텍스트
  const vSize = Math.round(s * 0.32);
  const vY = Math.round(s * 0.68);

  return Buffer.from(`
    <svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2563eb"/>
          <stop offset="100%" style="stop-color:#1d4ed8"/>
        </linearGradient>
      </defs>

      <!-- 배경 -->
      <rect width="${s}" height="${s}" rx="${r}" fill="url(#bg)"/>

      <!-- 십자가 (세로) -->
      <rect
        x="${cx - crossW / 2}" y="${crossTopY}"
        width="${crossW}" height="${crossH}"
        fill="white"
      />
      <!-- 십자가 (가로) -->
      <rect
        x="${cx - crossArmW / 2}" y="${crossArmY}"
        width="${crossArmW}" height="${crossArmH}"
        fill="white"
      />

      <!-- 교회 지붕 (삼각형) -->
      <polygon
        points="${cx},${roofTopY} ${roofRight},${roofBottomY} ${roofLeft},${roofBottomY}"
        fill="white"
      />

      <!-- 교회 몸체 -->
      <rect
        x="${bodyLeft}" y="${bodyTop}"
        width="${bodyRight - bodyLeft}" height="${bodyBottom - bodyTop}"
        rx="${bodyR}"
        fill="white"
      />

      <!-- "V" 텍스트 -->
      <text
        x="${cx}"
        y="${vY}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#2563eb"
        font-size="${vSize}"
        font-weight="bold"
        font-family="Arial, sans-serif"
      >V</text>
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
