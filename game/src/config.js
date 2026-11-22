// Every tuning number and colour for Midnight at the Meridian, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds on the clock before dawn breaks and the crew leaves without you. */
export const TIME_LIMIT = 180;

/** Loot value the getaway van demands before the exit opens. */
export const LOOT_TARGET = 3000;

export const PLAYER = {
  radius: 13,
  walkSpeed: 178,
  sneakSpeed: 88,
  /** How much slower suspicion grows while sneaking. */
  sneakStealth: 0.45,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 152,
  /** Vision cone: how far a guard sees, and its half-angle in radians. */
  visionRange: 235,
  visionHalfAngle: 0.62,
  /** Suspicion per second at point blank, scaled down with distance. */
  spotRate: 62,
  decayRate: 26,
  /** Suspicion at which a guard stops watching and starts chasing. */
  chaseAt: 78,
  /** Seconds of no sight before a chasing guard gives up and patrols again. */
  loseSightAfter: 2.6,
  /** Running (not sneaking) this close makes a guard suspicious from noise alone. */
  hearRange: 130,
  hearRate: 14,
};

export const CAMERA = {
  range: 285,
  halfAngle: 0.5,
  /** Radians a camera sweeps either side of its rest angle. */
  sweep: 0.95,
  /** Seconds for one full sweep out and back. */
  sweepPeriod: 6.5,
  /** Alarm points per second while a camera holds the thief in its cone. */
  alarmRate: 26,
};

export const ALARM = {
  /** Points per second while any guard is chasing. */
  chaseRate: 16,
  /** Points per second the alarm cools when nobody sees the thief. */
  decayRate: 4,
  /** At this value the museum locks down and the heist is over. */
  lockdown: 100,
};

export const TOOL = {
  smokeCount: 2,
  smokeRadius: 95,
  smokeSeconds: 4,
  coinCount: 3,
  /** How far a tossed coin flies, and how far a guard hears it land. */
  coinThrow: 190,
  coinHearRange: 260,
};

export const VAULT = {
  /** Seconds standing at the vault door to pick its lock. */
  pickSeconds: 1.5,
  pickRange: 46,
};

export const LOOT = {
  painting: 400,
  gold: 800,
  diamond: 5000,
};

export const PALETTE = {
  backdrop: '#0b0e14',
  floor: '#232838',
  floorTile: '#272d40',
  floorWarm: '#2e2a33',
  wall: '#4a4f63',
  wallTop: '#5d6378',
  cover: '#39415a',
  coverTop: '#4b5470',
  door: '#8a6d3b',
  exit: '#2fae6e',
  exitGlow: '#39d98a',
  player: '#e8b64c',
  playerCloak: '#2b3247',
  guard: '#7fa8e8',
  guardSuit: '#31405e',
  cone: 'rgba(255, 214, 90, 0.16)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  coneHot: 'rgba(255, 84, 72, 0.20)',
  coneHotEdge: 'rgba(255, 84, 72, 0.75)',
  camera: '#9fb4d8',
  cameraCone: 'rgba(150, 200, 255, 0.13)',
  loot: '#ffd34d',
  diamond: '#7fe7ff',
  smoke: 'rgba(200, 205, 220, 0.55)',
  text: '#f2ead8',
  muted: '#9aa1b5',
  alarmLow: '#39d98a',
  alarmMid: '#ffb02e',
  alarmHigh: '#ff5448',
  panel: 'rgba(10, 13, 20, 0.82)',
  panelEdge: '#3d4358',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best haul is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-meridian.best';
