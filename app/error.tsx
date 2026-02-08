/**
 * App 레벨 에러 처리 컴포넌트
 * - 애플리케이션 내에서 발생하는 에러를 캐치하고 처리
 * - 사용자에게 친화적인 에러 메시지 표시
 * - 에러 복구 옵션 제공 (재시도 버튼)
 */
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 에러 발생 시 콘솔에 로그 출력 (개발 환경에서 디버깅용)
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {/* 에러 아이콘 */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
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
        <h2 className="text-2xl font-bold text-gray-900">
          문제가 발생했습니다
        </h2>
        <p className="text-gray-600">
          죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.
        </p>

        {/* 개발 환경에서만 에러 상세 정보 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              에러 상세 정보
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
              {error.message}
            </pre>
          </details>
        )}

        {/* 재시도 버튼 */}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
