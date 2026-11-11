'use strict';
let installPrompt=null;
if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
async function installPrototype(){
 if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}
 modal('<h2>Installer le prototype web</h2><p>Android : ouvrez le site dans Chrome, puis Menu → Installer l’application ou Ajouter à l’écran d’accueil.</p><p>iPhone : ouvrez dans Safari, puis Partager → Sur l’écran d’accueil.</p><p>Pour tester hors connexion, ouvrez d’abord les écrans avec une connexion. Les données restent fictives et locales à ce navigateur.</p><div class="actions"><button onclick="closeModal()">Fermer</button></div>');
}
