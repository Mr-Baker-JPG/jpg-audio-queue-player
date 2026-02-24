(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&a(d)}).observe(document,{childList:!0,subtree:!0});function t(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(r){if(r.ep)return;r.ep=!0;const o=t(r);fetch(r.href,o)}})();const q=document.querySelector("#app");q.innerHTML=`
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
  </main>
`;const k=document.querySelector("#audio-files"),I=document.querySelector("#play-selected"),$=document.querySelector("#stop-playback"),P=document.querySelector("#clear-queue"),S=document.querySelector("#queue-list"),u=document.querySelector("#status"),b=document.querySelector("#seek-bar"),N=document.querySelector("#current-time"),T=document.querySelector("#total-time"),c=document.querySelector("#seek-time-input"),i=new Audio;let s=[],p=null,y=null,g=null,M=1,v=!1;function x(e){if(!Number.isFinite(e)||e<0)return"00:00";const n=Math.floor(e),t=Math.floor(n/3600),a=Math.floor(n%3600/60),r=n%60;return t>0?`${t.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`:`${a.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`}function A(e){const n=e.trim().split("/")[0]?.trim()??"";if(!n)return null;if(/^\d+(\.\d+)?$/.test(n))return Number(n);const t=n.split(":").map(a=>a.trim());if(t.some(a=>a.length===0||Number.isNaN(Number(a))))return null;if(t.length===2){const[a,r]=t.map(Number);return a*60+r}if(t.length===3){const[a,r,o]=t.map(Number);return a*3600+r*60+o}return null}function l(){const e=Number.isFinite(i.duration)&&i.duration>0;if(b.disabled=!e,!e){b.max="0",b.value="0",N.textContent="00:00",T.textContent="00:00",v||(c.textContent="00:00");return}const n=Math.min(Math.max(i.currentTime,0),i.duration);b.max=String(i.duration),b.value=String(n),N.textContent=x(n),T.textContent=x(i.duration),v||(c.textContent=x(n))}function O(e,n){if(e===n)return;const t=s.findIndex(d=>d.id===e),a=s.findIndex(d=>d.id===n);if(t===-1||a===-1)return;const r=[...s],[o]=r.splice(t,1);r.splice(a,0,o),s=r}function m(){if(S.innerHTML="",s.length===0){S.innerHTML='<li class="empty">Queue is empty. Add audio files to begin.</li>';return}s.forEach((e,n)=>{const t=document.createElement("li"),a=p===e.id,r=y===e.id;t.className=`queue-item${a?" selected":""}${r?" playing":""}`,t.dataset.id=String(e.id),t.draggable=!0,t.addEventListener("click",f=>{f.target.closest("button")||(p=e.id,u.textContent=`Selected: ${e.file.name}`,m())}),t.addEventListener("dragstart",f=>{g=e.id,t.classList.add("dragging"),f.dataTransfer&&(f.dataTransfer.effectAllowed="move",f.dataTransfer.setData("text/plain",String(e.id)))}),t.addEventListener("dragover",f=>{g===null||g===e.id||(f.preventDefault(),t.classList.add("drag-over"))}),t.addEventListener("dragleave",()=>{t.classList.remove("drag-over")}),t.addEventListener("drop",f=>{f.preventDefault(),t.classList.remove("drag-over"),!(g===null||g===e.id)&&(O(g,e.id),u.textContent="Queue order updated.",m())}),t.addEventListener("dragend",()=>{g=null,t.classList.remove("dragging","drag-over")});const o=document.createElement("button");o.type="button",o.className="track-title",o.textContent=`${n+1}. ${e.file.name}`,o.addEventListener("click",()=>{p=e.id,E(e.id)});const d=document.createElement("span");d.className="track-meta",d.textContent=`${(e.file.size/(1024*1024)).toFixed(2)} MB`;const h=document.createElement("div");h.className="track-actions";const L=document.createElement("button");L.type="button",L.className="danger",L.textContent="Remove",L.addEventListener("click",()=>{Q(e.id)}),h.append(L),t.append(o,d,h),S.append(t)})}function E(e){const n=s.find(t=>t.id===e);if(!n){u.textContent="Track not found.";return}p=e,y=e,i.src=n.url,i.play().then(()=>{u.textContent=`Playing: ${n.file.name}`,l(),m()}).catch(t=>{console.error("Playback failed",t),u.textContent=`Could not play ${n.file.name}`,y=null,m()})}function C(){const e=y;if(i.pause(),i.currentTime=0,y=null,e!==null){const n=s.find(t=>t.id===e);u.textContent=n?`Stopped: ${n.file.name}`:"Playback stopped."}else u.textContent="Playback stopped.";l(),m()}function Q(e){const n=s.find(a=>a.id===e);if(!n)return;const t=y===e;URL.revokeObjectURL(n.url),s=s.filter(a=>a.id!==e),p===e&&(p=null),t&&C(),m()}function w(){C(),s.forEach(e=>URL.revokeObjectURL(e.url)),s=[],p=null,i.removeAttribute("src"),i.load(),u.textContent="Queue cleared.",l(),m()}i.addEventListener("ended",()=>{if(y===null)return;const e=s.findIndex(t=>t.id===y),n=s[e+1];if(!n){y=null,u.textContent="Playback finished.",l(),m();return}E(n.id)});i.addEventListener("loadedmetadata",()=>{l()});i.addEventListener("timeupdate",()=>{l()});k.addEventListener("change",()=>{const e=k.files;if(!e||e.length===0)return;const n=Array.from(e).map(t=>({id:M++,file:t,url:URL.createObjectURL(t)}));s=[...s,...n],u.textContent=`${n.length} file(s) added to queue.`,k.value="",m()});I.addEventListener("click",()=>{if(p===null){u.textContent="Select a track first, or click a track title to play.";return}E(p)});$.addEventListener("click",()=>{C()});P.addEventListener("click",()=>{w()});b.addEventListener("input",()=>{if(!Number.isFinite(i.duration)||i.duration<=0)return;const e=Number(b.value);Number.isNaN(e)||(i.currentTime=Math.min(Math.max(e,0),i.duration),l())});c.addEventListener("focus",()=>{v=!0,c.textContent=x(i.currentTime)});c.addEventListener("blur",()=>{v=!1,l()});c.addEventListener("keydown",e=>{if(e.key==="Enter"){if(e.preventDefault(),!Number.isFinite(i.duration)||i.duration<=0){u.textContent="Load and play a track before seeking.",v=!1,l();return}const n=A(c.textContent??"");if(n===null||Number.isNaN(n)){u.textContent="Invalid time format. Use ss, mm:ss, or hh:mm:ss.",c.textContent=x(i.currentTime);return}const t=Math.min(Math.max(n,0),i.duration);i.currentTime=t,u.textContent=`Seeked to ${x(t)}.`,v=!1,c.blur(),l();return}e.key==="Escape"&&(e.preventDefault(),c.textContent=x(i.currentTime),v=!1,c.blur(),l())});window.addEventListener("beforeunload",()=>{s.forEach(e=>URL.revokeObjectURL(e.url))});l();m();
