'use strict';
/* ÉcoleLien · école privée et PLANETE
   1. Modèle de l’école privée : frais d’inscription + 10 mensualités (octobre à juillet) par enfant,
      paiement Wave / Orange Money / Free Money (ou espèces au guichet), reçu envoyé au parent et au payeur,
      rappels, suivi des impayés pour la direction.
   2. PLANETE (plateforme du ministère de l’Éducation nationale) : ÉcoleLien la complète.
      Le bulletin officiel reste sur Planète Parent ; l’enseignant prépare l’envoi des notes (simulation,
      aucune connexion au ministère). */

/* ---------- 1. Mensualités ---------- */
const FEE_PLAN={awa:{inscription:25000,monthly:30000},ibrahima:{inscription:30000,monthly:40000}};
const FEE_MONTHS=['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07'];
const IEN={awa:'DEMO-IEN-0101',ibrahima:'DEMO-IEN-0102'};
const feeSeed=()=>[
  {id:'DEMO-001',student:'awa',amount:25000,method:'Espèces',date:'5 octobre',payer:'Fatou Fall'},
  {id:'DEMO-002',student:'ibrahima',amount:30000,method:'Espèces',date:'5 octobre',payer:'Fatou Fall'},
  {id:'DEMO-003',student:'awa',amount:30000,method:'Wave',date:'14 octobre',payer:'Ousmane Fall'},
  {id:'DEMO-004',student:'ibrahima',amount:40000,method:'Orange Money',date:'16 octobre',payer:'Ousmane Fall'}];
function monthName(ym){return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(ym+'-15T12:00:00Z'))}
function curMonth(){return isoDay().slice(0,7)}
function feeItems(id){const p=FEE_PLAN[id];if(!p)return [];return [{key:'insc',label:'Frais d’inscription',amount:p.inscription,due:'2026-10-12'},...FEE_MONTHS.map(m=>({key:m,label:'Mensualité '+monthName(m),amount:p.monthly,due:m+'-15'}))]}
function feeStatus(id){let left=db.payments.filter(x=>x.student===id).reduce((s,x)=>s+x.amount,0);const today=isoDay(),cm=curMonth();
  return feeItems(id).map(it=>{const paid=Math.min(it.amount,left);left-=paid;const rest=it.amount-paid;const dueNow=it.due.slice(0,7)<=cm;
    const status=rest===0?'Payé':!dueNow?'À venir':it.due<today?'En retard':'À régler';return {...it,paid,rest,dueNow,status}})}
balanceStudent=function(id){return feeStatus(id).filter(i=>i.dueNow).reduce((s,i)=>s+i.rest,0)};
balance=function(){return Object.keys(FEE_PLAN).reduce((s,id)=>s+balanceStudent(id),0)};
function yearTotal(id){return feeItems(id).reduce((s,i)=>s+i.amount,0)}
function paidTotal(id){return db.payments.filter(x=>x.student===id).reduce((s,x)=>s+x.amount,0)}
function feeDueDay(){const open=Object.keys(FEE_PLAN).flatMap(id=>feeStatus(id).filter(i=>i.dueNow&&i.rest>0)).sort((a,b)=>a.due.localeCompare(b.due));const next=open[0]||Object.keys(FEE_PLAN).flatMap(id=>feeStatus(id).filter(i=>i.rest>0)).sort((a,b)=>a.due.localeCompare(b.due))[0];return next?displayDay(next.due):'—'}
function paymentAllocation(pay){const before=db.payments.slice(0,db.payments.indexOf(pay)).filter(x=>x.student===pay.student).reduce((s,x)=>s+x.amount,0);let start=before,amount=pay.amount;const out=[];
  for(const it of feeItems(pay.student)){if(amount<=0)break;if(start>=it.amount){start-=it.amount;continue}const take=Math.min(it.amount-start,amount);out.push(it.label+(take<it.amount?' (partiel : '+money(take)+')':''));amount-=take;start=0}
  if(amount>0)out.push('Avance : '+money(amount));return out}
const payerNames=()=>db.contacts.filter(c=>/Parent|Payeur/i.test(c.relationship)).map(c=>c.name);

if(db&&db.feeRevision!==1){db.payments=feeSeed();db.feeRevision=1;try{persist()}catch{}}

const feeTag=s=>`<span class="tag ${s==='Payé'?'':s==='En retard'?'red':s==='À régler'?'amber':'blue'}">${s}</span>`;
function feeChildCard(id){const s=students[id],items=feeStatus(id),now=items.filter(i=>i.dueNow||i.status==='Payé'),later=items.filter(i=>!(i.dueNow||i.status==='Payé'));
  const row=i=>`<tr><td>${i.label}</td><td>${money(i.amount)}</td><td>${displayDay(i.due)}</td><td>${feeTag(i.status)}${i.paid&&i.rest?` <small>reste ${money(i.rest)}</small>`:''}</td></tr>`;
  return card(`${s.short} · ${s.class} · ${isPrimary(id)?'élémentaire':'moyen'}`,`<p class="fee-plan">Inscription ${money(FEE_PLAN[id].inscription)} · Mensualité ${money(FEE_PLAN[id].monthly)} × 10 · IEN ${IEN[id]}</p><div class="table-wrap"><table><thead><tr><th>Échéance</th><th>Montant</th><th>Date limite</th><th>Statut</th></tr></thead><tbody>${now.map(row).join('')}</tbody></table></div>${later.length?`<details class="fee-later"><summary>Voir les ${later.length} mensualités à venir</summary><div class="table-wrap"><table><tbody>${later.map(row).join('')}</tbody></table></div></details>`:''}<div class="fee-total">Réglé ${money(paidTotal(id))} sur ${money(yearTotal(id))} pour l’année</div>`)}
function paymentHistory(){return card('Reçus',db.payments.slice().reverse().map(p=>`<div class="row"><div class="body"><h3>${money(p.amount)} · ${esc(students[p.student]?.short||'')}</h3><div class="meta">${esc(p.date)} · ${esc(p.method)} · ${esc(p.payer||'')} · ${p.id}</div><div class="meta">${paymentAllocation(p).map(esc).join(' · ')}</div></div><button class="small" onclick="receipt('${p.id}')">Reçu</button></div>`).join('')||'<p>Aucun versement.</p>')}

/* Classe de démonstration côté direction : statut de paiement fictif et déterministe */
function schoolLedger(){const cm=curMonth(),mi=Math.max(0,FEE_MONTHS.indexOf(cm));const methods=['Wave','Orange Money','Wave','Espèces','Free Money','Wave','Orange Money'];
  const cm2=roster.map((r,i)=>{if(r.id==='awa'||/^Awa Fall$/.test(r.name))return null;const late=i%11===3?2:(i%5===1?1:0);const months=Math.min(late,mi+1);return {name:r.name,cls:'CM2 A',months,amount:months*FEE_PLAN.awa.monthly,method:months?null:methods[i%methods.length]}}).filter(Boolean);
  const fall=Object.keys(FEE_PLAN).map(id=>{const open=feeStatus(id).filter(i=>i.dueNow&&i.rest>0);return {name:students[id].name,cls:students[id].class,months:open.length,amount:balanceStudent(id),real:true,method:null}});
  return {cm2,fall}}
function adminFinance(){const {cm2,fall}=schoolLedger(),cm=curMonth();const all=[...fall,...cm2];
  const expected=60*FEE_PLAN.awa.monthly+55*FEE_PLAN.ibrahima.monthly;const lateCm2=cm2.filter(x=>x.months),late4e=Math.round(55*0.2);
  const unpaid=lateCm2.reduce((s,x)=>s+Math.min(x.months,1)*FEE_PLAN.awa.monthly,0)+late4e*FEE_PLAN.ibrahima.monthly+fall.reduce((s,x)=>s+Math.min(x.months,1)*(FEE_PLAN[x.name.startsWith('Awa')?'awa':'ibrahima'].monthly),0);
  const collected=Math.max(0,expected-unpaid),rate=Math.round(collected*100/expected);const toRemind=all.filter(x=>x.months>0);
  const paidMethods=cm2.filter(x=>x.method).map(x=>x.method),count=m=>paidMethods.filter(x=>x===m).length,tot=paidMethods.length||1;
  const last=db.feeReminder;
  return head('Scolarité et encaissements',`Mensualités de ${monthName(cm)} · CM2 A et 4e A · données fictives`)+
   stats([['Attendu ce mois',money(expected),'115 élèves'],['Encaissé',money(collected),rate+' % recouvré'],['À relancer',String(toRemind.length+late4e),'familles'],['Dernier rappel',last?esc(last.at):'—',last?last.count+' familles':'aucun']])+
   card('Impayés à relancer',`<div class="table-wrap"><table><thead><tr><th>Élève</th><th>Classe</th><th>Mois dus</th><th>Montant</th></tr></thead><tbody>${toRemind.sort((a,b)=>b.months-a.months||(b.real?1:0)-(a.real?1:0)).map(x=>`<tr${x.real?' class="fee-real"':''}><td>${esc(x.name)}${x.real?' <small>(famille de démo)</small>':''}</td><td>${esc(x.cls)}</td><td>${x.months}</td><td>${money(x.amount)}</td></tr>`).join('')}<tr><td colspan="2"><i>4e A · autres familles</i></td><td>1</td><td>${money(late4e*FEE_PLAN.ibrahima.monthly)} (${late4e} élèves)</td></tr></tbody></table></div><div class="toolbar"><button class="primary" onclick="feeRelance(${toRemind.length+late4e})">Relancer par SMS et WhatsApp (simulation)</button><button onclick="paymentModal()">Enregistrer un versement au guichet</button></div><p class="help">Le rappel est poli et automatique : montant, mois concernés, liens Wave et Orange Money. Aucun message réel n’est envoyé dans la démo.</p>`)+
   card('Moyens de paiement · CM2 A ce mois',['Wave','Orange Money','Free Money','Espèces'].map(m=>{const pc=Math.round(count(m)*100/tot);return `<div class="fee-bar"><span>${m}</span><div><i style="width:${pc}%"></i></div><b>${pc} %</b></div>`}).join('')+'<p class="help">Les paiements mobiles arrivent avec une référence : l’école n’a plus à rapprocher les reçus à la main.</p>')+
   card('Registre officiel',`<p>Les inscriptions officielles et le bulletin restent dans <b>PLANETE</b>, la plateforme du ministère. ÉcoleLien suit les mensualités de l’école privée et la communication avec les familles.</p>`)+paymentHistory()}
function feeRelance(n){if(account!=='admin')return;db.feeReminder={at:displayDay(isoDay())+' · '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),count:n};log('Rappel de mensualité envoyé à '+n+' familles (simulation)');persist();render();notify(n+' familles relancées (simulation : aucun SMS envoyé).')}
finance=function(){if(account==='admin')return adminFinance();const owed=balance(),payers=payerNames();
  return head('Scolarité','Famille Fall · Groupe scolaire privé · inscription et mensualités d’octobre à juillet')+
   stats([['À régler',money(owed),owed?'avant le '+feeDueDay():'Rien à régler'],['Réglé cette année',money(paidTotal('awa')+paidTotal('ibrahima')),db.payments.length+' reçus'],['Reste sur l’année',money(yearTotal('awa')+yearTotal('ibrahima')-paidTotal('awa')-paidTotal('ibrahima')),'jusqu’en juillet'],['Prochaine échéance',feeDueDay(),'mensualité']])+
   (db.feeReminder&&owed?`<div class="notice fee-reminder"><b>Rappel de l’école · ${esc(db.feeReminder.at)}</b><br>${money(owed)} à régler avant le ${feeDueDay()}. Vous pouvez payer ici avec Wave, Orange Money ou Free Money.</div>`:'')+
   `<div class="toolbar fee-actions"><button class="primary" onclick="paymentModal()">Payer une mensualité</button></div>`+
   Object.keys(FEE_PLAN).map(feeChildCard).join('')+
   `<p class="help">Reçus envoyés à : ${payers.map(esc).join(' et ')}. Simulation : aucune transaction réelle, aucun code secret demandé.</p>`+paymentHistory()};
views['Scolarité']=finance;
paymentModal=function(){if(!permitted('parent','admin'))return;const ids=Object.keys(FEE_PLAN);const first=ids.find(id=>balanceStudent(id)>0)||ids[0];
  modal(`<h2>${account==='admin'?'Versement au guichet':'Payer une mensualité'}</h2><span class="tag amber">Simulation · aucun débit réel</span><form onsubmit="submitPayment(event)"><label>Élève<select id="pay-student" onchange="updatePayMax()">${ids.map(id=>`<option value="${id}" ${id===first?'selected':''}>${students[id].name} · ${balanceStudent(id)?'à régler '+money(balanceStudent(id)):'à jour'}</option>`).join('')}</select></label><label>Montant en F CFA<input id="pay-amount" type="number" min="1" step="1" required></label><label>Moyen<select id="pay-method"><option>Wave</option><option>Orange Money</option><option>Free Money</option>${account==='admin'?'<option>Espèces</option><option>Chèque</option>':''}</select></label><label>Payé par<select id="pay-payer">${payerNames().map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><p class="help">Aucun numéro de carte, code secret ou identifiant de portefeuille n’est demandé. Le reçu est envoyé au parent et au payeur.</p>${fieldsEnd('Confirmer la simulation')}</form>`);updatePayMax()};
updatePayMax=function(){const id=$('#pay-student').value,owed=balanceStudent(id),next=feeStatus(id).find(i=>i.rest>0);const max=yearTotal(id)-paidTotal(id);const el=$('#pay-amount');el.max=max;el.value=owed||next?.rest||0};
submitPayment=function(e){e.preventDefault();if(!permitted('parent','admin'))return;const id=$('#pay-student').value,n=Number($('#pay-amount').value),max=yearTotal(id)-paidTotal(id);
  if(!Number.isInteger(n)||n<=0||n>max){notify('Montant invalide : au maximum '+money(max)+' pour l’année.');return}
  const p={id:'DEMO-'+String(db.payments.length+1).padStart(3,'0'),student:id,amount:n,method:$('#pay-method').value,date:displayDay(isoDay()),payer:$('#pay-payer').value};
  db.payments.push(p);log('Versement fictif de '+money(n)+' pour '+students[id].short+' · '+p.method);closeModal();render();notify('Reçu envoyé par SMS à '+payerNames().join(' et ')+' (simulation).')};
receipt=function(rid){const p=db.payments.find(x=>x.id===rid);if(!p||!permitted('parent','admin'))return;
  modal(`<span class="tag amber">Sans valeur comptable</span><h2 style="margin-top:15px">Reçu ${p.id}</h2><p>${students[p.student].name} · ${students[p.student].class} · IEN ${IEN[p.student]||''}</p><h2>${money(p.amount)}</h2><p>Affecté à : ${paymentAllocation(p).map(esc).join(', ')}<br>Moyen : ${esc(p.method)}<br>Payé par : ${esc(p.payer||'')}<br>Date : ${esc(p.date)}</p><p class="help">Envoyé par SMS à ${payerNames().map(esc).join(' et ')} (simulation).</p><button class="primary" onclick="downloadReceipt('${p.id}')">Télécharger le reçu fictif</button><div class="actions"><button onclick="closeModal()">Fermer</button></div>`)};
downloadReceipt=function(rid){const p=db.payments.find(x=>x.id===rid);if(!p)return;download('Recu_'+p.id+'.txt',`REÇU DE DÉMONSTRATION, SANS VALEUR COMPTABLE\nGroupe scolaire pilote Malika Plage, établissement fictif\n${p.id}\nÉlève : ${students[p.student].name} · ${students[p.student].class}\nMontant : ${money(p.amount)}\nAffecté à : ${paymentAllocation(p).join(', ')}\nMoyen : ${p.method}\nPayé par : ${p.payer||''}\nDate : ${p.date}\nAucune transaction réelle.`)};

/* ---------- 2. PLANETE ---------- */
function planeteTeacherCard(){const st=db.planete?.cm2;return `<section class="card planete"><div class="pl-head"><b>PLANETE · ministère de l’Éducation nationale</b><span class="tag ${st?'':'amber'}">${st?'Notes préparées':'À préparer'}</span></div><p>${st?`Notes du ${esc(st.period)} de la CM2 A préparées pour PLANETE le ${esc(st.at)}.`:'Saisissez les notes une seule fois ici : ÉcoleLien prépare l’envoi vers PLANETE pour éviter la double saisie.'}</p><div class="toolbar"><button class="${st?'':'primary'}" onclick="planeteModal()">${st?'Revoir l’envoi':'Préparer l’envoi vers PLANETE'}</button></div><p class="help">Démonstration : aucune connexion au ministère.</p></section>`}
function planeteModal(){if(account!=='teacher')return;modal(`<h2>Envoi des notes vers PLANETE</h2><span class="tag amber">Simulation · aucune connexion au ministère</span><div class="table-wrap"><table><tbody><tr><td>Classe</td><td><b>CM2 A</b> · ${roster.length} élèves</td></tr><tr><td>Période</td><td>Trimestre 1</td></tr><tr><td>Domaines</td><td>${db.academics.awa.map(s=>esc(s.name)).join(', ')}</td></tr><tr><td>Barème</td><td>Notes sur 10</td></tr><tr><td>Identifiant élève</td><td>IEN</td></tr></tbody></table></div><p class="help">Dans la version réelle, l’envoi se ferait selon les règles et l’accord du ministère. Ici, rien ne quitte le téléphone.</p><div class="actions"><button onclick="closeModal()">Annuler</button><button class="primary" onclick="planeteSend()">Simuler l’envoi</button></div>`)}
function planeteSend(){if(account!=='teacher')return;db.planete=db.planete||{};db.planete.cm2={at:displayDay(isoDay()),period:'Trimestre 1'};log('Notes CM2 A · Trimestre 1 préparées pour PLANETE (simulation)');closeModal();persist();render();notify('Notes préparées pour PLANETE (simulation).')}
function planeteParentCard(){const ids=Object.keys(IEN);return `<section class="card planete"><div class="pl-head"><b>Bulletin officiel : Planète Parent</b></div><p>Le bulletin officiel est publié par le ministère sur <b>Planète Parent</b>, avec l’IEN de votre enfant. ÉcoleLien vous donne le suivi au quotidien : notes, devoirs, absences, messages et mensualités.</p><div class="pl-ien">${ids.map(id=>`<span>${esc(students[id].short)} · IEN ${IEN[id]}</span>`).join('')}</div><p class="help"><a href="https://parent.education.sn" target="_blank" rel="noopener">parent.education.sn ↗</a> · site officiel du ministère, indépendant d’ÉcoleLien. IEN fictifs dans la démo.</p></section>`}
function planeteAdminCard(){const st=db.planete?.cm2;return `<section class="card planete"><div class="pl-head"><b>PLANETE</b><span class="tag ${st?'':'amber'}">${st?'1 classe sur 2 prête':'0 classe sur 2 prête'}</span></div><p>Notes du trimestre / semestre préparées pour PLANETE : CM2 A ${st?'✓ le '+esc(st.at):'en attente'} · 4e A en attente.</p><p class="help">ÉcoleLien complète PLANETE : communication quotidienne, confirmations de lecture, mensualités et reçus.</p></section>`}

/* Insertion dans les écrans */
const renderBeforeSchool=render;
render=function(){renderBeforeSchool();if(!account)return;const headEl=document.querySelector('#root .page-head');if(!headEl||document.querySelector('#root .planete'))return;
  let html='';if(['Notes','Bulletin'].includes(page)){if(account==='teacher')html=planeteTeacherCard();else if(account==='parent')html=planeteParentCard()}
  else if(page==='Accueil'&&account==='admin')html=planeteAdminCard();
  if(html){const after=document.querySelector('#root .sn-note')||headEl;after.insertAdjacentHTML('afterend',html)}};
