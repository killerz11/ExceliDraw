import { AppState, EllipseElement } from '../lib/types';

interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

let startX = 0;
let startY = 0;

export const ellipseTool: ToolHandler = {

  onPointerDown(state, x, y) {
    startX = x;
    startY = y;

    const preview: EllipseElement = {
      id: crypto.randomUUID(),
      type: 'ellipse',
      cx: x,       // center starts at click point
      cy: y,
      rx: 0,       // zero radius — no size yet
      ry: 0,
      strokeColor: '#ffffff',
      fillColor: 'transparent',
      strokeWidth: 2,
    };

    return { preview };
  },

  onPointerMove(state, x, y) {
    if (!state.preview) return {};

    // rx and ry are the distance from center to edge
    // so we divide by 2
    const rx = (x - startX) / 2;
    const ry = (y - startY) / 2;

    const preview: EllipseElement = {
      ...(state.preview as EllipseElement),
      cx: startX + rx,   // center moves with the drag
      cy: startY + ry,
      rx,
      ry,
    };

    return { preview };
  },

  onPointerUp(state, x, y) {
    if (!state.preview) return {};

    const el = state.preview as EllipseElement;
    if (Math.abs(el.rx) < 2 && Math.abs(el.ry) < 2) {
      return { preview: null };
    }

    return {
      elements: [...state.elements, state.preview],
      preview: null,
    };
  },
};