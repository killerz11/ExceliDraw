import { AppState } from '../lib/types';
import { rectTool } from './rectTool';
import { ellipseTool } from './ellipseTool';
import { lineTool } from './lineTool';
import { pencilTool } from './pencilTool';

// The ToolHandler interface — every tool must have these 3 methods
export interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}

// Registry — maps tool name to its handler
const tools: Record<string, ToolHandler> = {
  rect: rectTool,
  ellipse: ellipseTool,
  line: lineTool,
  pencil: pencilTool,
};

// Canvas.tsx calls this with the active tool name
// and gets back the right handler
export function getToolHandler(tool: string): ToolHandler {
  return tools[tool];
}