'use strict';
/* ÉcoleLien · en ligne
   1. Salle de démo : plusieurs téléphones partagent la même école fictive (annonces, messages, appel,
      confirmations…). Chaque appareil garde son propre compte ; les données sont synchronisées en direct.
   2. Séances de test : le facilitateur enregistre participant, tâches (réussi seul / avec aide / échec,
      durée), actions faites dans l’application et note de confiance. Résultats : resultats.html.
   Base : Firebase Realtime Database, API REST (aucune bibliothèque externe). */

const LIVE_DB=(window.ECOLELIEN_CONFIG?.databaseURL||'').replace(/\/+$/,'');
const live={room:null,es:null,synced:{},status:'off',pushTimer:null,pendingRender:false,session:null};
const liveRoomOk=c=>/^[0-9]{4,6}$/.test(String(c||''));
const liveUrl=p=>`${LIVE_DB}/${p}.json`;
async function liveFetch(path,method='GET',body){const r=await fetch(liveUrl(path),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}

/* ---------- 1. Salle de démo partagée ---------- */
const localPersist=persist;
function liveSaveLocal(){try{localPersist()}catch{}}
persist=function(){liveSaveLocal();if(live.room)liveSchedulePush()};
function liveSchedulePush(){clearTimeout(live.pushTimer);live.pushTimer=setTimeout(livePush,250)}
async function livePush(){if(!live.room||live.status==='connecting')return;const patch={};for(const k of Object.keys(db)){const s=JSON.stringify(db[k]);if(s!==undefined&&s!==live.synced[k]){patch[k]=s}}
  const keys=Object.keys(patch);if(!keys.length)return;keys.forEach(k=>live.synced[k]=patch[k]);
  try{await liveFetch(`rooms/${live.room}/state`,'PATCH',patch);liveSetStatus('on')}catch{keys.forEach(k=>delete live.synced[k]);liveSetStatus('retry');live.pushTimer=setTimeout(livePush,4000)}}
function liveApply(key,str){if(typeof str!=='string'||str===live.synced[key])return false;try{db[key]=JSON.parse(str);live.synced[key]=str;return true}catch{return false}}
function liveApplyAll(obj){let changed=false;for(const [k,v] of Object.entries(obj||{}))changed=liveApply(k,v)||changed;return changed}
function liveAfterRemote(){liveSaveLocal();liveRender()}
function liveBusy(){const a=document.activeElement;return $('#modal')?.open||(a&&['INPUT','TEXTAREA','SELECT'].includes(a.tagName))}
function liveRender(){if(liveBusy()){live.pendingRender=true;return}live.pendingRender=false;if(account)render();else liveRenderPill()}
setInterval(()=>{if(live.pendingRender&&!liveBusy())liveRender()},800);

async function liveJoin(code,{create=false}={}){if(!LIVE_DB){notify('Base en ligne non configurée.');return}code=String(code||'').trim();if(!liveRoomOk(code)){notify('Code de salle : 4 à 6 chiffres.');return}
  liveLeave(true);live.room=code;live.synced={};liveSetStatus('connecting');try{sessionStorage.setItem('ecolelien-room',code)}catch{}
  try{const remote=await liveFetch(`rooms/${code}/state`);
    if(remote&&Object.keys(remote).length){liveApplyAll(remote);liveSaveLocal()}
    else{if(!create){/* salle vide : ce téléphone l’initialise avec la démonstration de départ */}
      db=initial();const seed={};for(const k of Object.keys(db))seed[k]=live.synced[k]=JSON.stringify(db[k]);
      await liveFetch(`rooms/${code}`,'PATCH',{state:seed,meta:{createdAt:Date.now()}});liveSaveLocal()}
    liveSetStatus('on');liveStream();if($('#modal')?.open)closeModal();render();notify(`Salle ${code} : vous êtes en direct.`)}
  catch{liveSetStatus('error');notify('Connexion à la salle impossible. Vérifiez internet puis réessayez.');live.room=null;try{sessionStorage.removeItem('ecolelien-room')}catch{};render()}}
function liveStream(){if(!live.room||typeof EventSource==='undefined')return;live.es?.close();const es=new EventSource(liveUrl(`rooms/${live.room}/state`));live.es=es;
  const onEvent=(kind,e)=>{let msg;try{msg=JSON.parse(e.data)}catch{return}if(!msg)return;const path=(msg.path||'/').replace(/^\/+/,'');let changed=false;
    if(!path){if(kind==='put'&&msg.data===null){return}changed=liveApplyAll(msg.data)}
    else{const key=path.split('/')[0];if(path.includes('/'))return;changed=msg.data===null?false:liveApply(key,msg.data)}
    liveSetStatus('on');if(changed)liveAfterRemote()};
  es.addEventListener('put',e=>onEvent('put',e));es.addEventListener('patch',e=>onEvent('patch',e));
  es.addEventListener('cancel',()=>liveSetStatus('error'));es.addEventListener('auth_revoked',()=>liveSetStatus('error'));
  es.onerror=()=>{if(live.room)liveSetStatus('retry')};es.onopen=()=>liveSetStatus('on')}
function liveLeave(silent){live.es?.close();live.es=null;live.room=null;live.synced={};clearTimeout(live.pushTimer);try{sessionStorage.removeItem('ecolelien-room')}catch{}liveSetStatus('off');if(!silent){if($('#modal')?.open)closeModal();render();notify('Vous avez quitté la salle. Les données restent sur ce téléphone.')}}
async function liveCreateRoom(){if(!LIVE_DB)return;for(let i=0;i<5;i++){const code=String(1000+Math.floor(Math.random()*9000));try{const m=await liveFetch(`rooms/${code}/meta`);if(!m)return liveJoin(code,{create:true})}catch{notify('Connexion impossible pour créer une salle.');return}}notify('Réessayez dans un instant.')}
function liveRoomLink(){const u=new URL('app.html',location.href);u.search='?salle='+live.room;return u.href}
async function liveCopyLink(){const link=liveRoomLink();try{await navigator.clipboard.writeText(link);notify('Lien copié : envoyez-le aux téléphones de test.')}catch{modal(`<h2>Lien de la salle ${live.room}</h2><p class="live-link">${esc(link)}</p><div class="actions"><button onclick="closeModal()">Fermer</button></div>`)}}
function liveJoinModal(){modal(`<h2>Rejoindre une salle de démo</h2><p>Entrez le code donné par l’animateur. Tous les téléphones de la salle voient la même école fictive en direct.</p><form onsubmit="event.preventDefault();liveJoin($('#live-code').value)"><label>Code de la salle<input id="live-code" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" required></label><div class="actions"><button type="button" onclick="closeModal()">Annuler</button><button class="primary">Rejoindre</button></div></form>`);setTimeout(()=>$('#live-code')?.focus(),50)}
function liveSetStatus(s){live.status=s;liveRenderPill()}
function liveRenderPill(){let pill=document.getElementById('live-pill');if(!live.room){pill?.remove();return}if(!pill){pill=document.createElement('button');pill.id='live-pill';pill.type='button';pill.onclick=()=>facilitator?null:liveRoomModal()}const anchor=document.querySelector('#root .demo');if(anchor){if(anchor.nextElementSibling!==pill)anchor.after(pill);pill.dataset.inline='1'}else{if(pill.parentNode!==document.body)document.body.appendChild(pill);delete pill.dataset.inline}
  const txt={on:'En direct',connecting:'Connexion…',retry:'Reconnexion…',error:'Hors ligne'}[live.status]||'';pill.className='live-pill '+live.status;pill.innerHTML=`<span class="dot"></span>Salle ${esc(live.room)} · ${txt}`}
function liveRoomModal(){modal(`<h2>Salle de démo ${esc(live.room)}</h2><p>Ce téléphone partage la même école fictive que les autres téléphones de la salle. Aucun envoi réel.</p><div class="actions"><button onclick="closeModal()">Fermer</button><button onclick="liveLeave()">Quitter la salle</button></div>`)}

/* ---------- 2. Séances de test (résultats du pilote) ---------- */
try{const s=JSON.parse(sessionStorage.getItem('ecolelien-session')||'null');if(s&&s.id)live.session=s}catch{}
function liveSaveSession(){try{live.session?sessionStorage.setItem('ecolelien-session',JSON.stringify(live.session)):sessionStorage.removeItem('ecolelien-session')}catch{}}
function liveNewId(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function liveElapsed(){return live.session?Math.round((Date.now()-live.session.startedAt)/1000):0}
function liveEvent(type,detail=''){if(!live.session||!LIVE_DB)return;const ev={t:liveElapsed(),type,account:account||'',detail:String(detail).slice(0,200),at:Date.now()};fetch(liveUrl(`sessions/${live.session.id}/events`),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ev)}).catch(()=>{})}
function liveSessionModal(){modal(`<h2>Démarrer une séance de test</h2><p>N’inscrivez ni nom ni numéro de téléphone : un code suffit (P01, P02…).</p><form onsubmit="liveStartSession(event)"><label>Code participant<input id="ss-code" maxlength="12" required placeholder="P01" autocomplete="off"></label><label>Profil<select id="ss-role"><option value="parent">Parent</option><option value="student">Élève</option><option value="teacher">Enseignant</option><option value="admin">Direction</option></select></label><label>Lieu<input id="ss-place" maxlength="40" placeholder="Malika Plage" autocomplete="off"></label><label>Langue de la séance<select id="ss-lang"><option value="fr">Français</option><option value="wo">Wolof</option><option value="fr-wo">Français et wolof</option></select></label><label>Téléphone utilisé<select id="ss-device"><option value="android">Android</option><option value="iphone">iPhone</option><option value="other">Autre</option></select></label><div class="actions"><button type="button" onclick="closeModal()">Annuler</button><button class="primary">Démarrer</button></div></form>`)}
async function liveStartSession(e){e.preventDefault();const code=$('#ss-code').value.trim().slice(0,12).replace(/[^A-Za-z0-9 _-]/g,'');if(!code){notify('Indiquez un code participant.');return}
  const info={participant:code,role:$('#ss-role').value,place:$('#ss-place').value.trim().slice(0,40),lang:$('#ss-lang').value,device:$('#ss-device').value,room:live.room||'',startedAt:Date.now()};
  const id=liveNewId();try{await liveFetch(`sessions/${id}/info`,'PUT',info)}catch{notify('Connexion impossible : la séance n’a pas démarré.');return}
  live.session={id,startedAt:info.startedAt,participant:code,role:info.role,tasks:{}};liveSaveSession();closeModal();if(roles[info.role]&&account!==info.role)login(info.role);else render();notify(`Séance ${code} démarrée.`)}
function liveTaskStart(k){if(!live.session)return;const t=live.session.tasks[k]||{};t.start=Date.now();delete t.status;live.session.tasks[k]=t;liveSaveSession();liveEvent('task_start',k);render()}
async function liveTaskEnd(k,status){if(!live.session)return;const t=live.session.tasks[k]||{};const seconds=t.start?Math.round((Date.now()-t.start)/1000):null;Object.assign(t,{status,seconds});live.session.tasks[k]=t;liveSaveSession();render();
  try{await liveFetch(`sessions/${live.session.id}/tasks/${k}`,'PUT',{status,seconds,label:(mergedTasks[live.session.role]||[]).find(x=>x[0]===k)?.[1]||k,at:Date.now()})}catch{notify('Résultat gardé sur ce téléphone, envoi impossible pour l’instant.')}}
function liveEndModal(){if(!live.session)return;modal(`<h2>Terminer la séance ${esc(live.session.participant)}</h2><form onsubmit="liveEndSession(event)"><fieldset class="ss-scale"><legend>Confiance du participant (1 à 5)</legend>${[1,2,3,4,5].map(n=>`<label><input type="radio" name="ss-conf" value="${n}" ${n===3?'checked':''}>${n}</label>`).join('')}</fieldset><label>A compris que tout est simulé ?<select id="ss-understood"><option value="oui">Oui</option><option value="partiel">En partie</option><option value="non">Non</option></select></label><label>Payerait ou recommanderait ?<select id="ss-value"><option value="">Non demandé</option><option value="oui">Oui</option><option value="peut-etre">Peut-être</option><option value="non">Non</option></select></label><label>Notes (sans nom ni numéro)<textarea id="ss-note" maxlength="1000" rows="4"></textarea></label><div class="actions"><button type="button" onclick="closeModal()">Continuer la séance</button><button class="primary">Enregistrer et terminer</button></div></form>`)}
async function liveEndSession(e){e.preventDefault();const s=live.session;const summary={confidence:Number(document.querySelector('input[name="ss-conf"]:checked')?.value||0),understood:$('#ss-understood').value,value:$('#ss-value').value,note:$('#ss-note').value.slice(0,1000),durationSec:liveElapsed(),endedAt:Date.now()};
  try{await liveFetch(`sessions/${s.id}/summary`,'PUT',summary)}catch{notify('Envoi impossible : vérifiez internet puis réessayez.');return}
  live.session=null;liveSaveSession();closeModal();render();notify(`Séance ${s.participant} enregistrée.`)}

/* Actions enregistrées automatiquement pendant une séance */
function liveWrap(name,type,detail){const fn=window[name];if(typeof fn!=='function')return;window[name]=function(...a){const r=fn.apply(this,a);try{liveEvent(type,typeof detail==='function'?detail(...a):(detail||''))}catch{}return r}}
liveWrap('login','connexion',r=>r);liveWrap('go','ecran',p=>p);liveWrap('confirmNotice','confirmation_annonce',id=>id);
liveWrap('submitAbsence','justification_absence');liveWrap('submitForm','reponse_formulaire',(e,id)=>id);liveWrap('submitPayment','versement');
liveWrap('downloadTask','telechargement_devoir',id=>id);liveWrap('sendMessage','message_envoye');liveWrap('publishPost','annonce_publiee');
liveWrap('saveAttendance','appel_enregistre',()=>'durée '+(db.attendanceTrialSeconds??'?')+' s');
if(typeof bookMeeting==='function')liveWrap('bookMeeting','rendez_vous',t=>t);
if(typeof justifyAbsence==='function')liveWrap('justifyAbsence','ouvre_justification');

/* ---------- Bandeau facilitateur : salle + séance ---------- */
function liveFacilitatorPanel(){const s=live.session,tasks=(s?mergedTasks[s.role]:mergedTasks[account])||[];
  const room=live.room?`<div class="lv-row"><div><b>Salle ${esc(live.room)}</b> · ${({on:'en direct',connecting:'connexion…',retry:'reconnexion…',error:'hors ligne'})[live.status]||''}<small>Les téléphones qui ouvrent le lien voient la même école en direct.</small></div><div class="lv-btns"><button class="small" onclick="liveCopyLink()">Copier le lien</button><button class="small" onclick="liveLeave()">Quitter</button></div></div>`
    :`<div class="lv-row"><div><b>Salle de démo</b><small>Relier plusieurs téléphones : un enseignant publie, le parent reçoit.</small></div><div class="lv-btns"><button class="small" onclick="liveCreateRoom()">Créer une salle</button><button class="small" onclick="liveJoinModal()">Rejoindre</button></div></div>`;
  const sess=s?`<div class="lv-row"><div><b>Séance ${esc(s.participant)}</b> · ${({parent:'Parent',student:'Élève',teacher:'Enseignant',admin:'Direction'})[s.role]||esc(s.role)} · <span class="lv-clock" data-start="${s.startedAt}">${Math.floor(liveElapsed()/60)} min</span><small>Les actions dans l’application sont enregistrées automatiquement.</small></div><div class="lv-btns"><button class="small primary" onclick="liveEndModal()">Terminer</button></div></div>
      <ol class="lv-tasks">${tasks.map(([k,label])=>{const t=s.tasks[k]||{};const st=t.status?`<span class="lv-st ${t.status}">${{seul:'✓ Seul',aide:'Avec aide',echec:'Échec'}[t.status]}${t.seconds!=null?' · '+t.seconds+' s':''}</span>`:'';const ctrl=t.start&&!t.status?`<button class="small ok" onclick="liveTaskEnd('${k}','seul')">Seul</button><button class="small" onclick="liveTaskEnd('${k}','aide')">Aide</button><button class="small" onclick="liveTaskEnd('${k}','echec')">Échec</button>`:`<button class="small" onclick="liveTaskStart('${k}')">${t.status?'Refaire':'Démarrer'}</button>`;return `<li><div><b>${k}</b> ${label} ${st}</div><div class="lv-btns">${ctrl}</div></li>`}).join('')}</ol>`
    :`<div class="lv-row"><div><b>Séance de test</b><small>Enregistre tâches, durées et confiance dans les résultats du pilote.</small></div><div class="lv-btns"><button class="small primary" onclick="liveSessionModal()">Démarrer une séance</button><a class="small lv-link" href="resultats.html" target="_blank" rel="noopener">Résultats ↗</a></div></div>`;
  return `<div class="lv-panel">${LIVE_DB?room+sess:'<small>Base en ligne non configurée (config.js).</small>'}</div>`}
const facilitatorBarBeforeLive=mergedFacilitatorBar;
mergedFacilitatorBar=function(){const html=facilitatorBarBeforeLive();return html.replace('<p class="fac-note">',liveFacilitatorPanel()+'<p class="fac-note">').replace(/<ol class="fac-tasks">[\s\S]*?<\/ol>/,live.session?'':'$&')};
setInterval(()=>{document.querySelectorAll('.lv-clock').forEach(el=>{const s=Math.round((Date.now()-Number(el.dataset.start))/1000);el.textContent=Math.floor(s/60)+' min '+String(s%60).padStart(2,'0')+' s'})},1000);

/* Menu : rejoindre une salle (participants) */
const drawerBeforeLive=appDrawer;
appDrawer=function(){drawerBeforeLive();const f=document.querySelector('#modal footer')||document.querySelector('#modal .actions');const b=live.room?`<button onclick="liveRoomModal()">Salle de démo ${esc(live.room)} · en direct</button>`:`<button onclick="liveJoinModal()">Rejoindre une salle de démo</button>`;if(f)f.insertAdjacentHTML('beforebegin',b);else document.querySelector('#modal')?.insertAdjacentHTML('beforeend',b)};
if(typeof moreMenu!=='undefined')moreMenu=appDrawer;

/* Rendu : la pastille « En direct » reste visible */
const renderBeforeLive=render;
render=function(){renderBeforeLive();liveRenderPill()};

/* Démarrage : ?salle=1234 dans le lien, ou salle déjà ouverte dans cet onglet */
(function liveBoot(){let code=null;try{code=new URLSearchParams(location.search).get('salle')||sessionStorage.getItem('ecolelien-room')}catch{}if(LIVE_DB&&liveRoomOk(code))liveJoin(code);else render()})();
