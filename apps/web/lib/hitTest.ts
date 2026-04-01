import { Element, RectElement, EllipseElement, LineElement, PencilElement } from './types';

// How close the cursor needs to be to a boundary to count as a hit (in pixels)
const HIT_TOLERANCE = 8;

// ─────────────────────────────────────────
// HELPER — distance from point to a line segment
// Used by line and pencil hit tests
// ─────────────────────────────────────────
function distanceToSegment(
  px: number, py: number,  // the point (cursor)
  x1: number, y1: number,  // segment start
  x2: number, y2: number   // segment end
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Segment is actually just a point
    return Math.hypot(px - x1, py - y1);
  }

  // t is how far along the segment the closest point is (0 to 1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));  // clamp between 0 and 1

  // The closest point on the segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.hypot(px - closestX, py - closestY);
}

// ─────────────────────────────────────────
// RECT — check if point is near any of the 4 edges
// ─────────────────────────────────────────
function hitTestRect(el: RectElement, px: number, py: number): boolean {
  const { x, y, width, height } = el;

  // Distance to each of the 4 edges
  const distTop    = distanceToSegment(px, py, x, y, x + width, y);
  const distBottom = distanceToSegment(px, py, x, y + height, x + width, y + height);
  const distLeft   = distanceToSegment(px, py, x, y, x, y + height);
  const distRight  = distanceToSegment(px, py, x + width, y, x + width, y + height);

  // Hit if cursor is close to ANY edge
  return Math.min(distTop, distBottom, distLeft, distRight) < HIT_TOLERANCE;
}

// ─────────────────────────────────────────
// ELLIPSE — check if point is near the ellipse boundary
// ─────────────────────────────────────────
function hitTestEllipse(el: EllipseElement, px: number, py: number): boolean {
  const { cx, cy, rx, ry } = el;

  if (Math.abs(rx) < 1 || Math.abs(ry) < 1) return false;

  // dx, dy = distance from cursor to center
  const dx = px - cx;
  const dy = py - cy;

  // This value equals 1.0 when point is exactly ON the ellipse boundary
  // Less than 1 = inside, greater than 1 = outside
  const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

  // We allow a tolerance band around 1.0
  const tolerance = HIT_TOLERANCE / Math.min(Math.abs(rx), Math.abs(ry));
  return Math.abs(value - 1) < tolerance;
}

// ─────────────────────────────────────────
// LINE — check if point is near the line segment
// ─────────────────────────────────────────
function hitTestLine(el: LineElement, px: number, py: number): boolean {
  return distanceToSegment(px, py, el.x1, el.y1, el.x2, el.y2) < HIT_TOLERANCE;
}

// ─────────────────────────────────────────
// PENCIL — check if point is near any segment in the path
// ─────────────────────────────────────────
function hitTestPencil(el: PencilElement, px: number, py: number): boolean {
  const { points } = el;
  if (points.length < 2) return false;

  // Check every consecutive pair of points as a segment
  for (let i = 0; i < points.length - 1; i++) {
    const dist = distanceToSegment(
      px, py,
      points[i].x, points[i].y,
      points[i + 1].x, points[i + 1].y
    );
    if (dist < HIT_TOLERANCE) return true;
  }

  return false;
}

// ─────────────────────────────────────────
// MAIN — hit test a single element
// ─────────────────────────────────────────
export function hitTest(el: Element, px: number, py: number): boolean {
  switch (el.type) {
    case 'rect':    return hitTestRect(el, px, py);
    case 'ellipse': return hitTestEllipse(el, px, py);
    case 'line':    return hitTestLine(el, px, py);
    case 'pencil':  return hitTestPencil(el, px, py);
  }
}

// ─────────────────────────────────────────
// MAIN — find which element the user clicked
// Returns topmost shape (last in array = drawn on top)
// ─────────────────────────────────────────
export function getHitElement(
  elements: Element[],
  px: number,
  py: number
): Element | null {
  // Iterate in reverse — last drawn shape is visually on top
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTest(elements[i], px, py)) {
      return elements[i];
    }
  }
  return null;  // nothing was clicked
}