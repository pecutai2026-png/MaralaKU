(()=>{'use strict';
if(location.pathname==='/admin')return;
const phone='6282317393231';
const icon='<svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 2.3a10.7 10.7 0 1 1-5.5 19.9l-.4-.3-3.9 1 1.1-3.8-.3-.4A10.7 10.7 0 0 1 16 5.3zm-4.5 5c-.3 0-.6.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.1.2 2.2 3.5 5.4 4.8 2.7 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.7-.5l-2.2-1c-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.4-.2-1.4-.5-2.6-1.6-1-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.3c-.3-.6-.5-.5-.7-.5h-.5z"/></svg>';
let business='';
function href(){return 'https://wa.me/'+phone+'?text='+encodeURIComponent('Halo BUMM Marala, saya ingin bertanya tentang Kasir Marala (MaralaKu)'+(business?' untuk usaha '+business:'')+'. Apa saja fiturnya, bagaimana cara mencoba, dan berapa harganya? Terima kasih.');}
function link(floating){const a=document.createElement('a');a.className=floating?'marala-wa marala-wa-float':'marala-wa marala-wa-top';a.href=href();a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Hubungi BUMM melalui WhatsApp');a.title='WhatsApp BUMM · 0823-1739-3231';a.innerHTML=icon+(floating?'<span>Butuh bantuan?</span>':'<span>WhatsApp</span>');return a;}
function mount(){const top=document.querySelector('#marala-preview .mode-switch')||document.querySelector('.topbar .actions');if(top&&!top.querySelector('.marala-wa-top'))top.prepend(link(false));if(!document.querySelector('.marala-wa-float'))document.body.append(link(true));}
mount();const observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});fetch('/platform/session').then(r=>r.json()).then(s=>{business=s.tenant?.name||'';document.querySelectorAll('.marala-wa').forEach(a=>a.href=href());}).catch(()=>{});window.addEventListener('pagehide',()=>observer.disconnect());
})();
