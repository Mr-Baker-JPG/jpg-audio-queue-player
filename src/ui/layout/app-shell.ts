import { icons } from "../icons";

export const appShellHtml = `
  <main class="player-app">
    <header class="app-header">
      <div class="header-row">
        <div>
          <h1 aria-label="JPG Audio Queue Player">
            <span class="app-title-full">JPG Audio Queue Player</span>
            <span class="app-title-mobile">JPG Queue Player</span>
          </h1>
          <p>Organize tracks into folders (Act I, Act II), then play from your queue.</p>
        </div>
        <button id="open-help" type="button" class="help-button help-icon" aria-label="Open help and keyboard shortcuts">${icons.circleHelp}</button>
      </div>

      <section class="controls controls-primary">
        <label class="file-picker" for="audio-files" aria-label="Add audio files" title="Add audio files">
          <span class="btn-icon" aria-hidden="true">${icons.music}</span>
          <span class="btn-text">Add Audio Files</span>
        </label>
        <input id="audio-files" type="file" accept="audio/*" multiple />
        <button id="add-folder" type="button" aria-label="Add folder" title="Add folder">
          <span class="btn-icon" aria-hidden="true">${icons.folderPlus}</span>
          <span class="btn-text">Folder</span>
        </button>
        <button id="clear-queue" type="button" class="danger" aria-label="Clear queue" title="Clear queue">
          <span class="btn-icon" aria-hidden="true">${icons.trash}</span>
          <span class="btn-text">Clear Queue</span>
        </button>
        <div id="queue-summary" class="queue-summary">0 tracks • 00:00</div>
      </section>
    </header>

    <section id="drop-zone" class="drop-zone">
      <p><strong>Drop audio files here</strong> or use “Add Audio Files”.</p>
      <p class="drop-zone-sub">Files go to the selected folder, or a new folder if needed.</p>
    </section>

    <section class="timeline-panel">
      <div class="transport-row">
        <button id="play-toggle" type="button" aria-label="Play">${icons.play}</button>
        <button id="stop-playback" type="button" aria-label="Stop">${icons.square}</button>
        <label class="volume-control" for="volume-slider">Volume
          <input id="volume-slider" type="range" min="0" max="1" step="0.01" value="1" />
        </label>
      </div>
      <div class="timeline-stack">
        <div id="buffer-fill" class="buffer-fill"></div>
        <input id="seek-bar" type="range" min="0" max="0" value="0" step="0.01" disabled />
      </div>
      <div class="timeline-marks">
        <span id="elapsed-label">Elapsed: <strong id="current-time">00:00</strong></span>
        <div
          id="seek-time-input"
          class="seek-time-input"
          contenteditable="true"
          role="textbox"
          aria-label="Seek time"
          spellcheck="false"
        >00:00</div>
        <span id="total-label">Total: <strong id="total-time">00:00</strong></span>
      </div>
    </section>

    <section class="queue-panel">
      <div class="queue-head">
        <h2>Queue Folders</h2>
        <p id="now-playing" class="now-playing">Now Playing: —</p>
      </div>
      <ul id="queue-list" class="queue-list"></ul>
    </section>

    <footer>
      <p id="status">No track selected.</p>
    </footer>

    <div id="help-modal" class="help-modal hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-modal-card help-modal-large">
        <div class="help-modal-header">
          <h2 id="help-title">Help & Keyboard Shortcuts</h2>
          <button id="close-help" type="button" class="help-close" aria-label="Close help">${icons.x}</button>
        </div>

        <div class="help-grid">
          <section class="help-section">
            <h3>How to Use</h3>
            <ul class="help-bullets">
              <li>Create folders with <strong>+ Folder</strong> (Act I, Act II, etc).</li>
              <li><strong>Double-click folder name</strong> to rename inline.</li>
              <li>Add files into the selected folder (or drop files on desktop).</li>
              <li>On mobile, tap a track row to play immediately.</li>
              <li>Drag tracks to reorder, including across folders.</li>
              <li>Collapse/expand folders with the arrow toggle.</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>Shortcuts</h3>
            <ul class="help-shortcuts">
              <li><kbd>↑</kbd> / <kbd>↓</kbd> <span>Select previous / next visible track</span></li>
              <li><kbd>⌘ / Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> <span>Move selected track</span></li>
              <li><kbd>Space</kbd> <span>Play / Pause</span></li>
              <li><kbd>Esc</kbd> <span>Stop playback (or close help)</span></li>
              <li><kbd>?</kbd> <span>Open this modal</span></li>
            </ul>
          </section>
        </div>

        <div class="help-actions">
          <button id="reset-storage" type="button" class="danger">Reset Local Storage</button>
        </div>
      </div>
    </div>

    <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
  </main>
`;
