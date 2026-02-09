/**
 * Service Worker
 * - 앱 셸 캐싱 (HTML, CSS, JS)
 * - API 요청: 네트워크 우선 (Network-first)
 * - 정적 리소스: 캐시 우선 (Cache-first)
 * - 오프라인 fallback 페이지 제공
 */

const CACHE_NAME = 'vol-mgmt-v1';
const OFFLINE_URL = '/offline';

// 앱 셸에 포함할 정적 리소스
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// 설치 이벤트: 앱 셸 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // 모든 클라이언트에 즉시 적용
  self.clients.claim();
});

// 요청 가로채기
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청: 네트워크 우선 (실패 시 캐시)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js 내부 요청: 네트워크 우선
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 정적 리소스 (이미지, 아이콘 등): 캐시 우선
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML 페이지 요청: 네트워크 우선 + 오프라인 fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // 기타 요청: 네트워크 우선
  event.respondWith(networkFirst(request));
});

// 네트워크 우선 전략
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // 성공 시 캐시에 저장
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 네트워크 실패 시 캐시에서 반환
    const cached = await caches.match(request);
    if (cached) return cached;
    // 캐시도 없으면 오프라인 응답
    return new Response('오프라인 상태입니다', { status: 503 });
  }
}

// 캐시 우선 전략
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// 네비게이션 핸들러 (페이지 요청)
async function navigationHandler(request) {
  try {
    // 네트워크에서 페이지 가져오기
    const response = await fetch(request);
    // 성공 시 캐시에 저장
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 캐시에서 해당 페이지 찾기
    const cached = await caches.match(request);
    if (cached) return cached;

    // 캐시에도 없으면 오프라인 페이지 반환
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;

    // 최후의 수단: 간단한 오프라인 HTML
    return new Response(
      '<html><body><h1>오프라인</h1><p>인터넷 연결을 확인해 주세요.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
