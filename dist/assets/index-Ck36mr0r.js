(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&r(d)}).observe(document,{childList:!0,subtree:!0});function n(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerPolicy&&(l.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?l.credentials="include":o.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(o){if(o.ep)return;o.ep=!0;const l=n(o);fetch(o.href,l)}})();const k=document.querySelector("#app");k.innerHTML=`
  <main class="player-app">
    <header>
      <h1>Audio Queue Player</h1>
      <p>Add audio files to your queue. Nothing plays until you click a track.</p>
    </header>

    <section class="controls">
      <label class="file-picker" for="audio-files">+ Add Audio Files</label>
      <input id="audio-files" type="file" accept="audio/*" multiple />

      <button id="play-selected" type="button">Play Selected</button>
      <button id="stop-playback" type="button">Stop</button>
      <button id="clear-queue" type="button" class="danger">Clear Queue</button>
    </section>

    <section>
      <ul id="queue-list" class="queue-list"></ul>
    </section>

    <footer>
      <p id="status">No track selected.</p>
    </footer>
  </main>
`;const b=document.querySelector("#audio-files"),S=document.querySelector("#play-selected"),v=document.querySelector("#stop-playback"),x=document.querySelector("#clear-queue"),L=document.querySelector("#queue-list"),i=document.querySelector("#status"),p=new Audio;let c=[],a=null,u=null,E=1;p.addEventListener("ended",()=>{if(u===null)return;const e=c.findIndex(n=>n.id===u),t=c[e+1];if(!t){u=null,i.textContent="Playback finished.",s();return}h(t.id)});function q(e){if(!Number.isFinite(e)||e<0)return"--:--";const t=Math.floor(e),n=Math.floor(t/60).toString().padStart(2,"0"),r=(t%60).toString().padStart(2,"0");return`${n}:${r}`}function s(){if(L.innerHTML="",c.length===0){L.innerHTML='<li class="empty">Queue is empty. Add audio files to begin.</li>';return}c.forEach((e,t)=>{const n=document.createElement("li"),r=a===e.id,o=u===e.id;n.className=`queue-item${r?" selected":""}${o?" playing":""}`,n.dataset.id=String(e.id);const l=document.createElement("button");l.type="button",l.className="track-title",l.textContent=`${t+1}. ${e.file.name}`,l.addEventListener("click",()=>{a=e.id,h(e.id)});const d=document.createElement("span");d.className="track-meta",d.textContent=`${q(0)} • ${(e.file.size/(1024*1024)).toFixed(2)} MB`;const y=document.createElement("div");y.className="track-actions";const m=document.createElement("button");m.type="button",m.textContent="Select",m.addEventListener("click",()=>{a=e.id,i.textContent=`Selected: ${e.file.name}`,s()});const f=document.createElement("button");f.type="button",f.className="danger",f.textContent="Remove",f.addEventListener("click",()=>{C(e.id)}),y.append(m,f),n.append(l,d,y),L.append(n)})}function h(e){const t=c.find(n=>n.id===e);if(!t){i.textContent="Track not found.";return}a=e,u=e,p.src=t.url,p.play().then(()=>{i.textContent=`Playing: ${t.file.name}`,s()}).catch(n=>{console.error("Playback failed",n),i.textContent=`Could not play ${t.file.name}`,u=null,s()})}function g(){if(p.pause(),p.currentTime=0,u!==null){const e=c.find(t=>t.id===u);i.textContent=e?`Stopped: ${e.file.name}`:"Playback stopped."}else i.textContent="Playback stopped.";u=null,s()}function C(e){const t=c.find(r=>r.id===e);if(!t)return;const n=u===e;URL.revokeObjectURL(t.url),c=c.filter(r=>r.id!==e),a===e&&(a=null),n&&g(),s()}function P(){g(),c.forEach(e=>URL.revokeObjectURL(e.url)),c=[],a=null,i.textContent="Queue cleared.",s()}b.addEventListener("change",()=>{const e=b.files;if(!e||e.length===0)return;const t=Array.from(e).map(n=>({id:E++,file:n,url:URL.createObjectURL(n)}));c=[...c,...t],i.textContent=`${t.length} file(s) added to queue.`,b.value="",s()});S.addEventListener("click",()=>{if(a===null){i.textContent="Select a track first, or click a track title to play.";return}h(a)});v.addEventListener("click",()=>{g()});x.addEventListener("click",()=>{P()});window.addEventListener("beforeunload",()=>{c.forEach(e=>URL.revokeObjectURL(e.url))});s();
