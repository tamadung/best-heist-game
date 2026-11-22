// Flat 2D geometry for vision and movement: segments against rectangles,
// angles, and the line-of-sight test every guard and camera leans on.
// Walls and display cases block sight; the thief hides behind them.

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when (px,py) sits inside rect {x,y,w,h}, padded by margin. */
export function pointInRect(px, py, rect, margin = 0) {
  return (
    px >= rect.x - margin &&
    px <= rect.x + rect.w + margin &&
    py >= rect.y - margin &&
    py <= rect.y + rect.h + margin
  );
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True when the segment from (ax,ay) to (bx,by) touches rect. */
export function segmentHitsRect(ax, ay, bx, by, rect) {
  if (pointInRect(ax, ay, rect) || pointInRect(bx, by, rect)) return true;
  const { x, y, w, h } = rect;
  return (
    segmentsCross(ax, ay, bx, by, x, y, x + w, y) ||
    segmentsCross(ax, ay, bx, by, x + w, y, x + w, y + h) ||
    segmentsCross(ax, ay, bx, by, x + w, y + h, x, y + h) ||
    segmentsCross(ax, ay, bx, by, x, y + h, x, y)
  );
}

/** True when segment (ax,ay)-(bx,by) touches circle (cx,cy,r). */
export function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = ax + t * dx;
  const py = ay + t * dy;
  return distance(px, py, cx, cy) <= r;
}

/**
 * Line of sight between two points: clear when no wall and no display case
 * crosses the segment, and the segment does not pass through a smoke cloud.
 */
export function hasLineOfSight(ax, ay, bx, by, blockers, smokes) {
  for (const rect of blockers) {
    if (segmentHitsRect(ax, ay, bx, by, rect)) return false;
  }
  for (const smoke of smokes) {
    if (segmentHitsCircle(ax, ay, bx, by, smoke.x, smoke.y, smoke.radius)) return false;
  }
  return true;
}

/** True when (tx,ty) is inside a vision cone from (ox,oy) facing `angle`. */
export function insideCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const d = distance(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 8) return true;
  return angleDiff(Math.atan2(ty - oy, tx - ox), angle) <= halfAngle;
}
