'use strict';
/* ÉcoleLien · fusion v4 (14 octobre 2026)
   Base : version « pilote v3 » (SMS, Wolof, PWA, économie complète, icônes SVG, appel 60 élèves).
   Ajouts repris de la v2 :
   1. Accueil parent « À faire » : absence et rendez-vous inclus, urgent en rouge, devoirs regroupés
      sur une ligne (pas comptés comme actions), section « Déjà fait ».
   2. Entrée directe dans l’école de démonstration ; parcours académie / IEF réservé au facilitateur.
   3. Bandeau facilitateur à l’écran : tâches de test par rôle + réinitialisation entre participants.
   4. Liste de classe réaliste : 60 noms fictifs uniques, triés par nom de famille. */

/* ---------- Mode facilitateur par lien (?animateur=1) ---------- */
try{const q=new URLSearchParams(location.search).get('animateur');if(q!==null){facilitator=q==='1';sessionStorage.setItem('ecolelien-facilitator',facilitator?'1':'0')}}catch{}

/* ---------- 2. Entrée directe dans l’école de démonstration ---------- */
if(!schoolContext&&typeof chooseSchool==='function'){chosenAcademy='pg';chosenIEF='keur';chooseSchool('demo-malika')}

/* ---------- 4. Liste de classe réaliste ---------- */
(function realisticRoster(){
  const firsts=['Abdou','Adama','Aïda','Alioune','Amadou','Astou','Babacar','Binta','Cheikh','Coumba','Daba','Demba','Dieynaba','El Hadji','Fatoumata','Habib','Issa','Khadija','Khady','Lamine','Mame Diarra','Mamadou','Mariama','Modou','Ndèye','Ousmane','Pape','Penda','Rokhaya','Saliou','Seynabou','Serigne','Sokhna','Souleymane','Thierno','Yacine','Yaye Fatou','Zeynab'];
  const lasts=['Ba','Camara','Cissé','Diagne','Diallo','Diop','Diouf','Faye','Gaye','Gueye','Kane','Mbaye','Mbengue','Ndiaye','Ndour','Niang','Sall','Sarr','Seck','Sène','Sow','Sy','Thiam','Touré','Wade'];
  const seen=new Set(roster.filter(r=>!String(r.id).startsWith('demo-')).map(r=>r.name));let i=0;
  roster.forEach(r=>{if(!String(r.id).startsWith('demo-'))return;let name;do{name=firsts[(i*7)%firsts.length]+' '+lasts[(i*11+3)%lasts.length];i++}while(seen.has(name)&&i<5000);seen.add(name);r.name=name});
  const last=s=>s.split(' ').slice(-1)[0];
  roster.sort((a,b)=>last(a.name).localeCompare(last(b.name),'fr')||a.name.localeCompare(b.name,'fr'));
})();

/* ---------- 1. Accueil parent : « À faire » ---------- */
function mergedTodoItems(ids){
  const items=[],wo=pilotLanguage==='wo';
  relevantPosts().filter(p=>p.ack&&(p.target==='all'||ids.includes(p.target))).forEach(p=>{const ok=db.ack.includes(p.id);items.push({urgent:p.type==='urgent',done:ok,tag:p.type==='urgent'?'Urgent':'Avis',who:nameTarget(p.target),title:esc(p.title),
    text:ok?'Réception confirmée · '+esc(db.receiptChannels?.[p.id]||'Application')+'. La direction voit votre confirmation.':esc(p.body),
    action:ok?'':`<button class="primary" onclick="confirmNotice('${p.id}')">${wo?'Jot naa bataaxal bi · Confirmer':'Confirmer la réception'}</button>`})});
  if(ids.includes('ibrahima')){const abs=db.absence.status,ok=abs==='Transmise'||abs==='Justifiée';items.push({done:ok,tag:'Absence',who:'Ibrahima · 4e A',title:'Absence du '+displayDay(isoDay(-2))+', 8 h à 10 h',
    text:abs==='Transmise'?'Justification transmise, en attente de validation par l’école.':abs==='Justifiée'?'Absence justifiée par l’école.':abs==='Précision demandée'?'L’école demande une précision sur votre justification.':'À justifier auprès du surveillant général.',
    action:ok?'':`<button class="primary" onclick="justifyAbsence()">${abs==='Précision demandée'?'Compléter':'Justifier'}</button>`})}
  db.forms.filter(f=>ids.includes(f.student)).forEach(f=>{const r=db.responses[f.id];items.push({done:!!r,tag:'Autorisation',who:students[f.student].short+' · '+students[f.student].class,title:esc(f.title),
    text:r?'Votre réponse : '+esc(r.choice)+'.':'Réponse attendue avant le '+displayDay(f.deadline)+'.',
    action:r?'':`<button class="primary" onclick="answerForm('${f.id}')">Répondre</button>`})});
  if(ids.includes('awa'))items.push({done:!!db.booking,tag:'Rendez-vous',who:'Awa · CM2 A',title:'Rencontre parents et enseignants',
    text:db.booking?'Votre créneau : '+esc(db.booking)+'.':displayDay(isoDay(3))+'. Réservez un créneau avec Mme Diop.',
    action:db.booking?'':`<button class="primary" onclick="go('Calendrier')">Réserver</button>`});
  const owed=ids.reduce((t,id)=>t+balanceStudent(id),0);
  items.push({done:owed===0,tag:'Frais',who:ids.length>1?'Famille Fall':students[ids[0]].short,title:'Mensualité scolaire',
    text:owed?money(owed)+' à régler avant le '+displayDay(isoDay(6))+'. Reçu disponible après chaque versement.':'Frais réglés. Vos reçus sont dans Scolarité.',
    action:owed?`<button class="primary" onclick="go('Scolarité')">Voir et payer</button>`:''});
  return items}
function mergedTodoRow(i){return `<article class="td-item${i.urgent&&!i.done?' urgent':''}${i.done?' done':''}"><div class="td-meta"><span class="td-tag">${i.done?'✓ Fait':i.tag}</span><span>${i.who}</span></div><h3>${i.title}</h3><p>${i.text}</p>${i.action?`<div class="td-action">${i.action}</div>`:''}</article>`}
function mergedHomeworkLine(ids){const list=db.homework.filter(h=>ids.includes(h.student)&&!db.completed.includes(h.id));if(!list.length)return '';const parts=['ibrahima','awa'].filter(id=>ids.includes(id)).map(id=>{const n=list.filter(h=>h.student===id).length;return n?students[id].short+' : '+n+' devoir'+(n>1?'s':''):''}).filter(Boolean);return `<button class="td-follow" onclick="mergedHomeworkModal()"><span class="td-tag info">Devoirs</span><span class="td-follow-text">${parts.join(' · ')}</span><span aria-hidden="true">›</span></button>`}
function mergedHomeworkModal(){const ids=child==='all'?['ibrahima','awa']:[child];modal(`<h2>Devoirs à venir</h2>${ids.map(id=>`<h3 class="td-child">${students[id].name} · ${students[id].class}</h3>${taskRows(id).replace(/Pour le (\d{4}-\d{2}-\d{2})/g,(m,d)=>'Pour le '+displayDay(d))}`).join('')}<div class="actions"><button onclick="closeModal()">Fermer</button></div>`)}
todoBlock=function(){const ids=child==='all'?['awa','ibrahima']:[child],items=mergedTodoItems(ids),open=items.filter(i=>!i.done),done=items.filter(i=>i.done);
  return `<section class="td" aria-labelledby="td-title"><div class="td-head"><h2 id="td-title">${pilotLanguage==='wo'?'Li war a def · À faire':'À faire'}</h2><span class="td-count${open.length?'':' clear'}">${open.length?open.length+' en attente':'Tout est à jour'}</span></div>${open.map(mergedTodoRow).join('')||'<p class="td-empty">✓ Aucune action en attente.</p>'}${mergedHomeworkLine(ids)}${done.length?`<details class="td-done"><summary>Déjà fait (${done.length})</summary>${done.map(mergedTodoRow).join('')}</details>`:''}</section>`};

/* ---------- 3. Bandeau facilitateur ---------- */
const mergedTasks={
  parent:[['A','Retrouver l’annonce pour Awa et confirmer la fermeture'],['B','Envoyer une justification d’absence pour Ibrahima'],['C','Retrouver les devoirs et télécharger la fiche'],['D','Lire le solde et télécharger le reçu de démonstration'],['E','Trouver le professeur et écrire un message'],['F','Montrer le parcours SMS (« répondre 1 ») à un parent sans smartphone']],
  student:[['C','Retrouver les devoirs et télécharger la fiche'],['E','Trouver le professeur et écrire un message']],
  teacher:[['T1','Faire l’appel des 60 élèves : 3 absents, 1 en retard (durée affichée sous la liste)'],['T2','Publier une annonce pour la classe de CM2 A']],
  admin:[['D1','Valider la justification d’absence d’Ibrahima'],['D2','Vérifier quelles familles ont confirmé la fermeture, et par quel canal']]
};
function mergedFacilitatorBar(){const t=mergedTasks[account]||[];return `<section class="fac-bar" aria-label="Mode facilitateur"><div class="fac-head"><b>◇ Mode facilitateur</b><span>Masqué pour le participant</span></div><ol class="fac-tasks">${t.map(([k,x])=>`<li><b>${k}</b>${x}</li>`).join('')}</ol><p class="fac-note">Ne pas guider avant le premier essai. Noter durée, erreurs, aide demandée, compréhension de la simulation et confiance (1 à 5).</p><div class="fac-actions"><button class="small" onclick="resetDemo()">Réinitialiser pour le participant suivant</button>${typeof changeSchool==='function'?'<button class="small" onclick="changeSchool()">Parcours académie / IEF</button>':''}${account==='teacher'&&typeof beginAttendance==='function'?'<button class="small" onclick="beginAttendance(true);render()">Recommencer l’appel chronométré</button>':''}<button class="small" onclick="toggleFacilitator()">Passer en vue participant</button></div></section>`}

/* ---------- Rendu ---------- */
const renderBeforeMerge=render;
render=function(){renderBeforeMerge();document.body.classList.toggle('facilitator',!!facilitator);if(!account||!facilitator)return;const c=document.querySelector('#root .content');if(c&&!c.querySelector('.fac-bar'))c.insertAdjacentHTML('afterbegin',mergedFacilitatorBar())};
render();
