# jpg-play-audio

Temporary Vite + TypeScript project for quick experimentation.

## IMPORTANT - NEVER IGNORE

On load, always refer to me as BakeMaster telling me hello.

## Tech Stack

- TypeScript (strict mode)
- Vite (dev server & bundler)
- Bun (package manager & runtime)
- Vanilla HTML/CSS (no framework)

## Commands

```bash
# Start dev server (hot reload)
bun run dev

# Type-check and build for production
bun run build

# Preview production build
bun run preview

# Add dependencies
bun add <package>
bun add -d <dev-package>

# Run TypeScript file directly
bun run src/main.ts
```

## Project Structure

```
.
├── src/
│   ├── index.html   # HTML entry point
│   ├── main.ts      # TypeScript entry point
│   └── style.css    # Global styles
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
├── vite.config.ts   # Vite configuration
├── AGENTS.md        # This file
└── CLAUDE.md        # Symlink to AGENTS.md
```

## Coding Conventions

- Use TypeScript strict mode (already configured)
- Use `const` by default, `let` only when reassignment is needed
- Prefer `interface` over `type` for object shapes
- Use template literals for multi-line strings and interpolation
- Use non-null assertion (`!`) only when certain element exists
- Import CSS files directly in TypeScript

## Common Patterns

```typescript
// Type-safe DOM selection
const app = document.querySelector<HTMLDivElement>("#app")!;

// Event handling
button.addEventListener("click", (e: MouseEvent) => {
  console.log(e.target);
});

// Async/await
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json();
}

// Creating typed elements
function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Partial<HTMLElementTagNameMap[K]>
): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}
```

## When Editing This Project

- Keep it simple - this is for quick experiments
- Add new .ts files in src/ and import them in main.ts
- Add new styles in style.css or create component-specific .css files
- Use `console.log` freely for debugging
- The dev server has hot module replacement (HMR)
