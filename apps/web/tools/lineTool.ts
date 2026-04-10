import { AppState, LineElement } from '../lib/types';
import { generateUUID } from '../lib/uuid';

interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

let startX = 0;
let startY = 0;

export const lineTool: ToolHandler = {

  onPointerDown(state, x, y) {
    startX = x;
    startY = y;

    const preview: LineElement = {
      id: generateUUID(),
      type: 'line',
      x1: startX,   // start point
      y1: startY,
      x2: startX,   // end point starts same as start
      y2: startY,
      strokeColor: '#ffffff',
      strokeWidth: 2,
    };

    return { preview };
  },

  onPointerMove(state, x, y) {
    if (!state.preview) return {};

    // Just update where the line ends
    const preview: LineElement = {
      ...(state.preview as LineElement),
      x2: x,
      y2: y,
    };

    return { preview };
  },

  onPointerUp(state, x, y) {
    if (!state.preview) return {};

    const el = state.preview as LineElement;

    // Don't commit if start and end are basically the same point
    const tooShort =
      Math.abs(el.x2 - el.x1) < 2 && Math.abs(el.y2 - el.y1) < 2;

    if (tooShort) return { preview: null };

    return {
      elements: [...state.elements, state.preview],
      preview: null,
    };
  },
};