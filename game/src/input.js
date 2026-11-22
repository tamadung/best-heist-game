// Keyboard and pointer input. Held keys steer; one-shot presses (start,
// smoke, coin, pause) are queued as flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A mouse
// click tosses a coin toward that point on the floor.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SMOKE = new Set(['KeyF', 'KeyE']);
const COIN = new Set(['KeyQ']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0 };
  let coinTarget = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SMOKE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else if (COIN.has(event.code)) {
      if (!event.repeat) coinTarget = { x: mouse.x, y: mouse.y };
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    coinTarget = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  return {
    /** Movement vector in canvas pixels, plus sneak and one-shot actions. */
    read() {
      let mx = 0;
      let my = 0;
      for (const code of held) {
        if (UP.has(code)) my -= 1;
        if (DOWN.has(code)) my += 1;
        if (LEFT.has(code)) mx -= 1;
        if (RIGHT.has(code)) mx += 1;
      }
      const taken = actions;
      actions = 0;
      const coin = coinTarget;
      coinTarget = null;
      return {
        mx,
        my,
        sneak: held.has('ShiftLeft') || held.has('ShiftRight'),
        smoke: (taken & ACTION_SMOKE) !== 0,
        confirm: (taken & ACTION_CONFIRM) !== 0,
        pause: (taken & ACTION_PAUSE) !== 0,
        coin,
        mouse,
      };
    },
  };
}
