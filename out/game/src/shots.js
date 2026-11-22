// The screenshot scenes behind ?shot=start|play|alarm|getaway. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (follow waypoints, sneak near a watcher, wait
// while a cone covers the next leg, stand still to pick the vault lock), so
// the frame is what a short game really looks like and the same seed always
// gives the same frame.

import { STEP } from './config.js';
import { PHASE_PLAY, PHASE_WON, startRun, stepWorld } from './world.js';
import { SCREEN_END, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { distance, hasLineOfSight, insideCone } from './geometry.js';
import { CAMERA, GUARD, VAULT } from './config.js';

const PLAY_SECONDS = 12;
const ALARM_SECONDS = 8;
const GETAWAY_LIMIT_SECONDS = 75;

/** Is (x,y) watched right now by any guard or camera with a clear sightline? */
function watched(state, x, y) {
  const blockers = [...state.level.walls, ...state.level.covers];
  if (!state.vaultOpen) blockers.push(state.level.vaultDoor);
  for (const guard of state.guards) {
    if (guard.mode === 'chase') continue;
    if (
      insideCone(guard.x, guard.y, guard.angle, GUARD.visionRange, GUARD.visionHalfAngle, x, y) &&
      hasLineOfSight(guard.x, guard.y, x, y, blockers, state.smokes)
    ) {
      return true;
    }
  }
  for (const camera of state.cameras) {
    if (
      insideCone(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle, x, y) &&
      hasLineOfSight(camera.x, camera.y, x, y, blockers, state.smokes)
    ) {
      return true;
    }
  }
  return false;
}

/** One autopilot step: steer toward the current waypoint, or wait it out. */
function autopilotInput(state, waypoints, index, reckless) {
  const p = state.player;
  const target = waypoints[index];
  if (!target) return { mx: 0, my: 0, sneak: true, smoke: false, coinX: null, coinY: null };
  const nearGuard = state.guards.some((g) => distance(g.x, g.y, p.x, p.y) < 280);
  // A guard is closing in to investigate: burn a smoke bomb and keep moving —
  // never stand still while one walks toward you, not even at the vault door.
  // One cloud at a time: a second bomb while one still hangs is wasted.
  const closingIn = state.guards.some(
    (g) => (g.mode === 'chase' || g.mode === 'investigate') && distance(g.x, g.y, p.x, p.y) < 220,
  );
  const smoke = !reckless && closingIn && state.smokeLeft > 0 && state.smokes.length === 0;
  // Standing at the vault door: hold still until the lock gives. Only once
  // actually within lockpick reach — holding a step too far out stands the
  // thief still in the open while a guard closes in.
  const door = state.level.vaultDoor;
  const atDoor =
    distance(p.x, p.y, door.x + door.w / 2, door.y + door.h / 2) < VAULT.pickRange;
  if (target.hold === 'vault' && !state.vaultOpen && atDoor) {
    return { mx: 0, my: 0, sneak: true, smoke, coinX: null, coinY: null };
  }
  // A cone covers the next leg: wait, crouched, until it sweeps past. There
  // is no time cap on the wait: pushing blindly into a guard's cone gets the
  // thief caught, and the smoke rule below is what breaks a wait that never
  // clears. Never wait while the thief is watched themselves: standing in a
  // cone only lets the camera call a guard over. A closing guard cancels the
  // wait too: move, under smoke.
  const midX = (p.x + target.x) / 2;
  const midY = (p.y + target.y) / 2;
  const watchedNow = watched(state, p.x, p.y);
  const shouldWait =
    !reckless &&
    !watchedNow &&
    !closingIn &&
    (watched(state, midX, midY) || watched(state, target.x, target.y));
  if (shouldWait) {
    // A watched leg with no way through: burn a smoke bomb and push through
    // under it, instead of waiting for a sweep that never clears.
    if (state.smokeLeft > 0 && state.smokes.length === 0) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      return { mx: dx / d, my: dy / d, sneak: true, smoke: true, coinX: null, coinY: null };
    }
    return { mx: 0, my: 0, sneak: true, smoke: false, coinX: null, coinY: null };
  }
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  // Stop only inside the waypoint's own radius, or a tight waypoint like the
  // diamond's is never actually reached: the pilot stops 13 px short of it
  // while the scene still waits for 4.
  if (d < (target.radius ?? 14)) return { mx: 0, my: 0, sneak: true, smoke, coinX: null, coinY: null };
  return { mx: dx / d, my: dy / d, sneak: !reckless && nearGuard, smoke, coinX: null, coinY: null };
}

function runAutopilot(world, waypoints, seconds, reckless = false) {
  const state = world.state;
  startRun(world);
  let index = 0;
  let dwellLeft = 0;
  let dwellIndex = -1;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.phase !== PHASE_PLAY) break;
    const target = waypoints[index];
    // A waypoint with a dwell: stand in the open there for a while, so a
    // camera or a guard has time to make the thief — the alarm scene's job.
    if (
      target &&
      target.dwell &&
      dwellIndex !== index &&
      distance(state.player.x, state.player.y, target.x, target.y) < (target.radius ?? 16)
    ) {
      dwellLeft = target.dwell;
      dwellIndex = index;
    }
    let input;
    if (dwellLeft > 0) {
      input = { mx: 0, my: 0, sneak: false, smoke: false, coinX: null, coinY: null };
      dwellLeft -= STEP;
    } else {
      input = autopilotInput(state, waypoints, index, reckless);
    }
    stepWorld(world, input);
    const current = waypoints[index];
    // Most waypoints count from 16 px out; the diamond sits behind its
    // pedestal, so that one only counts pressed right up against it.
    const reach = current ? current.radius ?? 16 : 16;
    if (current && dwellLeft <= 0 && distance(state.player.x, state.player.y, current.x, current.y) < reach) {
      index += 1;
    }
  }
  return state;
}

const PLAY_PATH = [
  { x: 200, y: 560 },
  { x: 250, y: 420 },
  { x: 340, y: 340 },
  { x: 430, y: 340 },
  { x: 450, y: 60 },
  { x: 640, y: 60 },
  { x: 700, y: 200 },
];

const ALARM_PATH = [
  { x: 250, y: 420 },
  { x: 430, y: 340 },
  { x: 640, y: 150, dwell: 5 },
];

const GETAWAY_PATH = [
  { x: 200, y: 560 },
  { x: 250, y: 420 },
  { x: 340, y: 340 },
  { x: 430, y: 340 },
  { x: 450, y: 60 },
  { x: 640, y: 60 },
  { x: 830, y: 60 },
  { x: 890, y: 180, hold: 'vault' },
  { x: 1000, y: 170 },
  { x: 1051, y: 170, radius: 4 },
  { x: 1000, y: 80 },
  { x: 960, y: 420 },
  { x: 700, y: 420 },
  { x: 600, y: 500 },
  { x: 300, y: 520 },
  { x: 130, y: 670 },
];

/**
 * Stage one scene and return the screen to paint. The world is simulated for
 * real; the title scene just leaves the museum at rest behind its overlay.
 */
export function stageShot(name, world) {
  if (name === 'start') {
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    runAutopilot(world, PLAY_PATH, PLAY_SECONDS);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    // Reckless: no waiting, no sneaking — the thief walks straight through
    // the gallery and gets made, so the frame shows a chase and a hot alarm.
    runAutopilot(world, ALARM_PATH, ALARM_SECONDS, true);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'getaway') {
    const state = runAutopilot(world, GETAWAY_PATH, GETAWAY_LIMIT_SECONDS);
    return { screen: state.phase === PHASE_WON ? SCREEN_END : SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}
