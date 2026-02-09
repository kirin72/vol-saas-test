/**
 * Apple Touch Icon 동적 생성 (180x180)
 * iOS 홈 화면에 추가할 때 사용되는 아이콘
 */
import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '36px',
          fontWeight: 'bold',
          letterSpacing: '-2px',
        }}
      >
        {/* 십자가 아이콘 */}
        <div
          style={{
            fontSize: 36,
            marginBottom: '4px',
            display: 'flex',
          }}
        >
          ✝
        </div>
        {/* "봉" 텍스트 */}
        <div style={{ display: 'flex' }}>봉</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
