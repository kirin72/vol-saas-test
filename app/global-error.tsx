/**
 * 글로벌 에러 처리 컴포넌트
 * - 루트 레이아웃을 포함한 모든 에러를 캐치
 * - 앱 전체가 크래시되는 것을 방지
 * - 최소한의 UI로 에러 메시지 표시
 *
 * 참고: global-error.tsx는 반드시 html과 body 태그를 포함해야 함
 */
'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 글로벌 에러 발생 시 콘솔에 로그 출력
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* 에러 아이콘 */}
            <div
              style={{
                margin: '0 auto 1.5rem',
                width: '4rem',
                height: '4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
              }}
            >
              <svg
                style={{ width: '2rem', height: '2rem', color: '#dc2626' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* 에러 메시지 */}
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: '#111827',
              }}
            >
              심각한 오류가 발생했습니다
            </h1>
            <p
              style={{
                marginBottom: '1.5rem',
                color: '#6b7280',
              }}
            >
              애플리케이션을 로드하는 중에 문제가 발생했습니다.
              <br />
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>

            {/* 개발 환경에서만 에러 상세 정보 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                  }}
                >
                  에러 상세 정보
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                  }}
                >
                  {error.message}
                </pre>
              </details>
            )}

            {/* 재시도 버튼 */}
            <button
              onClick={reset}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
