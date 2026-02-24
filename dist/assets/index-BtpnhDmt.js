(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const p of a.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&o(p)}).observe(document,{childList:!0,subtree:!0});function n(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=n(i);fetch(i.href,a)}})();const q=document.querySelector("#app");q.innerHTML=`
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
`;const g=document.querySelector("#audio-files"),T=document.querySelector("#play-selected"),$=document.querySelector("#stop-playback"),P=document.querySelector("#clear-queue"),v=document.querySelector("#queue-list"),l=document.querySelector("#status"),y=document.querySelector("#seek-bar"),E=document.querySelector("#current-time"),N=document.querySelector("#total-time"),c=document.querySelector("#seek-time-input"),r=new Audio;let u=[],d=null,m=null,M=1,b=!1;function x(e){if(!Number.isFinite(e)||e<0)return"00:00";const t=Math.floor(e),n=Math.floor(t/3600),o=Math.floor(t%3600/60),i=t%60;return n>0?`${n.toString().padStart(2,"0")}:${o.toString().padStart(2,"0")}:${i.toString().padStart(2,"0")}`:`${o.toString().padStart(2,"0")}:${i.toString().padStart(2,"0")}`}function I(e){const t=e.trim().split("/")[0]?.trim()??"";if(!t)return null;if(/^\d+(\.\d+)?$/.test(t))return Number(t);const n=t.split(":").map(o=>o.trim());if(n.some(o=>o.length===0||Number.isNaN(Number(o))))return null;if(n.length===2){const[o,i]=n.map(Number);return o*60+i}if(n.length===3){const[o,i,a]=n.map(Number);return o*3600+i*60+a}return null}function s(){const e=Number.isFinite(r.duration)&&r.duration>0;if(y.disabled=!e,!e){y.max="0",y.value="0",E.textContent="00:00",N.textContent="00:00",b||(c.textContent="00:00");return}const t=Math.min(Math.max(r.currentTime,0),r.duration);y.max=String(r.duration),y.value=String(t),E.textContent=x(t),N.textContent=x(r.duration),b||(c.textContent=x(t))}function f(){if(v.innerHTML="",u.length===0){v.innerHTML='<li class="empty">Queue is empty. Add audio files to begin.</li>';return}u.forEach((e,t)=>{const n=document.createElement("li"),o=d===e.id,i=m===e.id;n.className=`queue-item${o?" selected":""}${i?" playing":""}`,n.dataset.id=String(e.id);const a=document.createElement("button");a.type="button",a.className="track-title",a.textContent=`${t+1}. ${e.file.name}`,a.addEventListener("click",()=>{d=e.id,L(e.id)});const p=document.createElement("span");p.className="track-meta",p.textContent=`${(e.file.size/(1024*1024)).toFixed(2)} MB`;const S=document.createElement("div");S.className="track-actions";const k=document.createElement("button");k.type="button",k.textContent="Select",k.addEventListener("click",()=>{d=e.id,l.textContent=`Selected: ${e.file.name}`,f()});const h=document.createElement("button");h.type="button",h.className="danger",h.textContent="Remove",h.addEventListener("click",()=>{O(e.id)}),S.append(k,h),n.append(a,p,S),v.append(n)})}function L(e){const t=u.find(n=>n.id===e);if(!t){l.textContent="Track not found.";return}d=e,m=e,r.src=t.url,r.play().then(()=>{l.textContent=`Playing: ${t.file.name}`,s(),f()}).catch(n=>{console.error("Playback failed",n),l.textContent=`Could not play ${t.file.name}`,m=null,f()})}function C(){const e=m;if(r.pause(),r.currentTime=0,m=null,e!==null){const t=u.find(n=>n.id===e);l.textContent=t?`Stopped: ${t.file.name}`:"Playback stopped."}else l.textContent="Playback stopped.";s(),f()}function O(e){const t=u.find(o=>o.id===e);if(!t)return;const n=m===e;URL.revokeObjectURL(t.url),u=u.filter(o=>o.id!==e),d===e&&(d=null),n&&C(),f()}function A(){C(),u.forEach(e=>URL.revokeObjectURL(e.url)),u=[],d=null,r.removeAttribute("src"),r.load(),l.textContent="Queue cleared.",s(),f()}r.addEventListener("ended",()=>{if(m===null)return;const e=u.findIndex(n=>n.id===m),t=u[e+1];if(!t){m=null,l.textContent="Playback finished.",s(),f();return}L(t.id)});r.addEventListener("loadedmetadata",()=>{s()});r.addEventListener("timeupdate",()=>{s()});g.addEventListener("change",()=>{const e=g.files;if(!e||e.length===0)return;const t=Array.from(e).map(n=>({id:M++,file:n,url:URL.createObjectURL(n)}));u=[...u,...t],l.textContent=`${t.length} file(s) added to queue.`,g.value="",f()});T.addEventListener("click",()=>{if(d===null){l.textContent="Select a track first, or click a track title to play.";return}L(d)});$.addEventListener("click",()=>{C()});P.addEventListener("click",()=>{A()});y.addEventListener("input",()=>{if(!Number.isFinite(r.duration)||r.duration<=0)return;const e=Number(y.value);Number.isNaN(e)||(r.currentTime=Math.min(Math.max(e,0),r.duration),s())});c.addEventListener("focus",()=>{b=!0,c.textContent=x(r.currentTime)});c.addEventListener("blur",()=>{b=!1,s()});c.addEventListener("keydown",e=>{if(e.key==="Enter"){if(e.preventDefault(),!Number.isFinite(r.duration)||r.duration<=0){l.textContent="Load and play a track before seeking.",b=!1,s();return}const t=I(c.textContent??"");if(t===null||Number.isNaN(t)){l.textContent="Invalid time format. Use ss, mm:ss, or hh:mm:ss.",c.textContent=x(r.currentTime);return}const n=Math.min(Math.max(t,0),r.duration);r.currentTime=n,l.textContent=`Seeked to ${x(n)}.`,b=!1,c.blur(),s();return}e.key==="Escape"&&(e.preventDefault(),c.textContent=x(r.currentTime),b=!1,c.blur(),s())});window.addEventListener("beforeunload",()=>{u.forEach(e=>URL.revokeObjectURL(e.url))});s();f();
