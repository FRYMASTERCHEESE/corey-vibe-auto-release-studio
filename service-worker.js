const CACHE='corey-vibe-auto-release-v4';
const ASSETS=['./','./index.html','./styles.css','./app.js','./vocal-engine.mjs','./icon.svg','./OUTPUT_RIGHTS.md','./THIRD_PARTY_NOTICES.md','./README.md','./manifest.webmanifest','./examples/into_the_uplifting_lyrics.txt','./examples/into_the_uplifting_metadata.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin) return; // third-party model files manage their own browser cache
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
    if(!r || r.status!==200) return r;
    const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return r;
  }).catch(()=>caches.match('./index.html'))));
});
