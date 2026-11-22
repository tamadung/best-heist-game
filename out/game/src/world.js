// The heist itself: movement and collision, guard patrols with suspicion,
// sweeping cameras, the alarm meter, loot, lockpicking, smoke and coin tools,
// and the win and lose conditions. Pure simulation, no drawing here.

import { ALARM, CAMERA, FIELD, GUARD, LOOT_TARGET, PLAYER, STEP, TIME_LIMIT, TOOL, VAULT } from './config.js';
import { buildLevel } from './level.js';
import { clamp, distance, hasLineOfSight, insideCone, pointInRect } from './geometry.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_CAUGHT = 'caught';
export const PHASE_LOCKDOWN = 'lockdown';
export const PHASE_TIMEOUT = 'timeout';

export const EVENT_PICKUP = 'pickup';
export const EVENT_SPOTTED = 'spotted';
export const EVENT_CAUGHT = 'caught';
export const EVENT_VAULT = 'vault';
export const EVENT_WIN = 'win';

function pushOutOfRect(entity, rect, radius) {
  const cx = clamp(entity.x, rect.x, rect.x + rect.w);
  const cy = clamp(entity.y, rect.y, rect.y + rect.h);
  const dx = entity.x - cx;
  const dy = entity.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return;
  if (d2 === 0) {
    entity.y = rect.y - radius;
    return;
  }
  const d = Math.sqrt(d2);
  entity.x = cx + (dx / d) * radius;
  entity.y = cy + (dy / d) * radius;
}

function pushOutOfCircle(entity, circle, radius) {
  const d = distance(entity.x, entity.y, circle.x, circle.y);
  const min = radius + circle.r;
  if (d >= min || d === 0) return;
  entity.x = circle.x + ((entity.x - circle.x) / d) * min;
  entity.y = circle.y + ((entity.y - circle.y) / d) * min;
}

export function createWorld(random) {
  const level = buildLevel(random);
  const state = {
    phase: PHASE_TITLE,
    time: 0,
    timeLeft: TIME_LIMIT,
    lootValue: 0,
    lootTaken: 0,
    alarm: 0,
    vaultOpen: false,
    pickProgress: 0,
    smokeLeft: TOOL.smokeCount,
    coinLeft: TOOL.coinCount,
    message: '',
    messageTtl: 0,
    endReason: '',
    level,
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      angle: -Math.PI / 2,
      sneak: false,
      moving: false,
    },
    guards: level.guards.map((g) => {
      const start = g.waypoints[0];
      const next = g.waypoints[g.waypoint];
      return {
        ...g,
        x: start.x,
        y: start.y,
        angle: Math.atan2(next.y - start.y, next.x - start.x),
        suspicion: 0,
        mode: 'patrol',
        lastSeenX: 0,
        lastSeenY: 0,
        loseTimer: 0,
        scanTimer: 0,
        investigateX: 0,
        investigateY: 0,
        investigateTtl: 0,
      };
    }),
    cameras: level.cameras.map((c) => ({ ...c, angle: c.restAngle, spotting: false })),
    smokes: [],
    coins: [],
  };
  return { state, random };
}

function blockersOf(state) {
  const list = [...state.level.walls, ...state.level.covers];
  if (!state.vaultOpen) list.push(state.level.vaultDoor);
  return list;
}

function collide(state, entity, radius) {
  const blockers = blockersOf(state);
  for (const rect of blockers) pushOutOfRect(entity, rect, radius);
  for (const statue of state.level.statues) pushOutOfCircle(entity, statue, radius);
  entity.x = clamp(entity.x, 16 + radius, FIELD.width - 16 - radius);
  entity.y = clamp(entity.y, 16 + radius, FIELD.height - 16 - radius);
}

function guardSeesPlayer(state, guard) {
  const p = state.player;
  if (!insideCone(guard.x, guard.y, guard.angle, GUARD.visionRange, GUARD.visionHalfAngle, p.x, p.y)) {
    return 0;
  }
  if (!hasLineOfSight(guard.x, guard.y, p.x, p.y, blockersOf(state), state.smokes)) return 0;
  const d = distance(guard.x, guard.y, p.x, p.y);
  return 1 - (d / GUARD.visionRange) * 0.6;
}

function moveToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  entity.x += (dx / d) * step;
  entity.y += (dy / d) * step;
  entity.angle = Math.atan2(dy, dx);
  return d <= speed * dt + 0.5;
}

function say(state, text) {
  state.message = text;
  state.messageTtl = 2.6;
}

function endPhase(state, phase, reason) {
  state.phase = phase;
  state.endReason = reason;
}

/** One fixed simulation step. Input: {mx, my, sneak, smoke, coinX, coinY}. Returns events. */
export function stepWorld(world, input) {
  const state = world.state;
  const events = [];
  if (state.phase !== PHASE_PLAY) return events;
  const dt = STEP;
  state.time += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endPhase(state, PHASE_TIMEOUT, 'Dawn broke over the Meridian. The crew left without you.');
    return events;
  }
  if (state.messageTtl > 0) state.messageTtl -= dt;

  const p = state.player;
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(input.mx, input.my);
  p.moving = len > 0.1;
  p.sneak = input.sneak;
  if (p.moving) {
    const nx = input.mx / Math.max(1, len);
    const ny = input.my / Math.max(1, len);
    p.x += nx * speed * dt;
    p.y += ny * speed * dt;
    p.angle = Math.atan2(ny, nx);
  }
  collide(state, p, PLAYER.radius);

  // Tools: smoke hides, a tossed coin pulls a guard off its route.
  if (input.smoke && state.smokeLeft > 0) {
    state.smokeLeft -= 1;
    state.smokes.push({ x: p.x, y: p.y, radius: TOOL.smokeRadius, ttl: TOOL.smokeSeconds });
    say(state, 'Smoke out — their cones cannot see through it.');
  }
  if (input.coinX !== null && input.coinX !== undefined && state.coinLeft > 0) {
    state.coinLeft -= 1;
    const dx = input.coinX - p.x;
    const dy = input.coinY - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const fly = Math.min(d, TOOL.coinThrow);
    const lx = p.x + (dx / d) * fly;
    const ly = p.y + (dy / d) * fly;
    state.coins.push({ x: lx, y: ly, ttl: 6 });
    for (const guard of state.guards) {
      if (guard.mode === 'chase') continue;
      if (distance(guard.x, guard.y, lx, ly) < TOOL.coinHearRange) {
        guard.mode = 'investigate';
        guard.investigateX = lx;
        guard.investigateY = ly;
        guard.scanTimer = 0;
        guard.investigateTtl = 6;
      }
    }
    say(state, 'Coin tossed — a guard went to look.');
  }
  for (const smoke of state.smokes) smoke.ttl -= dt;
  state.smokes = state.smokes.filter((s) => s.ttl > 0);
  for (const coin of state.coins) coin.ttl -= dt;
  state.coins = state.coins.filter((c) => c.ttl > 0);

  // The vault door: stand close and pick the lock.
  const door = state.level.vaultDoor;
  const doorCx = door.x + door.w / 2;
  const doorCy = door.y + door.h / 2;
  if (!state.vaultOpen) {
    if (distance(p.x, p.y, doorCx, doorCy) < VAULT.pickRange) {
      state.pickProgress += dt;
      if (state.pickProgress >= VAULT.pickSeconds) {
        state.vaultOpen = true;
        events.push({ type: EVENT_VAULT });
        say(state, 'Vault door open — the Star Diamond is yours to take.');
      }
    } else {
      state.pickProgress = Math.max(0, state.pickProgress - dt * 2);
    }
  }

  // Loot: walk over it to pocket it. The diamond sits on a pedestal, so it
  // is reached from a little further out than the paintings and gold.
  for (const item of state.level.loot) {
    if (item.taken) continue;
    const reach = item.kind === 'diamond' ? 46 : 30;
    if (distance(p.x, p.y, item.x, item.y) < reach) {
      item.taken = true;
      state.lootValue += item.value;
      state.lootTaken += 1;
      events.push({ type: EVENT_PICKUP, item });
      say(state, `${item.label} pocketed — +$${item.value.toLocaleString('en-US')}.`);
    }
  }

  // Guards: patrol, grow suspicious, chase, investigate, give up.
  let anyChase = false;
  for (const guard of state.guards) {
    const seen = guardSeesPlayer(state, guard);
    if (seen > 0) {
      const rate = GUARD.spotRate * seen * (p.sneak ? PLAYER.sneakStealth : 1);
      guard.suspicion = clamp(guard.suspicion + rate * dt, 0, 100);
      guard.lastSeenX = p.x;
      guard.lastSeenY = p.y;
      guard.loseTimer = 0;
      if (guard.suspicion >= GUARD.chaseAt && guard.mode !== 'chase') {
        guard.mode = 'chase';
        events.push({ type: EVENT_SPOTTED, guard });
        say(state, `${guard.name} spotted you — run!`);
      }
    } else {
      guard.suspicion = clamp(guard.suspicion - GUARD.decayRate * dt, 0, 100);
      if (p.moving && !p.sneak && distance(guard.x, guard.y, p.x, p.y) < GUARD.hearRange) {
        guard.suspicion = clamp(guard.suspicion + GUARD.hearRate * dt, 0, 100);
      }
    }

    if (guard.mode === 'patrol') {
      const target = guard.waypoints[guard.waypoint];
      if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt)) {
        guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
      }
    } else if (guard.mode === 'chase') {
      anyChase = true;
      if (seen > 0) {
        moveToward(guard, p.x, p.y, GUARD.chaseSpeed, dt);
      } else {
        guard.loseTimer += dt;
        moveToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD.chaseSpeed, dt);
        if (guard.loseTimer >= GUARD.loseSightAfter) {
          guard.mode = 'patrol';
          guard.suspicion = 40;
        }
      }
      if (distance(guard.x, guard.y, p.x, p.y) < GUARD.radius + PLAYER.radius + 2) {
        endPhase(state, PHASE_CAUGHT, `${guard.name} caught you in the gallery.`);
        events.push({ type: EVENT_CAUGHT, guard });
        return events;
      }
    } else if (guard.mode === 'investigate') {
      // A point across a wall can never be reached: give up after a while
      // and go back to the patrol, instead of leaning on the wall forever.
      guard.investigateTtl -= dt;
      if (guard.investigateTtl <= 0) {
        guard.mode = 'patrol';
      } else if (moveToward(guard, guard.investigateX, guard.investigateY, GUARD.patrolSpeed * 1.4, dt)) {
        guard.scanTimer += dt;
        guard.angle += dt * 2.4;
        if (guard.scanTimer > 1.6) guard.mode = 'patrol';
      }
    }
    collide(state, guard, GUARD.radius);
  }

  // Cameras: sweep, and a held sighting feeds the alarm and tips off a guard.
  for (const camera of state.cameras) {
    camera.angle =
      camera.restAngle +
      CAMERA.sweep * Math.sin((2 * Math.PI * state.time) / CAMERA.sweepPeriod + camera.phase * Math.PI * 2);
    const sees =
      insideCone(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle, p.x, p.y) &&
      hasLineOfSight(camera.x, camera.y, p.x, p.y, blockersOf(state), state.smokes);
    camera.spotting = sees;
    if (sees) {
      state.alarm = clamp(state.alarm + CAMERA.alarmRate * dt, 0, ALARM.lockdown);
      let nearest = null;
      let best = Infinity;
      for (const guard of state.guards) {
        const d = distance(guard.x, guard.y, p.x, p.y);
        if (d < best) {
          best = d;
          nearest = guard;
        }
      }
      if (nearest && nearest.mode === 'patrol') {
        nearest.mode = 'investigate';
        nearest.investigateX = p.x;
        nearest.investigateY = p.y;
        nearest.scanTimer = 0;
        nearest.investigateTtl = 6;
        nearest.suspicion = Math.max(nearest.suspicion, 55);
      }
    }
  }

  // The alarm: chases push it up, silence cools it, full means lockdown.
  if (anyChase) state.alarm = clamp(state.alarm + ALARM.chaseRate * dt, 0, ALARM.lockdown);
  else state.alarm = clamp(state.alarm - ALARM.decayRate * dt, 0, ALARM.lockdown);
  if (state.alarm >= ALARM.lockdown) {
    endPhase(state, PHASE_LOCKDOWN, 'The alarm hit full — the museum locked down around you.');
    return events;
  }

  // The getaway: reach the van door with the target haul.
  const exit = state.level.exit;
  if (state.lootValue >= LOOT_TARGET && pointInRect(p.x, p.y, exit)) {
    endPhase(state, PHASE_WON, '');
    events.push({ type: EVENT_WIN });
  }
  return events;
}

export function startRun(world) {
  world.state.phase = PHASE_PLAY;
}

export function resetWorld(world) {
  const fresh = createWorld(world.random);
  world.state = fresh.state;
}
