const CACHE='bumm-marala-shell-v45';
const ASSETS=['/','/index.html','/styles.css','/integrated.css','/integrated.js','/pos-ui.js','/bulk-edit.js','/attendance-ui.js','/icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bumm-marala-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/manifest.webmanifest'||e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r.ok&&ASSETS.includes(url.pathname)){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));});

