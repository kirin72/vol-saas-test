/**
 * 동적 파비콘 생성 (32x32)
 * 교회 실루엣 + 중앙 "V" 디자인
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
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          position: 'relative',
        }}
      >
        {/* 교회 지붕 (삼각형) */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '6px',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '8px solid white',
            display: 'flex',
          }}
        />
        {/* 십자가 첨탑 */}
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '14px',
            width: '4px',
            height: '5px',
            background: 'white',
            display: 'flex',
          }}
        />
        {/* 교회 몸체 */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '6px',
            width: '20px',
            height: '18px',
            background: 'white',
            borderRadius: '0 0 2px 2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* V 글자 */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: '#2563eb',
              marginTop: '2px',
              display: 'flex',
            }}
          >
            V
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
