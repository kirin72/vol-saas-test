/**
 * 동적 파비콘 생성 (32x32)
 * Next.js App Router의 내장 아이콘 생성 기능 사용
 * 브라우저 탭에 표시되는 파비콘
 */
import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '6px',
          fontWeight: 'bold',
        }}
      >
        봉
      </div>
    ),
    {
      ...size,
    }
  );
}
