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
function reducer(state: AppState, patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): AppState {
  const newPatch = typeof patch === 'function' ? patch(state) : patch;
  return { ...state, ...newPatch };
}

// move OUTSIDE the component — above the export default line
function applyRemoteElement(elements: Element[], incoming: Element): Element[] {
  const map = new Map(elements.map(el => [el.id, el]));
  map.set(incoming.id, incoming);
  return Array.from(map.values());
}

export default function Canvas({ activeTool, sendElement, onRemoteElement }: {
  activeTool: string;
  sendElement: (element: Element) => void;
  onRemoteElement: (handler: (el: Element) => void) => void;
}) {

   // All drawing state lives here
const [state, dispatch] = useReducer(reducer, initialState);
  // Inside Canvas.tsx
const stateRef = useRef(state);
// Reference to the actual <canvas> DOM element
const canvasRef = useRef<HTMLCanvasElement>(null);
// isDrawing is a ref NOT state — changes every pointermove
// using useState here would cause hundreds of wasted re-renders per drag
const isDrawing = useRef(false);
const history = useRef<Element[][]>([[]]);
const historyIndex = useRef(0);

function commit(newElements: Element[]) {
  // discard any redo history
  history.current = history.current.slice(0, historyIndex.current + 1);
  // push new snapshot
  history.current.push(newElements);
  historyIndex.current = history.current.length - 1;
}

useEffect(() => {
  stateRef.current = state;
}, [state]);

useEffect(() => {
  onRemoteElement((remoteElement: Element) => {
    dispatch(prev => ({           // ← functional update
      elements: applyRemoteElement(prev.elements, remoteElement)
    }));
  });
}, [onRemoteElement]);

  // Sync activeTool from parent props into local state
  useEffect(() => {
    if (activeTool && activeTool !== state.activeTool) {
      console.log('🔧 Tool changed:', state.activeTool, '→', activeTool);
      dispatch({ activeTool: activeTool as any });
    }
  }, [activeTool, state.activeTool]);

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

  useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const isMac = navigator.userAgent.includes('Mac');
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      // UNDO
      if (historyIndex.current > 0) {
        historyIndex.current--;
        dispatch({ elements: history.current[historyIndex.current] });
      }
    }

    if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      // REDO
      if (historyIndex.current < history.current.length - 1) {
        historyIndex.current++;
        dispatch({ elements: history.current[historyIndex.current] });
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

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
    if (e.button !== 0) return;  // 0 = left click, ignore anything else
    
    console.log("left click");
    isDrawing.current = true;
    const { x, y } = getPos(e);
    const result = getToolHandler(state.activeTool).onPointerDown(state, x, y);
    dispatch(result);
  }, [state, getPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only draw if mouse is held down
    if (!isDrawing.current) return;

    const { x, y } = getPos(e);
    const result = getToolHandler(state.activeTool).onPointerMove(state, x, y);
    dispatch(result);
  }, [state, getPos]);

 const onPointerUp = useCallback((e: any) => {
  if (!isDrawing.current) return;
  isDrawing.current = false;
  const { x, y } = getPos(e);
  const result = getToolHandler(state.activeTool).onPointerUp(state, x, y);
  
  dispatch(result);        // ← UI updates first
  
  if (result.elements) {
    commit(result.elements);
    const newElement = result.elements[result.elements.length - 1];
    sendElement(newElement);  // ← network sync after
  }
}, [state, getPos, sendElement]);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
  e.preventDefault();  // stops default browser context menu
  // for now just log — you can build a real menu later
  console.log('right click at', e.clientX, e.clientY);
  }, []);

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