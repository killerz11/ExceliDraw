import { AppState } from '../lib/types';

interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

// TODO: Phase 3 - Implement selection logic
export const selectTool: ToolHandler = {
  onPointerDown(state, x, y) {
    // TODO: Check if click is on an element, select it
    return {};
  },

  onPointerMove(state, x, y) {
    // TODO: Drag selected elements
    return {};
  },

  onPointerUp(state, x, y) {
    // TODO: Finalize drag
    return {};
  },
};
