const CACHE='corey-vibe-auto-release-v8-eleven-first';
const CORE=['./','./index.html','./styles.css','./icon.svg','./manifest.webmanifest','./app.js?v=8'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>Promise.all(CORE.map(x=>c.add(x).catch(()=>null)))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;

  const isCode=/\.(?:js|mjs)$/.test(u.pathname);
  if(e.request.mode==='navigate' || isCode){
    e.respondWith(
      fetch(e.request,{cache:'no-store'}).then(r=>{
        if(r&&r.status===200){
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return r;
      }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
      if(r&&r.status===200){
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      }
      return r;
    }))
  );
});
