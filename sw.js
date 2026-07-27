const CACHE_NAME = 'reward-app-v15'; 

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './config.js',
  './icon.jpg'
];

// 1. 安裝階段：強制跳過等待，立刻啟用新的 Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. 啟用階段：清除舊版本的快取（如舊的 v1, v2），並讓新 SW 立刻接管所有頁面
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 請求階段：採用「網路優先 (Network First)」策略
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // 檢查：必須是成功的 GET 請求，且 Scheme 必須為 http 或 https
        const url = new URL(e.request.url);
        const isValidScheme = url.protocol === 'http:' || url.protocol === 'https:';

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          e.request.method === 'GET' &&
          isValidScheme
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // 沒網路時才回傳快取內容
        return caches.match(e.request);
      })
  );
});