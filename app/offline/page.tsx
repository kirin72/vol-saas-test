/**
 * 오프라인 페이지
 * 인터넷 연결이 끊겼을 때 Service Worker가 이 페이지를 표시
 */
'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        {/* 오프라인 아이콘 */}
        <div className="mx-auto w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          오프라인 상태입니다
        </h1>

        {/* 설명 */}
        <p className="text-gray-600 mb-6">
          인터넷 연결이 끊어졌습니다.
          <br />
          연결 상태를 확인한 후 다시 시도해 주세요.
        </p>

        {/* 다시 시도 버튼 */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
