'use client';
import { useReducer, useRef, useEffect, useCallback } from 'react';
import { AppState, Element } from '../lib/types';
import { renderCanvas } from '../lib/renderer';
import { getToolHandler } from '../tools';

// Initial state when canvas first loads
const initialState: AppState = {
  elements: [],
  activeTool: 'line',
  selectedIds: new Set(),
  preview: null,
};

// Reducer — merges any patch into current state
// Tools return Partial<AppState> — only what changed
function reducer(state: AppState, patch: Partial<AppState>): AppState {
  return { ...state, ...patch };
}

export default function Canvas({activeTool} : {activeTool : string}) {
  // All drawing state lives here
  const [state, dispatch] = useReducer(reducer, initialState);

  // Sync activeTool from parent props into local state
  useEffect(() => {
    if (activeTool && activeTool !== state.activeTool) {
      console.log('🔧 Tool changed:', state.activeTool, '→', activeTool);
      dispatch({ activeTool: activeTool as any });
    }
  }, [activeTool, state.activeTool]);

  // Reference to the actual <canvas> DOM element
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // isDrawing is a ref NOT state — changes every pointermove
  // using useState here would cause hundreds of wasted re-renders per drag
  const isDrawing = useRef(false);

  // -------------------------------------------------------
  // RENDER — runs every time state changes
  // -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvas(ctx, canvas, state);
  }, [state]);

  // -------------------------------------------------------
  // RESIZE — make canvas fill its container
  // -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // -------------------------------------------------------
  // HELPER — get mouse position relative to canvas
  // (not relative to the window)
  // -------------------------------------------------------
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // -------------------------------------------------------
  // POINTER EVENTS — the core of the drawing system
  // -------------------------------------------------------

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const { x, y } = getPos(e);

    // Ask the active tool what to do
    const result = getToolHandler(state.activeTool).onPointerDown(state, x, y);

    // Apply the changes to state
    dispatch(result);
  }, [state, getPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only draw if mouse is held down
    if (!isDrawing.current) return;

    const { x, y } = getPos(e);
    const result = getToolHandler(state.activeTool).onPointerMove(state, x, y);
    dispatch(result);
  }, [state, getPos]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    isDrawing.current = false;
    const { x, y } = getPos(e);
    const result = getToolHandler(state.activeTool).onPointerUp(state, x, y);
    dispatch(result);
  }, [state, getPos]);

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="relative w-full h-full bg-[#1a1a1a]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        // Prevents touch scrolling interfering with drawing
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}