// Base element properties shared by all shapes
interface BaseElement {
  id: string;
  x: number;
  y: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

// Rectangle element
export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
}

// Ellipse element (uses center and radii)
export interface EllipseElement extends Omit<BaseElement, 'x' | 'y'> {
  type: 'ellipse';
  cx: number;  // center x
  cy: number;  // center y
  rx: number;  // radius x
  ry: number;  // radius y
}

// Line element
export interface LineElement extends Omit<BaseElement, 'x' | 'y' | 'fillColor'> {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Pencil/freehand drawing element
export interface PencilElement extends Omit<BaseElement, 'x' | 'y' | 'fillColor'> {
  type: 'pencil';
  points: Array<{ x: number; y: number }>;
}

// Union type of all possible elements
export type Element = RectElement | EllipseElement | LineElement | PencilElement;

// Tool types
export type ToolType = 'rect' | 'ellipse' | 'line' | 'pencil' | 'select';

// Application state
export interface AppState {
  elements: Element[];
  preview: Element | null;
  activeTool: ToolType;
  selectedIds: Set<string>;
}
