(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const p of o.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&r(p)}).observe(document,{childList:!0,subtree:!0});function t(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(i){if(i.ep)return;i.ep=!0;const o=t(i);fetch(i.href,o)}})();const B=document.querySelector("#app");B.innerHTML=`
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
          <li><kbd>Space</kbd> <span>Play selected track</span></li>
          <li><kbd>Esc</kbd> <span>Stop playback (or close help)</span></li>
          <li><kbd>?</kbd> <span>Open this help modal</span></li>
        </ul>
      </div>
    </div>
  </main>
`;const C=document.querySelector("#audio-files"),Q=document.querySelector("#play-selected"),U=document.querySelector("#stop-playback"),R=document.querySelector("#clear-queue"),N=document.querySelector("#queue-list"),d=document.querySelector("#status"),h=document.querySelector("#seek-bar"),T=document.querySelector("#current-time"),M=document.querySelector("#total-time"),f=document.querySelector("#seek-time-input"),w=document.querySelector("#open-help"),D=document.querySelector("#close-help"),v=document.querySelector("#help-modal"),l=new Audio;let a=[],s=null,b=null,y=null,H=1,k=!1,I=!1;function g(e){if(!Number.isFinite(e)||e<0)return"00:00";const n=Math.floor(e),t=Math.floor(n/3600),r=Math.floor(n%3600/60),i=n%60;return t>0?`${t.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}:${i.toString().padStart(2,"0")}`:`${r.toString().padStart(2,"0")}:${i.toString().padStart(2,"0")}`}function F(e){const n=e.trim().split("/")[0]?.trim()??"";if(!n)return null;if(/^\d+(\.\d+)?$/.test(n))return Number(n);const t=n.split(":").map(r=>r.trim());if(t.some(r=>r.length===0||Number.isNaN(Number(r))))return null;if(t.length===2){const[r,i]=t.map(Number);return r*60+i}if(t.length===3){const[r,i,o]=t.map(Number);return r*3600+i*60+o}return null}function c(){const e=Number.isFinite(l.duration)&&l.duration>0;if(h.disabled=!e,!e){h.max="0",h.value="0",T.textContent="00:00",M.textContent="00:00",k||(f.textContent="00:00");return}const n=Math.min(Math.max(l.currentTime,0),l.duration);h.max=String(l.duration),h.value=String(n),T.textContent=g(n),M.textContent=g(l.duration),k||(f.textContent=g(n))}function A(e,n){if(e===n)return;const t=a.findIndex(p=>p.id===e),r=a.findIndex(p=>p.id===n);if(t===-1||r===-1)return;const i=[...a],[o]=i.splice(t,1);i.splice(r,0,o),a=i}function $(e){if(a.length===0)return;if(s===null){const r=e>0?0:a.length-1;s=a[r]?.id??null,s!==null&&(d.textContent=`Selected: ${a[r].file.name}`,u());return}const n=a.findIndex(r=>r.id===s);if(n===-1)return;const t=Math.min(Math.max(n+e,0),a.length-1);t!==n&&(s=a[t].id,d.textContent=`Selected: ${a[t].file.name}`,u())}function P(e){if(s===null){d.textContent="Select a track first.";return}const n=a.findIndex(o=>o.id===s);if(n===-1)return;const t=n+e;if(t<0||t>=a.length)return;const r=a[n],i=a[t];A(s,i.id),d.textContent=`Moved: ${r.file.name}`,u()}function K(e){const n=e;if(!n)return!1;const t=n.tagName.toLowerCase();return t==="input"||t==="textarea"||t==="select"?!0:n.isContentEditable}function O(){I=!0,v.classList.remove("hidden"),D.focus()}function q(){I=!1,v.classList.add("hidden"),w.focus()}function u(){if(N.innerHTML="",a.length===0){N.innerHTML='<li class="empty">Queue is empty. Add audio files to begin.</li>';return}a.forEach((e,n)=>{const t=document.createElement("li"),r=s===e.id,i=b===e.id;t.className=`queue-item${r?" selected":""}${i?" playing":""}`,t.dataset.id=String(e.id),t.draggable=!0,t.addEventListener("click",m=>{m.target.closest("button")||(s=e.id,d.textContent=`Selected: ${e.file.name}`,u())}),t.addEventListener("dragstart",m=>{y=e.id,t.classList.add("dragging"),m.dataTransfer&&(m.dataTransfer.effectAllowed="move",m.dataTransfer.setData("text/plain",String(e.id)))}),t.addEventListener("dragover",m=>{y===null||y===e.id||(m.preventDefault(),t.classList.add("drag-over"))}),t.addEventListener("dragleave",()=>{t.classList.remove("drag-over")}),t.addEventListener("drop",m=>{m.preventDefault(),t.classList.remove("drag-over"),!(y===null||y===e.id)&&(A(y,e.id),d.textContent="Queue order updated.",u())}),t.addEventListener("dragend",()=>{y=null,t.classList.remove("dragging","drag-over")});const o=document.createElement("button");o.type="button",o.className="track-title",o.textContent=`${n+1}. ${e.file.name}`,o.addEventListener("click",()=>{s=e.id,S(e.id)});const p=document.createElement("span");p.className="track-meta",p.textContent=`${(e.file.size/(1024*1024)).toFixed(2)} MB`;const E=document.createElement("div");E.className="track-actions";const x=document.createElement("button");x.type="button",x.className="danger",x.textContent="Remove",x.addEventListener("click",()=>{j(e.id)}),E.append(x),t.append(o,p,E),N.append(t)})}function S(e){const n=a.find(t=>t.id===e);if(!n){d.textContent="Track not found.";return}s=e,b=e,l.src=n.url,l.play().then(()=>{d.textContent=`Playing: ${n.file.name}`,c(),u()}).catch(t=>{console.error("Playback failed",t),d.textContent=`Could not play ${n.file.name}`,b=null,u()})}function L(){const e=b;if(l.pause(),l.currentTime=0,b=null,e!==null){const n=a.find(t=>t.id===e);d.textContent=n?`Stopped: ${n.file.name}`:"Playback stopped."}else d.textContent="Playback stopped.";c(),u()}function j(e){const n=a.find(r=>r.id===e);if(!n)return;const t=b===e;URL.revokeObjectURL(n.url),a=a.filter(r=>r.id!==e),s===e&&(s=null),t&&L(),u()}function z(){L(),a.forEach(e=>URL.revokeObjectURL(e.url)),a=[],s=null,l.removeAttribute("src"),l.load(),d.textContent="Queue cleared.",c(),u()}l.addEventListener("ended",()=>{if(b===null)return;const e=a.findIndex(t=>t.id===b),n=a[e+1];if(!n){b=null,d.textContent="Playback finished.",c(),u();return}S(n.id)});l.addEventListener("loadedmetadata",()=>{c()});l.addEventListener("timeupdate",()=>{c()});C.addEventListener("change",()=>{const e=C.files;if(!e||e.length===0)return;const n=Array.from(e).map(t=>({id:H++,file:t,url:URL.createObjectURL(t)}));a=[...a,...n],d.textContent=`${n.length} file(s) added to queue.`,C.value="",u()});Q.addEventListener("click",()=>{if(s===null){d.textContent="Select a track first, or click a track title to play.";return}S(s)});U.addEventListener("click",()=>{L()});R.addEventListener("click",()=>{z()});w.addEventListener("click",()=>{O()});D.addEventListener("click",()=>{q()});v.addEventListener("click",e=>{e.target===v&&q()});h.addEventListener("input",()=>{if(!Number.isFinite(l.duration)||l.duration<=0)return;const e=Number(h.value);Number.isNaN(e)||(l.currentTime=Math.min(Math.max(e,0),l.duration),c())});f.addEventListener("focus",()=>{k=!0,f.textContent=g(l.currentTime)});f.addEventListener("blur",()=>{k=!1,c()});f.addEventListener("keydown",e=>{if(e.key==="Enter"){if(e.preventDefault(),!Number.isFinite(l.duration)||l.duration<=0){d.textContent="Load and play a track before seeking.",k=!1,c();return}const n=F(f.textContent??"");if(n===null||Number.isNaN(n)){d.textContent="Invalid time format. Use ss, mm:ss, or hh:mm:ss.",f.textContent=g(l.currentTime);return}const t=Math.min(Math.max(n,0),l.duration);l.currentTime=t,d.textContent=`Seeked to ${g(t)}.`,k=!1,f.blur(),c();return}e.key==="Escape"&&(e.preventDefault(),f.textContent=g(l.currentTime),k=!1,f.blur(),c())});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&I){e.preventDefault(),q();return}if(!K(e.target)){if(e.key==="?"||e.key==="/"&&e.shiftKey){e.preventDefault(),O();return}if(e.key==="ArrowUp"){e.preventDefault(),e.metaKey||e.ctrlKey?P(-1):$(-1);return}if(e.key==="ArrowDown"){e.preventDefault(),e.metaKey||e.ctrlKey?P(1):$(1);return}if(e.code==="Space"){if(e.preventDefault(),s===null){d.textContent="Select a track first, then press Space to play.";return}S(s);return}e.key==="Escape"&&(e.preventDefault(),L())}});window.addEventListener("beforeunload",()=>{a.forEach(e=>URL.revokeObjectURL(e.url))});c();u();
