# Architecture Guide (AI-Friendly)

This project is organized for small, focused edit surfaces so both humans and AI tools can make safer changes.

## Directory Map

```text
src/
  app/
    config.ts                    # global constants
  controllers/
    app-controller.ts            # state orchestration/composition root
    playback-controller.ts       # audio + timeline event wiring
    queue-controller.ts          # file/folder/help/drop interactions
    shortcuts-controller.ts      # keyboard shortcuts wiring
  domain/
    types.ts                     # shared interfaces
    queue-model.ts               # pure queue/folder operations
  services/
    persistence/
      queue-storage.ts           # IndexedDB load/save/clear
  ui/
    layout/
      app-shell.ts               # static app HTML shell
    queue/
      queue-view.ts              # queue/folder rendering + row UI events
  utils/
    time.ts                      # format/parse time helpers
    guards.ts                    # file guards
  styles/
    *.css                        # split style modules
  style.css                      # style aggregator imports
  main.ts                        # app entrypoint
```

## Dependency Direction

- `controllers` may depend on `domain`, `services`, `ui`, `utils`.
- `domain` is pure logic and should not touch DOM or IndexedDB.
- `ui` renders and emits callbacks, but should not own application state.
- `services` handle external APIs/storage only.

## Where to Edit

- Queue mutation behavior: `src/domain/queue-model.ts`
- Persistence behavior: `src/services/persistence/queue-storage.ts`
- Keyboard shortcuts: `src/controllers/shortcuts-controller.ts`
- Playback/timeline wiring: `src/controllers/playback-controller.ts`
- Queue/folder rendering: `src/ui/queue/queue-view.ts`
- Layout markup: `src/ui/layout/app-shell.ts`
- Theme/layout styles: `src/styles/*.css`

## Conventions

- Keep functions small and single-purpose.
- Prefer pure functions in `domain/`.
- Keep side effects in controllers/services.
- When adding features, wire via callbacks instead of hard-coding cross-module dependencies.
