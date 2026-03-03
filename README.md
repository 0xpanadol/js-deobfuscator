# js-deobfuscator

A browser-based JavaScript deobfuscator. Paste obfuscated code, hit run, get readable output. No server, no uploads, everything runs locally in your browser.

![screenshot](https://raw.githubusercontent.com/0xpanadol/js-deobfuscator/main/screenshot.png)

## Why?

Most deobfuscation tools are either CLI-only, outdated, or require you to install a bunch of stuff. I wanted something I could just open in a tab and use. So I built this.

It handles the common obfuscation patterns you'll run into: string array rotation, control flow flattening, dead code injection, decoder wrappers, and more. Based on the [deob](https://github.com/nicedayzhu/deob) engine under the hood.

## Features

- Monaco editor for both input and output (syntax highlighting, word wrap, the works)
- AST tree viewer to inspect the parsed output
- Multi-pass deobfuscation for heavily obfuscated code
- Configurable decoder location method (string array, call count, eval code injection)
- Variable name optimization (hex, short, custom regex)
- Keyword marking to highlight specific tokens in the output
- Drag & drop `.js` / `.txt` files
- Dark mode
- Works on mobile (layout stacks vertically)
- Runs entirely client-side via Web Workers
- Installable as a PWA

## Getting started

```bash
git clone https://github.com/0xpanadol/js-deobfuscator.git
cd js-deobfuscator
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Building for production

```bash
npm run build
```

Output goes to `dist/`. You can serve it with any static file server or just open `index.html` directly.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Run deobfuscation |
| `Ctrl+S` | Download output |
| `Ctrl+Shift+C` | Copy output to clipboard |

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Monaco Editor
- Zustand for state
- Allotment for split panes
- Web Workers for off-thread deobfuscation

## How it works

The deobfuscation engine (from the `deob` package) uses Babel to parse the input into an AST, then runs a series of transforms: resolving string arrays, inlining decoder calls, simplifying control flow, removing dead code, etc. All of this happens in a Web Worker so the UI stays responsive.

The browser sandbox uses indirect `eval()` for runtime evaluation when the decoder needs to actually execute code to resolve strings. This is the tradeoff for running entirely client-side.

## License

MIT
