import { AppState, RectElement } from '../lib/types';

// The ToolHandler interface — every tool follows this exact shape
interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

// We store the start point outside the handler
// because we need it across multiple pointer events
let startX = 0;
let startY = 0;

export const rectTool: ToolHandler = {

  onPointerDown(state, x, y) {
    // User just clicked — record where they started
    startX = x;
    startY = y;

    // Create a zero-size rect at the click point as preview
    const preview: RectElement = {
      id: crypto.randomUUID(),
      type: 'rect',
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      strokeColor: '#ffffff',
      fillColor: 'transparent',
      strokeWidth: 2,
    };

    // Return only what changed — just preview
    return { preview };
  },

  onPointerMove(state, x, y) {
    // If no preview exists, user isn't drawing — do nothing
    if (!state.preview) return {};

    // Calculate width and height from start point to current cursor
    const width = x - startX;
    const height = y - startY;

    // Update the preview with new dimensions
    // We spread the old preview to keep id, colors etc
    const preview: RectElement = {
      ...(state.preview as RectElement),
      x: width < 0 ? x : startX,      // handle dragging left
      y: height < 0 ? y : startY,     // handle dragging up
      width: Math.abs(width),
      height: Math.abs(height),
    };

    return { preview };
  },

  onPointerUp(state, x, y) {
    // If no preview, nothing to commit
    if (!state.preview) return {};

    // Only commit if the shape has some size (not just a click)
    const el = state.preview as RectElement;
    if (el.width < 2 && el.height < 2) {
      return { preview: null };
    }

    // Move preview into the committed elements array
    return {
      elements: [...state.elements, state.preview],
      preview: null,   // clear preview
    };
  },
};