[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/tamadung/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/tamadung/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# Midnight at the Meridian — a museum heist

A top-down 2D heist game that runs offline in a desktop browser from static
files. One thief crosses the Meridian Museum at night — atrium, gallery,
vault — past three patrolling guards with vision cones and two sweeping
security cameras, pocketing paintings, gold bars and the Star Diamond, then
slips out to the getaway van before dawn.

## How to play

- **WASD / arrows** — move. **Shift** — sneak (slower, harder to spot).
- **F** — smoke bomb (×2): blocks every vision cone for a few seconds.
- **Q or click** — toss a coin: the nearest guard leaves its patrol to look.
- Stand at the gold vault door to pick its lock, then take the Star Diamond.
- Pocket **$3,000** of loot, then reach the green getaway-van door.
- The **alarm meter** rises while a guard chases you or a camera holds you in
  its cone. At 100% the museum locks down. Getting caught ends the run.

## Play it

```sh
node serve.ts   # http://localhost:8080
```

No build step, no network, no libraries: vanilla canvas 2D in `game/`.

## Layout

- `game/index.html` — page shell, canvas, status line.
- `game/src/main.js` — boot, fixed-step loop, screens, screenshot mode.
- `game/src/world.js` — simulation: guards, cameras, alarm, loot, tools.
- `game/src/level.js` — the museum: rooms, walls, cover, loot, patrols.
- `game/src/render.js` — canvas drawing: cones, HUD, title and end screens.
- `game/src/geometry.js` — segments, cones, line of sight.
- `game/src/config.js` — every tuning number and colour.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/random.js` — seeded generator for reproducible scenes.
- `game/src/shots.js` — staged screenshot scenes (`?shot=play|alarm|getaway`).
- `main.ts` — hands the entry in: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`.

## Screenshots

`?shot=start` title, `?shot=play` mid-heist, `?shot=alarm` a camera
spotting the thief, `?shot=getaway` the clean getaway — all rendered by the
game's own code in a headless browser.

## License

MIT — see `LICENSE`.
