import { Element, RectElement, EllipseElement, LineElement, PencilElement } from './types';

// Size of each handle square in pixels
export const HANDLE_SIZE = 8;

// How close cursor needs to be to a handle to count as a hit
const HANDLE_HIT_TOLERANCE = 10;

// 8 handle positions — corners + midpoints
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Handle {
  id: HandlePosition;
  x: number;   // center x of the handle
  y: number;   // center y of the handle
}

// ─────────────────────────────────────────
// BOUNDING BOX — get the box that wraps any element
// All handle logic works from the bounding box
// ─────────────────────────────────────────
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getBoundingBox(el: Element): BoundingBox {
  switch (el.type) {
    case 'rect': {
      return {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      };
    }

    case 'ellipse': {
      // Ellipse bounding box goes from center - radius to center + radius
      return {
        x: el.cx - Math.abs(el.rx),
        y: el.cy - Math.abs(el.ry),
        width: Math.abs(el.rx) * 2,
        height: Math.abs(el.ry) * 2,
      };
    }

    case 'line': {
      // Bounding box of a line — top left to bottom right
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        width: Math.abs(el.x2 - el.x1),
        height: Math.abs(el.y2 - el.y1),
      };
    }

    case 'pencil': {
      // Bounding box wraps ALL points
      const xs = el.points.map(p => p.x);
      const ys = el.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
  }
}

// ─────────────────────────────────────────
// GET HANDLES — returns 8 handle positions around the bounding box
// ─────────────────────────────────────────
//
//   nw ─── n ─── ne
//   │             │
//   w             e
//   │             │
//   sw ─── s ─── se
//
export function getHandles(el: Element): Handle[] {
  const { x, y, width, height } = getBoundingBox(el);

  const cx = x + width / 2;   // center x
  const cy = y + height / 2;  // center y
  const r  = x + width;       // right edge
  const b  = y + height;      // bottom edge

  return [
    { id: 'nw', x: x,  y: y  },   // top left
    { id: 'n',  x: cx, y: y  },   // top middle
    { id: 'ne', x: r,  y: y  },   // top right
    { id: 'e',  x: r,  y: cy },   // middle right
    { id: 'se', x: r,  y: b  },   // bottom right
    { id: 's',  x: cx, y: b  },   // bottom middle
    { id: 'sw', x: x,  y: b  },   // bottom left
    { id: 'w',  x: x,  y: cy },   // middle left
  ];
}

// ─────────────────────────────────────────
// HIT TEST HANDLE — did cursor click on a specific handle?
// ─────────────────────────────────────────
export function hitTestHandle(handle: Handle, px: number, py: number): boolean {
  return (
    Math.abs(px - handle.x) < HANDLE_HIT_TOLERANCE &&
    Math.abs(py - handle.y) < HANDLE_HIT_TOLERANCE
  );
}

// ─────────────────────────────────────────
// GET HIT HANDLE — which handle did cursor click? (if any)
// ─────────────────────────────────────────
export function getHitHandle(el: Element, px: number, py: number): Handle | null {
  const handles = getHandles(el);
  for (const handle of handles) {
    if (hitTestHandle(handle, px, py)) return handle;
  }
  return null;
}

// ─────────────────────────────────────────
// DRAW HANDLES — call this from renderer.ts when an element is selected
// ─────────────────────────────────────────
export function drawHandles(ctx: CanvasRenderingContext2D, el: Element) {
  const handles = getHandles(el);
  const half = HANDLE_SIZE / 2;

  // Draw bounding box outline
  const { x, y, width, height } = getBoundingBox(el);
  ctx.save();
  ctx.strokeStyle = '#4af';       // blue selection color
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();

  // Draw each handle as a small square
  handles.forEach(handle => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.fillRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.restore();
  });
}