import { AppState, Element } from '../lib/types';
import { ToolHandler } from './index';
import { getHitElement } from '../lib/hitTest';
import { getHitHandle, HandlePosition, getBoundingBox } from '../lib/handle';

// ─────────────────────────────────────────
// MODE — what is the select tool currently doing?
// ─────────────────────────────────────────
type SelectMode =
  | 'idle'      // nothing happening
  | 'moving'    // dragging a shape to move it
  | 'resizing'; // dragging a handle to resize it

// ─────────────────────────────────────────
// STATE — persists across pointer events
// ─────────────────────────────────────────
let mode: SelectMode = 'idle';

// Where the drag started
let dragStartX = 0;
let dragStartY = 0;

// Snapshot of element positions at drag start
// key = element id, value = original element
let elementSnapshot: Map<string, Element> = new Map();

// Which handle is being dragged (for resize)
let activeHandle: HandlePosition | null = null;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// Move an element by dx, dy from its snapshot position
function moveElement(el: Element, dx: number, dy: number): Element {
  switch (el.type) {
    case 'rect':
      return { ...el, x: el.x + dx, y: el.y + dy };

    case 'ellipse':
      return { ...el, cx: el.cx + dx, cy: el.cy + dy };

    case 'line':
      return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };

    case 'pencil':
      return {
        ...el,
        points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
      };
  }
}

// Resize an element based on which handle is dragged
function resizeElement(
  el: Element,
  handle: HandlePosition,
  dx: number,
  dy: number
): Element {
  switch (el.type) {
    case 'rect': {
      let { x, y, width, height } = el;

      // Each handle moves different edges
      if (handle.includes('w')) { x += dx; width -= dx; }   // left edge
      if (handle.includes('e')) { width += dx; }             // right edge
      if (handle.includes('n')) { y += dy; height -= dy; }  // top edge
      if (handle.includes('s')) { height += dy; }            // bottom edge

      return { ...el, x, y, width: Math.max(5, width), height: Math.max(5, height) };
    }

    case 'ellipse': {
      let { cx, cy, rx, ry } = el;

      if (handle.includes('e') || handle.includes('w')) rx += dx / 2;
      if (handle.includes('n') || handle.includes('s')) ry += dy / 2;
      if (handle.includes('w')) cx += dx / 2;
      if (handle.includes('n')) cy += dy / 2;

      return { ...el, cx, cy, rx: Math.max(5, Math.abs(rx)), ry: Math.max(5, Math.abs(ry)) };
    }

    case 'line': {
      // For lines — n/w handles move start point, s/e handles move end point
      let { x1, y1, x2, y2 } = el;

      if (handle === 'nw' || handle === 'n' || handle === 'w') {
        x1 += dx; y1 += dy;
      } else {
        x2 += dx; y2 += dy;
      }

      return { ...el, x1, y1, x2, y2 };
    }

    case 'pencil': {
      // Pencil resize scales all points from bounding box
      const box = getBoundingBox(el);
      const scaleX = (box.width + dx) / (box.width || 1);
      const scaleY = (box.height + dy) / (box.height || 1);

      return {
        ...el,
        points: el.points.map(p => ({
          x: box.x + (p.x - box.x) * scaleX,
          y: box.y + (p.y - box.y) * scaleY,
        })),
      };
    }
  }
}

// ─────────────────────────────────────────
// SELECT TOOL
// ─────────────────────────────────────────
export const selectTool: ToolHandler = {

  onPointerDown(state, x, y) {
    dragStartX = x;
    dragStartY = y;

    // Step 1 — check if cursor is on a handle of the selected element
    if (state.selectedIds.size === 1) {
      const selectedId = [...state.selectedIds][0];
      const selectedEl = state.elements.find(el => el.id === selectedId);

      if (selectedEl) {
        const handle = getHitHandle(selectedEl, x, y);
        if (handle) {
          // Start resizing
          mode = 'resizing';
          activeHandle = handle.id;
          elementSnapshot = new Map([[selectedEl.id, selectedEl]]);
          return {};
        }
      }
    }

    // Step 2 — check if cursor hit any shape
    const hitEl = getHitElement(state.elements, x, y);

    if (hitEl) {
      // Start moving
      mode = 'moving';
      activeHandle = null;
      // Snapshot ALL selected elements (in case multi-select later)
      const ids = new Set([hitEl.id]);
      elementSnapshot = new Map(
        state.elements
          .filter(el => ids.has(el.id))
          .map(el => [el.id, el])
      );
      return { selectedIds: ids };
    }

    // Step 3 — clicked empty space, deselect everything
    mode = 'idle';
    elementSnapshot = new Map();
    return { selectedIds: new Set() };
  },

  onPointerMove(state, x, y) {
    if (mode === 'idle') return {};

    const dx = x - dragStartX;
    const dy = y - dragStartY;

    if (mode === 'moving') {
      // Move all selected elements by the delta from drag start
      const elements = state.elements.map(el => {
        const snapshot = elementSnapshot.get(el.id);
        if (!snapshot) return el;
        return moveElement(snapshot, dx, dy);
      });
      return { elements };
    }

    if (mode === 'resizing' && activeHandle) {
      // Resize the selected element
      const elements = state.elements.map(el => {
        const snapshot = elementSnapshot.get(el.id);
        if (!snapshot) return el;
        return resizeElement(snapshot, activeHandle!, dx, dy);
      });
      return { elements };
    }

    return {};
  },

  onPointerUp(state, x, y) {
    // Just reset mode — elements are already updated in onPointerMove
    mode = 'idle';
    activeHandle = null;
    return {};
  },
};