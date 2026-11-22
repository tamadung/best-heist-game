// Everything the eye sees: the museum floor, walls and cover, the vision
// cones of guards and cameras, loot that glows, the thief and the getaway
// van, the HUD with loot, alarm, tools and clock, and the title and end
// screens. Canvas 2D only, no images: every shape is drawn from the world.

import { ALARM, CAMERA, FIELD, GUARD, LOOT_TARGET, PALETTE, PLAYER, TOOL, VAULT } from './config.js';
import { FONT } from './config.js';
import { PHASE_CAUGHT, PHASE_LOCKDOWN, PHASE_TIMEOUT, PHASE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_END = 'end';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Checker tiles, faint enough to read as marble at a glance.
  ctx.fillStyle = PALETTE.floorTile;
  for (let ty = 0; ty < 9; ty += 1) {
    for (let tx = 0; tx < 16; tx += 1) {
      if ((tx + ty) % 2 === 0) continue;
      ctx.fillRect(tx * 80, ty * 80, 80, 80);
    }
  }
  // Warm carpet runner down the south hall.
  ctx.fillStyle = PALETTE.floorWarm;
  ctx.fillRect(16, 500, 1248, 204);
  // Room labels painted on the floor, so the museum reads at a glance.
  ctx.fillStyle = 'rgba(242, 234, 216, 0.10)';
  ctx.font = '700 34px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('ATRIUM', 200, 480);
  ctx.fillText('GALLERY', 650, 110);
  ctx.fillText('VAULT', 1090, 292);
  ctx.fillText('SOUTH HALL', 640, 640);
}

function drawWalls(ctx, level) {
  for (const wall of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(wall.x, wall.y, wall.w, 3);
  }
  const door = level.vaultDoor;
  if (!level.vaultOpen) {
    ctx.fillStyle = PALETTE.door;
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = '#d9b25f';
    ctx.fillRect(door.x + 5, door.y + 24, 6, 12);
  }
}

function drawCover(ctx, level) {
  for (const cover of level.covers) {
    ctx.fillStyle = PALETTE.cover;
    ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
    ctx.fillStyle = PALETTE.coverTop;
    ctx.fillRect(cover.x, cover.y, cover.w, 4);
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cover.x + 4, cover.y + 4, cover.w - 8, cover.h - 8);
  }
  for (const statue of level.statues) {
    ctx.beginPath();
    ctx.arc(statue.x, statue.y, statue.r, 0, Math.PI * 2);
    ctx.fillStyle = statue.kind === 'pedestal' ? '#6b5a34' : PALETTE.cover;
    ctx.fill();
    ctx.strokeStyle = PALETTE.coverTop;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (statue.kind === 'statue') {
      ctx.beginPath();
      ctx.arc(statue.x, statue.y, statue.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#8b93a3';
      ctx.fill();
    }
  }
}

function drawExit(ctx, level, lootValue) {
  const exit = level.exit;
  const open = lootValue >= LOOT_TARGET;
  ctx.fillStyle = open ? 'rgba(57, 217, 138, 0.30)' : 'rgba(255, 84, 72, 0.18)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? PALETTE.exitGlow : PALETTE.alarmHigh;
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  // The getaway van, parked top-down inside the doorway.
  ctx.fillStyle = '#1c2436';
  ctx.fillRect(exit.x + 14, exit.y + 14, 64, 40);
  ctx.fillStyle = '#31405e';
  ctx.fillRect(exit.x + 14, exit.y + 14, 64, 14);
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(exit.x + 14, exit.y + 28, 64, 4);
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(exit.x + 10, exit.y + 18, 5, 10);
  ctx.fillRect(exit.x + 10, exit.y + 40, 5, 10);
  ctx.fillRect(exit.x + 73, exit.y + 18, 5, 10);
  ctx.fillRect(exit.x + 73, exit.y + 40, 5, 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 15px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'GETAWAY VAN' : 'VAN — NEEDS $' + LOOT_TARGET.toLocaleString('en-US'), 130, 628);
}

function drawLoot(ctx, level, time) {
  const pulse = 0.55 + 0.25 * Math.sin(time * 3);
  for (const item of level.loot) {
    if (item.taken) continue;
    if (item.kind === 'painting') {
      ctx.fillStyle = '#7a5c2e';
      ctx.fillRect(item.x - 22, item.y - 14, 44, 28);
      ctx.fillStyle = '#c98f4e';
      ctx.fillRect(item.x - 18, item.y - 10, 36, 20);
      ctx.fillStyle = '#5d7fa8';
      ctx.fillRect(item.x - 18, item.y - 10, 36, 9);
    } else if (item.kind === 'gold') {
      ctx.fillStyle = `rgba(255, 211, 77, ${pulse})`;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.loot;
      ctx.fillRect(item.x - 10, item.y - 5, 20, 10);
    } else {
      // The Star Diamond, glowing on its pedestal.
      ctx.fillStyle = `rgba(127, 231, 255, ${0.25 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 14);
      ctx.lineTo(item.x + 12, item.y);
      ctx.lineTo(item.x, item.y + 14);
      ctx.lineTo(item.x - 12, item.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(item.x - 3, item.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSmokeAndCoins(ctx, state) {
  for (const smoke of state.smokes) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const coin of state.coins) {
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.5)';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    const hot = guard.mode === 'chase';
    drawCone(
      ctx,
      guard.x,
      guard.y,
      guard.angle,
      GUARD.visionRange,
      GUARD.visionHalfAngle,
      hot ? PALETTE.coneHot : PALETTE.cone,
      hot ? PALETTE.coneHotEdge : PALETTE.coneEdge,
    );
  }
}

function drawCameras(ctx, state) {
  for (const camera of state.cameras) {
    drawCone(
      ctx,
      camera.x,
      camera.y,
      camera.angle,
      CAMERA.range,
      CAMERA.halfAngle,
      camera.spotting ? PALETTE.coneHot : PALETTE.cameraCone,
      camera.spotting ? PALETTE.coneHotEdge : 'rgba(150, 200, 255, 0.4)',
    );
    ctx.fillStyle = PALETTE.camera;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = camera.spotting ? PALETTE.alarmHigh : PALETTE.alarmLow;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // A soft shadow of stealth under the thief.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak: a dark circle with a gold-trimmed hood, facing the move direction.
  // The thief wears gold, so the eye finds them first in any frame.
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.player;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.fill();
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 7, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.player;
  ctx.fill();
  ctx.fillStyle = '#0b0e14';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.sneak) {
    ctx.strokeStyle = 'rgba(242, 234, 216, 0.6)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Lockpick progress ring at the vault door.
  if (!state.vaultOpen && state.pickProgress > 0) {
    const door = state.level.vaultDoor;
    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + (state.pickProgress / VAULT.pickSeconds) * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PICKING LOCK…', cx, cy - 42);
  }
}

function drawHud(ctx, state) {
  // Top bar: loot, alarm, tools, clock — everything a thief checks at a glance.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 52);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(FIELD.width, 52);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.loot;
  ctx.font = '800 22px ' + FONT;
  ctx.fillText(`LOOT $${state.lootValue.toLocaleString('en-US')}`, 18, 33);
  ctx.fillStyle = state.lootValue >= LOOT_TARGET ? PALETTE.alarmLow : PALETTE.muted;
  ctx.font = '700 14px ' + FONT;
  ctx.fillText(`/ $${LOOT_TARGET.toLocaleString('en-US')} to escape`, 190, 32);

  // Alarm meter, centre: green to red as the museum wakes up.
  const alarmW = 300;
  const alarmX = FIELD.width / 2 - alarmW / 2;
  ctx.fillStyle = '#1a1e2a';
  ctx.fillRect(alarmX, 14, alarmW, 22);
  const frac = state.alarm / ALARM.lockdown;
  ctx.fillStyle = frac < 0.4 ? PALETTE.alarmLow : frac < 0.7 ? PALETTE.alarmMid : PALETTE.alarmHigh;
  ctx.fillRect(alarmX, 14, alarmW * frac, 22);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(alarmX, 14, alarmW, 22);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '800 14px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}%`, FIELD.width / 2, 30);

  // Tools and clock, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 16px ' + FONT;
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, FIELD.width - 18, 22);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '700 13px ' + FONT;
  ctx.fillText(`SMOKE [F] ×${state.smokeLeft}   COIN [Q] ×${state.coinLeft}`, FIELD.width - 18, 42);

  // Toast message under the bar.
  if (state.messageTtl > 0 && state.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.panel;
    const w = ctx.measureText(state.message).width + 28;
    ctx.fillRect(FIELD.width / 2 - w / 2, 60, w, 28);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 15px ' + FONT;
    ctx.fillText(state.message, FIELD.width / 2, 79);
  }

  // Bottom hint line: the controls, always visible.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(242, 234, 216, 0.55)';
  ctx.font = '700 13px ' + FONT;
  ctx.fillText(
    'WASD / ARROWS move   SHIFT sneak   F smoke   Q / CLICK toss a coin   P pause',
    FIELD.width / 2,
    FIELD.height - 12,
  );
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '900 54px ' + FONT;
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '400 20px ' + FONT;
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, FIELD.width / 2, y);
    y += 30;
  }
}

function drawTitle(ctx, state) {
  drawOverlay(
    ctx,
    'MIDNIGHT AT THE MERIDIAN',
    [
      'A museum heist. One thief, three guards, two cameras, one Star Diamond.',
      'Pocket $3,000 of loot, then slip out to the getaway van before dawn.',
      'Read the cones before you move — gold cones watch, red cones chase.',
      '',
      'Press SPACE to start the heist',
    ],
    PALETTE.loot,
  );
}

function drawEnd(ctx, state) {
  if (state.phase === PHASE_WON) {
    drawOverlay(
      ctx,
      'CLEAN GETAWAY',
      [
        `You slipped out with $${state.lootValue.toLocaleString('en-US')} of the Meridian's finest.`,
        `${state.lootTaken} pieces pocketed, ${Math.floor(state.timeLeft)} seconds to spare.`,
        '',
        'Press SPACE to run it again',
      ],
      PALETTE.alarmLow,
    );
  } else {
    const title =
      state.phase === PHASE_CAUGHT ? 'CAUGHT!' : state.phase === PHASE_LOCKDOWN ? 'LOCKDOWN!' : 'DAWN BROKE';
    drawOverlay(
      ctx,
      title,
      [
        state.endReason,
        `Loot kept: $${state.lootValue.toLocaleString('en-US')} — the crew keeps the rest.`,
        '',
        'Press SPACE to try again',
      ],
      PALETTE.alarmHigh,
    );
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(
      canvas.clientWidth / FIELD.width,
      canvas.clientHeight / FIELD.height,
    );
    const w = Math.floor(FIELD.width * scale);
    const h = Math.floor(FIELD.height * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return scale;
  }

  return {
    draw(state, screen) {
      const scale = fit();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const level = state.level;
      drawFloor(ctx, level);
      drawExit(ctx, level, state.lootValue);
      drawLoot(ctx, level, state.time);
      // Cones wash over the floor, then walls and cover stand over them.
      drawGuards(ctx, state);
      drawCameras(ctx, state);
      drawWalls(ctx, level);
      drawCover(ctx, level);
      drawSmokeAndCoins(ctx, state);
      // Guards and the thief stand on top of their own cones.
      for (const guard of state.guards) {
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.guardSuit;
        ctx.fill();
        ctx.strokeStyle = PALETTE.guard;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = PALETTE.guard;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.lineTo(
          guard.x + Math.cos(guard.angle) * (GUARD.radius + 7),
          guard.y + Math.sin(guard.angle) * (GUARD.radius + 7),
        );
        ctx.stroke();
        if (guard.suspicion > 4) {
          const frac = guard.suspicion / 100;
          ctx.strokeStyle = frac > 0.66 ? PALETTE.alarmHigh : PALETTE.alarmMid;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(guard.x, guard.y, GUARD.radius + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();
        }
        if (guard.mode === 'chase') {
          ctx.fillStyle = PALETTE.alarmHigh;
          ctx.font = '900 22px ' + FONT;
          ctx.textAlign = 'center';
          ctx.fillText('!', guard.x, guard.y - GUARD.radius - 12);
        }
      }
      drawPlayer(ctx, state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, state);
      if (screen === SCREEN_TITLE) drawTitle(ctx, state);
      if (screen === SCREEN_END) {
        drawHud(ctx, state);
        drawEnd(ctx, state);
      }
      if (screen === SCREEN_PAUSED) {
        drawOverlay(ctx, 'PAUSED', ['The museum waits. Press P to keep moving.'], PALETTE.text);
      }
    },
  };
}
