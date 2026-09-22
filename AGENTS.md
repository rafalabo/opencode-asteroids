# AGENTS.md

Zero-dependency HTML5 Canvas game. No bundler, package manager, tests, lint, or CI.

## Structure

- `index.html` — canvas `800x600`, loads `game.js`. No build step.
- `game.js` (~420 lines, `'use strict'`, ES6 classes) — all logic: `Ship`, `Asteroid`, `Bullet`, `Particle`, `update`/`draw`/`loop`.
- `favicon.svg` — static only.

## Run

Open `index.html` directly in a browser, or `npx serve .` → `http://localhost:3000`. No install step. Verify changes by playing in browser (arrows + Space).

## Gotchas

- Canvas size lives in two places: `width`/`height` attrs in `index.html` and `W`/`H` consts in `game.js`. Keep in sync.
- Input uses `e.code` (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`), not `e.key`. Arrows are level-triggered via `keys[]`; shooting is edge-triggered via `justPressed[]` consumed once by `pressed()` — calling `pressed('Space')` twice per frame drops the event.
- Tuning tables `RADII`/`SPEEDS`/`POINTS` are indexed by size `1–3` with a dummy `0` slot (large=3 → small=1). `split()` spawns 2× `size-1`, nothing at size 1.
- Ship collision uses `a.radius * 0.82` (forgiving), bullets use full `a.radius`. Respawn invincibility is 3s with blink.
- States: `playing` | `dead` (2s timer, then `ship.reset()`) | `gameover` (Space → `initGame()`). `dt` clamped to `0.05`.
- Screen wrap is toroidal via `wrap()`; asteroid spawn keeps `SAFE_DIST = 130` from center.
