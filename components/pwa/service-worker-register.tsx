/**
 * Service Worker 등록 컴포넌트
 * - 프로덕션 환경에서만 Service Worker 등록
 * - 업데이트 감지 시 자동 활성화
 */
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Service Worker 지원 여부 확인
    if ('serviceWorker' in navigator) {
      // 페이지 로드 완료 후 등록 (성능 영향 최소화)
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW 등록 성공:', registration.scope);

            // 업데이트 감지
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  // 새 SW가 활성화되면 페이지 새로고침
                  if (
                    newWorker.state === 'activated' &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log('새 Service Worker 활성화됨');
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('SW 등록 실패:', error);
          });
      });
    }
  }, []);

  return null;
}
