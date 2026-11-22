// The Meridian Museum, one floor, three zones: the atrium on the left, the
// gallery in the middle, the vault top-right, and a south hall joining them.
// Walls make several routes through every room; display cases, statues and
// planters are cover that blocks both feet and sight.

import { LOOT } from './config.js';

const WALL = 16;

function rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Build the museum for a seed. Loot and patrol phases jitter a little per
 * seed, but the rooms, doors and routes are always the same museum.
 */
export function buildLevel(random) {
  const jitter = (v) => v + random.range(-14, 14);

  const walls = [
    // Outer shell, with a gap in the south wall for the getaway door.
    rect(0, 0, 1280, WALL),
    rect(0, 704, 84, WALL),
    rect(176, 704, 1104, WALL),
    rect(0, 0, WALL, 720),
    rect(1264, 0, WALL, 720),
    // Atrium | gallery wall, doorway at y 300..380.
    rect(380, WALL, WALL, 284),
    rect(380, 380, WALL, 80),
    // Gallery | east wall, doorway at y 380..450, vault door at y 150..210.
    rect(920, WALL, WALL, 134),
    rect(920, 210, WALL, 170),
    rect(920, 450, WALL, 110),
    // Gallery | south hall wall, doorway at x 560..640.
    rect(396, 460, 164, WALL),
    rect(640, 460, 280, WALL),
  ];

  // The vault door is a wall of its own: it blocks until lockpicked open.
  const vaultDoor = rect(920, 150, WALL, 60);

  // Display cases, benches and planters: solid cover that also blocks sight.
  const covers = [
    rect(470, 180, 90, 50),
    rect(700, 150, 90, 50),
    rect(520, 330, 110, 46),
    rect(740, 330, 90, 50),
    rect(90, 420, 120, 34),
    rect(500, 560, 120, 44),
    rect(820, 580, 120, 44),
    rect(1010, 500, 110, 44),
  ];

  // Round statues and planters, drawn as circles and blocking as circles.
  const statues = [
    { x: 640, y: 250, r: 22, kind: 'statue' },
    { x: 830, y: 260, r: 18, kind: 'statue' },
    { x: 200, y: 200, r: 20, kind: 'planter' },
    { x: 200, y: 320, r: 20, kind: 'planter' },
    { x: 1060, y: 600, r: 20, kind: 'statue' },
    { x: 1090, y: 170, r: 26, kind: 'pedestal' },
  ];

  const loot = [
    { id: 'p1', kind: 'painting', x: 450, y: 44, value: LOOT.painting, taken: false, label: 'Sunset Canal' },
    { id: 'p2', kind: 'painting', x: 640, y: 44, value: LOOT.painting, taken: false, label: 'The Duchess' },
    { id: 'p3', kind: 'painting', x: 830, y: 44, value: LOOT.painting, taken: false, label: 'Harbour Lights' },
    { id: 'p4', kind: 'painting', x: 980, y: 676, value: LOOT.painting, taken: false, label: 'Winter Market' },
    { id: 'p5', kind: 'painting', x: 1160, y: 676, value: LOOT.painting, taken: false, label: 'The Acrobat' },
    { id: 'p6', kind: 'painting', x: 44, y: 300, value: LOOT.painting, taken: false, label: 'Old Meridian' },
    { id: 'g1', kind: 'gold', x: 1000, y: 80, value: LOOT.gold, taken: false, label: 'Gold bars' },
    { id: 'g2', kind: 'gold', x: 1180, y: 80, value: LOOT.gold, taken: false, label: 'Gold bars' },
    { id: 'g3', kind: 'gold', x: 1180, y: 260, value: LOOT.gold, taken: false, label: 'Gold bars' },
    { id: 'd1', kind: 'diamond', x: 1090, y: 170, value: LOOT.diamond, taken: false, label: 'The Star Diamond' },
  ];

  const guards = [
    {
      id: 'g-gallery',
      name: 'Gallery guard',
      waypoints: [
        { x: 440, y: 120 },
        { x: 850, y: 120 },
        { x: 850, y: 400 },
        { x: 440, y: 400 },
      ],
      waypoint: 1,
      phase: random.range(0, 1),
    },
    {
      id: 'g-atrium',
      name: 'Atrium guard',
      waypoints: [
        { x: 120, y: 110 },
        { x: 310, y: 110 },
        { x: 310, y: 380 },
        { x: 120, y: 380 },
      ],
      waypoint: 1,
      phase: random.range(0, 1),
    },
    {
      id: 'g-east',
      name: 'East hall guard',
      waypoints: [
        { x: 1000, y: 400 },
        { x: 1200, y: 400 },
        { x: 1200, y: 640 },
        { x: 1000, y: 640 },
      ],
      waypoint: 1,
      phase: random.range(0, 1),
    },
  ];

  const cameras = [
    { id: 'c-gallery', x: 640, y: 22, restAngle: Math.PI / 2, phase: 0 },
    { id: 'c-vault', x: 980, y: 22, restAngle: Math.PI / 2, phase: 0.5 },
  ];

  return {
    walls,
    vaultDoor,
    covers,
    statues,
    loot,
    guards,
    cameras,
    exit: rect(84, 636, 92, 68),
    playerStart: { x: 130, y: 640 },
    jitter,
  };
}
