'use strict';
const CACHE='ecolelien-pilot-v8';
const ASSETS=['./app.html','./index.html','./app.css','./screens.css','./readability.css?v=2','./readability.css','./pilot.css?v=3','./pilot.css','./senegal.js?v=6','./senegal.js','./app.js','./screens.js','./location.js','./pwa.js','./merge.js?v=4','./merge.js','./merge.css?v=4','./merge.css','./live.css?v=5','./live.css','./live.js?v=5','./live.js','./school.js?v=7','./school.js','./config.js?v=5','./config.js','./resultats.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ecolelien-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 const allowed=new Set(ASSETS.map(path=>new URL(path,self.location.href).pathname));
 if(!allowed.has(url.pathname)&&url.pathname!==new URL('./',self.location.href).pathname)return;
 event.respondWith(fetch(event.request).then(response=>{
  // Never cache authentication redirects or error pages as an app shell.
  if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}
  return response;
 }).catch(async()=>{const cached=await caches.match(event.request,{ignoreSearch:true});if(cached)return cached;if(event.request.mode==='navigate')return caches.match('./app.html');return Response.error()}));
});
