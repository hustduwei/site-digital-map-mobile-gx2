const VERSION = "20261029o";
const CACHE = "site-map-" + VERSION;

const PRECACHE = [
  "./index.html",
  "./css/app.css?v=20261029za93",
  "./js/app.js?v=20261029za108",
  "./img/site-map.jpg?v=20261029d",
  "./img/site-flat.jpg?v=20261029d",
  "./img/alarm-trash.jpg?v=20261029d",
  "./img/alarm-cable.jpg?v=20261029d",
  "./img/alarm-net.jpg?v=20261029d",
  "./img/alarm-soil.jpg?v=20261029d",
  "./img/aerial-a.jpg?v=20261029d",
  "./img/aerial-b.jpg?v=20261029d",
  "./img/cam-crane2.jpg?v=20261029d",
  "./img/patrol-pano.jpg?v=20261029d",
  "./img/patrol-face.jpg?v=20261029d",
  "./img/patrol-crane.jpg?v=20261029d",
  "./img/patrol-crane-2.jpg?v=20261029d",
  "./img/patrol-yard.jpg?v=20261029d",
  "./img/patrol-layout.jpg?v=20261029d",
  "./img/patrol-layout-2.jpg?v=20261029d",
  "./img/patrol-road.jpg?v=20261029d",
  "./img/patrol-power.jpg?v=20261029d"
];

function isImage(url) {
  return /\/img\//.test(url.pathname) || /\.(?:jpe?g|png|webp|gif|svg)$/i.test(url.pathname);
}

async function warm(cache, url) {
  try {
    const res = await fetch(url);
    if (res && res.ok) await cache.put(url, res);
  } catch (err) { /* 单个图片失败不影响整包缓存 */ }
}

async function fromCacheThenUpdate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const updating = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (hit) return hit;
  const res = await updating;
  if (res) return res;
  return new Response("", { status: 504, statusText: "offline" });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const home = await cache.match("./index.html");
      if (home) return home;
    }
    return new Response("", { status: 504, statusText: "offline" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => warm(cache, url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (isImage(url)) {
    event.respondWith(fromCacheThenUpdate(req));
    return;
  }

  const path = url.pathname;
  const shell = req.mode === "navigate" || path.endsWith("/") || /\.(?:html|css|js)$/i.test(path);
  if (shell) event.respondWith(networkFirst(req));
});
