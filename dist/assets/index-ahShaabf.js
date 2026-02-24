(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))i(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const f of o.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&i(f)}).observe(document,{childList:!0,subtree:!0});function n(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(l){if(l.ep)return;l.ep=!0;const o=n(l);fetch(l.href,o)}})();const Q=document.querySelector("#app");Q.innerHTML=`
  <main class="player-app">
    <header>
      <div class="header-row">
        <h1>Audio Queue Player</h1>
        <button id="open-help" type="button" class="help-button" aria-label="Open keyboard shortcuts help">?</button>
      </div>
      <p>Add audio files to your queue. Nothing plays until you click a track.</p>
    </header>

    <section class="controls">
      <label class="file-picker" for="audio-files">+ Add Audio Files</label>
      <input id="audio-files" type="file" accept="audio/*" multiple />

      <button id="play-selected" type="button">Play Selected</button>
      <button id="pause-playback" type="button">Pause</button>
      <button id="stop-playback" type="button">Stop</button>
      <button id="clear-queue" type="button" class="danger">Clear Queue</button>
    </section>

    <section class="timeline-panel">
      <input id="seek-bar" type="range" min="0" max="0" value="0" step="0.01" disabled />
      <div class="timeline-marks">
        <span id="current-time">00:00</span>
        <div
          id="seek-time-input"
          class="seek-time-input"
          contenteditable="true"
          role="textbox"
          aria-label="Seek time"
          spellcheck="false"
        >00:00</div>
        <span id="total-time">00:00</span>
      </div>
    </section>

    <section>
      <ul id="queue-list" class="queue-list"></ul>
    </section>

    <footer>
      <p id="status">No track selected.</p>
    </footer>

    <div id="help-modal" class="help-modal hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-modal-card">
        <div class="help-modal-header">
          <h2 id="help-title">Keyboard Shortcuts</h2>
          <button id="close-help" type="button" class="help-close" aria-label="Close help">✕</button>
        </div>
        <ul class="help-shortcuts">
          <li><kbd>↑</kbd> / <kbd>↓</kbd> <span>Select previous / next track</span></li>
          <li><kbd>⌘ / Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> <span>Move selected track</span></li>
          <li><kbd>Space</kbd> <span>Play / Pause selected track</span></li>
          <li><kbd>Esc</kbd> <span>Stop playback (or close help)</span></li>
          <li><kbd>?</kbd> <span>Open this help modal</span></li>
        </ul>
      </div>
    </div>
  </main>
`;const C=document.querySelector("#audio-files"),U=document.querySelector("#play-selected"),H=document.querySelector("#pause-playback"),F=document.querySelector("#stop-playback"),K=document.querySelector("#clear-queue"),E=document.querySelector("#queue-list"),s=document.querySelector("#status"),h=document.querySelector("#seek-bar"),T=document.querySelector("#current-time"),P=document.querySelector("#total-time"),m=document.querySelector("#seek-time-input"),w=document.querySelector("#open-help"),D=document.querySelector("#close-help"),v=document.querySelector("#help-modal"),a=new Audio;let r=[],u=null,p=null,y=null,j=1,k=!1,N=!1;function g(e){if(!Number.isFinite(e)||e<0)return"00:00";const t=Math.floor(e),n=Math.floor(t/3600),i=Math.floor(t%3600/60),l=t%60;return n>0?`${n.toString().padStart(2,"0")}:${i.toString().padStart(2,"0")}:${l.toString().padStart(2,"0")}`:`${i.toString().padStart(2,"0")}:${l.toString().padStart(2,"0")}`}function z(e){const t=e.trim().split("/")[0]?.trim()??"";if(!t)return null;if(/^\d+(\.\d+)?$/.test(t))return Number(t);const n=t.split(":").map(i=>i.trim());if(n.some(i=>i.length===0||Number.isNaN(Number(i))))return null;if(n.length===2){const[i,l]=n.map(Number);return i*60+l}if(n.length===3){const[i,l,o]=n.map(Number);return i*3600+l*60+o}return null}function d(){const e=Number.isFinite(a.duration)&&a.duration>0;if(h.disabled=!e,!e){h.max="0",h.value="0",T.textContent="00:00",P.textContent="00:00",k||(m.textContent="00:00");return}const t=Math.min(Math.max(a.currentTime,0),a.duration);h.max=String(a.duration),h.value=String(t),T.textContent=g(t),P.textContent=g(a.duration),k||(m.textContent=g(t))}function O(e,t){if(e===t)return;const n=r.findIndex(f=>f.id===e),i=r.findIndex(f=>f.id===t);if(n===-1||i===-1)return;const l=[...r],[o]=l.splice(n,1);l.splice(i,0,o),r=l}function $(e){if(r.length===0)return;if(u===null){const i=e>0?0:r.length-1;u=r[i]?.id??null,u!==null&&(s.textContent=`Selected: ${r[i].file.name}`,c());return}const t=r.findIndex(i=>i.id===u);if(t===-1)return;const n=Math.min(Math.max(t+e,0),r.length-1);n!==t&&(u=r[n].id,s.textContent=`Selected: ${r[n].file.name}`,c())}function M(e){if(u===null){s.textContent="Select a track first.";return}const t=r.findIndex(o=>o.id===u);if(t===-1)return;const n=t+e;if(n<0||n>=r.length)return;const i=r[t],l=r[n];O(u,l.id),s.textContent=`Moved: ${i.file.name}`,c()}function G(e){const t=e;if(!t)return!1;const n=t.tagName.toLowerCase();return n==="input"||n==="textarea"||n==="select"?!0:t.isContentEditable}function A(){N=!0,v.classList.remove("hidden"),D.focus()}function I(){N=!1,v.classList.add("hidden"),w.focus()}function c(){if(E.innerHTML="",r.length===0){E.innerHTML='<li class="empty">Queue is empty. Add audio files to begin.</li>';return}r.forEach((e,t)=>{const n=document.createElement("li"),i=u===e.id,l=p===e.id;n.className=`queue-item${i?" selected":""}${l?" playing":""}`,n.dataset.id=String(e.id),n.draggable=!0,n.addEventListener("click",b=>{b.target.closest("button")||(u=e.id,s.textContent=`Selected: ${e.file.name}`,c())}),n.addEventListener("dragstart",b=>{y=e.id,n.classList.add("dragging"),b.dataTransfer&&(b.dataTransfer.effectAllowed="move",b.dataTransfer.setData("text/plain",String(e.id)))}),n.addEventListener("dragover",b=>{y===null||y===e.id||(b.preventDefault(),n.classList.add("drag-over"))}),n.addEventListener("dragleave",()=>{n.classList.remove("drag-over")}),n.addEventListener("drop",b=>{b.preventDefault(),n.classList.remove("drag-over"),!(y===null||y===e.id)&&(O(y,e.id),s.textContent="Queue order updated.",c())}),n.addEventListener("dragend",()=>{y=null,n.classList.remove("dragging","drag-over")});const o=document.createElement("button");o.type="button",o.className="track-title",o.textContent=`${t+1}. ${e.file.name}`,o.addEventListener("click",()=>{u=e.id,q(e.id)});const f=document.createElement("span");f.className="track-meta",f.textContent=`${(e.file.size/(1024*1024)).toFixed(2)} MB`;const L=document.createElement("div");L.className="track-actions";const x=document.createElement("button");x.type="button",x.className="danger",x.textContent="Remove",x.addEventListener("click",()=>{J(e.id)}),L.append(x),n.append(o,f,L),E.append(n)})}function q(e){const t=r.find(n=>n.id===e);if(!t){s.textContent="Track not found.";return}u=e,p=e,a.src=t.url,a.play().then(()=>{s.textContent=`Playing: ${t.file.name}`,d(),c()}).catch(n=>{console.error("Playback failed",n),s.textContent=`Could not play ${t.file.name}`,p=null,c()})}function B(){if(p===null||a.paused)return;a.pause();const e=r.find(t=>t.id===p);s.textContent=e?`Paused: ${e.file.name}`:"Playback paused.",d()}function R(){if(u===null){s.textContent="Select a track first, then press Space to play.";return}if(p===u&&a.src&&a.paused){a.play().then(()=>{const e=r.find(t=>t.id===u);s.textContent=e?`Playing: ${e.file.name}`:"Playback resumed.",d(),c()}).catch(e=>{console.error("Resume failed",e),s.textContent="Could not resume playback."});return}q(u)}function S(){const e=p;if(a.pause(),a.currentTime=0,p=null,e!==null){const t=r.find(n=>n.id===e);s.textContent=t?`Stopped: ${t.file.name}`:"Playback stopped."}else s.textContent="Playback stopped.";d(),c()}function J(e){const t=r.find(i=>i.id===e);if(!t)return;const n=p===e;URL.revokeObjectURL(t.url),r=r.filter(i=>i.id!==e),u===e&&(u=null),n&&S(),c()}function V(){S(),r.forEach(e=>URL.revokeObjectURL(e.url)),r=[],u=null,a.removeAttribute("src"),a.load(),s.textContent="Queue cleared.",d(),c()}a.addEventListener("ended",()=>{if(p===null)return;const e=r.findIndex(n=>n.id===p),t=r[e+1];if(!t){p=null,s.textContent="Playback finished.",d(),c();return}q(t.id)});a.addEventListener("loadedmetadata",()=>{d()});a.addEventListener("timeupdate",()=>{d()});C.addEventListener("change",()=>{const e=C.files;if(!e||e.length===0)return;const t=Array.from(e).map(n=>({id:j++,file:n,url:URL.createObjectURL(n)}));r=[...r,...t],s.textContent=`${t.length} file(s) added to queue.`,C.value="",c()});U.addEventListener("click",()=>{R()});H.addEventListener("click",()=>{B()});F.addEventListener("click",()=>{S()});K.addEventListener("click",()=>{V()});w.addEventListener("click",()=>{A()});D.addEventListener("click",()=>{I()});v.addEventListener("click",e=>{e.target===v&&I()});h.addEventListener("input",()=>{if(!Number.isFinite(a.duration)||a.duration<=0)return;const e=Number(h.value);Number.isNaN(e)||(a.currentTime=Math.min(Math.max(e,0),a.duration),d())});m.addEventListener("focus",()=>{k=!0,m.textContent=g(a.currentTime)});m.addEventListener("blur",()=>{k=!1,d()});m.addEventListener("keydown",e=>{if(e.key==="Enter"){if(e.preventDefault(),!Number.isFinite(a.duration)||a.duration<=0){s.textContent="Load and play a track before seeking.",k=!1,d();return}const t=z(m.textContent??"");if(t===null||Number.isNaN(t)){s.textContent="Invalid time format. Use ss, mm:ss, or hh:mm:ss.",m.textContent=g(a.currentTime);return}const n=Math.min(Math.max(t,0),a.duration);a.currentTime=n,s.textContent=`Seeked to ${g(n)}.`,k=!1,m.blur(),d();return}e.key==="Escape"&&(e.preventDefault(),m.textContent=g(a.currentTime),k=!1,m.blur(),d())});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&N){e.preventDefault(),I();return}if(!G(e.target)){if(e.key==="?"||e.key==="/"&&e.shiftKey){e.preventDefault(),A();return}if(e.key==="ArrowUp"){e.preventDefault(),e.metaKey||e.ctrlKey?M(-1):$(-1);return}if(e.key==="ArrowDown"){e.preventDefault(),e.metaKey||e.ctrlKey?M(1):$(1);return}if(e.code==="Space"){if(e.preventDefault(),p!==null&&!a.paused){B();return}R();return}e.key==="Escape"&&(e.preventDefault(),S())}});window.addEventListener("beforeunload",()=>{r.forEach(e=>URL.revokeObjectURL(e.url))});d();c();
