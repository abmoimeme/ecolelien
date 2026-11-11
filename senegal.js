'use strict';
/* ÉcoleLien · conformité au système éducatif sénégalais
   - Élémentaire (CI → CM2) : notes sur 10, année en trimestres, examen de fin de cycle : CFEE
     (moyenne d’au moins 5/10, sans concours d’entrée en sixième depuis le décret n° 2026-1112).
   - Moyen (6e → 3e) et secondaire (2nde → Tle) : notes sur 20, évaluations par semestre,
     BFEM en fin de 3e, baccalauréat en terminale.
   Chargé avant app.js : les fonctions ci-dessous sont utilisées pendant l’affichage. */

function isPrimary(id){return /^(CI|CP|CE1|CE2|CM1|CM2)\b/.test(students?.[id]?.class||'')}
function gradeMax(id){return db?.academics?.[id]?.[0]?.max||(isPrimary(id)?10:20)}
function periodLabel(id,n){return (isPrimary(id)?'Trimestre ':'Semestre ')+n}
function firstPeriod(id){return isPrimary(id)?'1er trimestre':'1er semestre'}

function senegalExamNote(id){const s=students[id];if(!s)return '';
  if(isPrimary(id))return `<div class="notice sn-note"><b>${esc(s.short)} · ${esc(s.class)} : notes sur 10, par trimestre.</b> ${s.class.startsWith('CM2')?'En fin d’année, le CFEE valide l’élémentaire : il faut une moyenne d’au moins 5/10. Il n’y a plus de concours d’entrée en sixième.':'Le CFEE se passe en fin de CM2.'}</div>`;
  if(/^[3-6]e\b/.test(s.class))return `<div class="notice sn-note"><b>${esc(s.short)} · ${esc(s.class)} : notes sur 20, par semestre.</b> ${s.class.startsWith('3e')?'Le BFEM a lieu en fin d’année.':'Le BFEM se passe en fin de 3e.'}</div>`;
  return `<div class="notice sn-note"><b>${esc(s.short)} · ${esc(s.class)} : notes sur 20, par semestre.</b> Le baccalauréat se passe en terminale.</div>`}

document.addEventListener('DOMContentLoaded',()=>{
  /* Données des versions précédentes (notes sur 20 pour le CM2, dates avant la rentrée) : mise à jour unique */
  if(db&&db.senegalRevision!==1){db.academics=JSON.parse(JSON.stringify(subjects));db.senegalRevision=1;try{persist()}catch{}}

  /* Calendrier : repères de l’année scolaire 2026-2027 (dates fixées par le ministère ou l’école) */
  const eventRowsBeforeSenegal=eventRows;
  eventRows=function(){const base=eventRowsBeforeSenegal();const who=account;
    const items=[
      ['2026-12','Vacances de Noël · fin du 1er trimestre','Dates fixées par arrêté du ministère',['parent','student','teacher','admin']],
      ['2026-12','Compositions du 1er trimestre','Awa · CM2 A · dates fixées par l’école',['parent','teacher','admin']],
      ['2027-02','Compositions du 1er semestre','Ibrahima · 4e A · calendrier du ministère',['parent','student','admin']],
      ['2027-06','CFEE · examen de fin d’élémentaire','Awa · CM2 A · moyenne requise : 5/10',['parent','teacher','admin']]
    ].filter(x=>x[3].includes(who)&&x[0]>=isoDay().slice(0,7));
    return base+items.map(([ym,t,s])=>{const d=new Date(ym+'-15T12:00:00Z');const m=new Intl.DateTimeFormat('fr-SN',{month:'short'}).format(d);return `<div class="row sn-event"><div class="datebox">${m}<strong>${ym.slice(0,4)}</strong></div><div class="body"><h3>${t}</h3><div class="meta">${s}</div></div></div>`}).join('')};

  /* Rappel du barème et de l’examen sur les écrans de notes */
  const renderBeforeSenegal=render;
  render=function(){renderBeforeSenegal();if(!account)return;if(!['Notes','Bulletin','Détail évaluation'].includes(page))return;
    const id=account==='student'?'ibrahima':academicStudent;const headEl=document.querySelector('#root .page-head');
    if(headEl&&!document.querySelector('#root .sn-note'))headEl.insertAdjacentHTML('afterend',senegalExamNote(id))};
  render();
});
