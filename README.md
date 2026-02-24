# JPG Audio Queue Player

A Vite + TypeScript web app for organizing and playing local audio files with folder-based queues.

## Features

- **Folder-based queue** (accordion style)
  - Create folders (ex: Act I, Act II)
  - Expand/collapse folders
  - Inline folder rename via **double-click**
- **Track management**
  - Add multiple audio files
  - Drag/drop reorder within and across folders
  - Remove tracks with confirmation
  - Clear queue with confirmation
- **Playback controls**
  - Play/Pause toggle and Stop
  - Seek bar with buffered indicator
  - Editable seek timestamp (`mm:ss` / `hh:mm:ss` / seconds)
  - Volume slider
  - Now Playing indicator
- **Keyboard shortcuts**
  - `↑ / ↓`: Select previous/next visible track
  - `⌘/Ctrl + ↑ / ↓`: Move selected track
  - `Space`: Play/Pause
  - `Esc`: Stop (or close help modal)
  - `?`: Open help modal
- **Persistence (IndexedDB)**
  - Saves folders, queue order, and audio files locally
  - Restores queue on refresh
  - Includes **Reset Local Storage** action in Help modal
- **Mobile UX updates**
  - Sticky bottom player controls
  - Larger touch targets
  - Tap track row to play immediately
  - Drop zone hidden on mobile

## Tech Stack

- TypeScript (strict)
- Vite
- Bun
- Vanilla HTML/CSS

## Scripts

```bash
bun run dev      # Start dev server
bun run build    # Type-check + production build
bun run preview  # Preview production build
```

## Project Structure

```text
.
├── src/
│   ├── index.html
│   ├── main.ts
│   ├── style.css
│   ├── favicon.ico
│   └── public/
│       └── favicon.ico
├── README.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Notes

- Audio files are local to your browser storage and origin.
- If storage becomes invalid/corrupted, use the Help modal’s **Reset Local Storage** button.
