// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and end.
//
// ?seed=N fixes the patrol phases. ?shot=start|play|alarm|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_PLAY, resetWorld, startRun, stepWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_END, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best haul lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function describe() {
    const s = world.state;
    if (screen === SCREEN_TITLE) return 'Midnight at the Meridian: press Space to start the heist.';
    if (screen === SCREEN_PAUSED) return 'Paused.';
    if (screen === SCREEN_END) {
      return s.phase === PHASE_WON
        ? `Clean getaway with $${s.lootValue}.`
        : `Caught. Loot kept $${s.lootValue}.`;
    }
    return `Loot $${s.lootValue}, alarm ${Math.round(s.alarm)} percent, ${Math.floor(s.timeLeft)} seconds left.`;
  }

  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const raw = input.read();
    const scaleX = FIELD.width / canvas.clientWidth;
    const scaleY = FIELD.height / canvas.clientHeight;
    const coin = raw.coin ? { x: raw.coin.x * scaleX, y: raw.coin.y * scaleY } : null;

    if (raw.confirm) {
      if (screen === SCREEN_TITLE) {
        resetWorld(world);
        startRun(world);
        screen = SCREEN_PLAY;
      } else if (screen === SCREEN_END) {
        resetWorld(world);
        screen = SCREEN_TITLE;
      }
    }
    if (raw.pause && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepWorld(world, {
          mx: raw.mx,
          my: raw.my,
          sneak: raw.sneak,
          smoke: raw.smoke,
          coinX: coin ? coin.x : null,
          coinY: coin ? coin.y : null,
        });
        accumulator -= STEP;
        if (world.state.phase !== PHASE_PLAY) break;
      }
      if (world.state.phase !== PHASE_PLAY) {
        screen = SCREEN_END;
        if (world.state.phase === PHASE_WON && world.state.lootValue > best) {
          best = world.state.lootValue;
          saveBest(best);
        }
      }
    }

    renderer.draw(world.state, screen);
    status.textContent = describe();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
