import { AppState, PencilElement } from '../lib/types';

interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

export const pencilTool: ToolHandler = {

  onPointerDown(state, x, y) {
    // Start a new pencil element with just one point
    const preview: PencilElement = {
      id: crypto.randomUUID(),
      type: 'pencil',
      points: [{ x, y }],   // first point is where user clicked
      strokeColor: '#ffffff',
      strokeWidth: 2,
    };

    return { preview };
  },

  onPointerMove(state, x, y) {
    if (!state.preview) return {};

    // Keep all old points, add the new cursor position
    const preview: PencilElement = {
      ...(state.preview as PencilElement),
      points: [...(state.preview as PencilElement).points, { x, y }],
    };

    return { preview };
  },

  onPointerUp(state, x, y) {
    if (!state.preview) return {};

    const el = state.preview as PencilElement;

    // Don't commit if user barely moved (just a click)
    if (el.points.length < 3) return { preview: null };

    return {
      elements: [...state.elements, state.preview],
      preview: null,
    };
  },
};