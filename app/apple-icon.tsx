/**
 * Apple Touch Icon 동적 생성 (180x180)
 * 교회 실루엣 + 중앙 "V" 디자인
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
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '36px',
          position: 'relative',
        }}
      >
        {/* 십자가 첨탑 (가로) */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '78px',
            width: '24px',
            height: '6px',
            background: 'white',
            display: 'flex',
          }}
        />
        {/* 십자가 첨탑 (세로) */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '84px',
            width: '12px',
            height: '30px',
            background: 'white',
            display: 'flex',
          }}
        />
        {/* 교회 지붕 (삼각형 - 큰 삼각형으로 표현) */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '24px',
            width: 0,
            height: 0,
            borderLeft: '66px solid transparent',
            borderRight: '66px solid transparent',
            borderBottom: '50px solid white',
            display: 'flex',
          }}
        />
        {/* 교회 몸체 */}
        <div
          style={{
            position: 'absolute',
            top: '78px',
            left: '24px',
            width: '132px',
            height: '86px',
            background: 'white',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* V 글자 */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#2563eb',
              display: 'flex',
              marginTop: '4px',
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
