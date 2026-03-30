import { Element, AppState } from './types';

export function drawElement(ctx: CanvasRenderingContext2D, el: Element) {
  // Apply the element's stroke styles before drawing
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  
  // Only set fillColor for elements that have it
  if ('fillColor' in el) {
    ctx.fillStyle = el.fillColor;
  }
 
  switch (el.type) {
    case 'rect': {
      ctx.beginPath();
      ctx.rect(el.x, el.y, el.width, el.height);
      ctx.fill();
      ctx.stroke();
      break;
    }
 
    case 'ellipse': {
      ctx.beginPath();
      ctx.ellipse(el.cx, el.cy, Math.abs(el.rx), Math.abs(el.ry), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
 
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      break;
    }
 
    case 'pencil': {
      if (el.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
      break;
    }
  }
}
 
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: AppState
) {
  // 1. Wipe the entire canvas clean before redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
 
  // 2. Draw all committed elements normally
  state.elements.forEach(el => drawElement(ctx, el));
 
  // 3. Draw the in-progress shape (preview) with dashed style
  if (state.preview) {
    ctx.save();                      // save current ctx settings
    ctx.setLineDash([6, 4]);         // dashed line pattern
    ctx.globalAlpha = 0.7;           // slightly transparent
    drawElement(ctx, state.preview);
    ctx.restore();                   // restore ctx back to normal
  }
}
 