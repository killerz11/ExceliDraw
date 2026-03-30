# Bug Report: Tool Switching Not Working

## Issue Summary
When selecting different drawing tools (rectangle, ellipse, line, pencil) from the toolbar, only rectangles were being drawn regardless of which tool was selected.

## Root Cause Analysis

### Problem 1: State Isolation
The `Canvas` component maintained its own internal `activeTool` state that was initialized to `'rect'` and never updated:

```typescript
// Canvas.tsx - BEFORE
const initialState: AppState = {
  elements: [],
  activeTool: 'rect',  // ← Hardcoded, never changes
  selectedIds: new Set(),
  preview: null,
};

export default function Canvas() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // No way to update activeTool from outside
}
```

Meanwhile, the parent component (`RoomPage`) was managing its own `activeTool` state that was being updated by the `ToolBar`:

```typescript
// room/[id]/page.tsx
const [activeTool, setActiveTool] = useState<ToolType>('rect');

<ToolBar activeTool={activeTool} onToolChange={setActiveTool} />
<Canvas /> {/* ← Not receiving activeTool prop */}
```

**Result**: Two separate states existed - one in the parent that changed, and one in Canvas that stayed as 'rect'.

### Problem 2: Missing Tool Registration
The `selectTool` was defined but not registered in the tools registry:

```typescript
// tools/index.ts - BEFORE
const tools: Record<string, ToolHandler> = {
  rect: rectTool,
  ellipse: ellipseTool,
  line: lineTool,
  pencil: pencilTool,
  // select: selectTool ← MISSING
};
```

When users clicked the select tool, `getToolHandler('select')` would return `undefined`, causing a runtime error.

### Problem 3: No Error Handling
The `getToolHandler` function had no fallback or error logging:

```typescript
// tools/index.ts - BEFORE
export function getToolHandler(tool: string): ToolHandler {
  return tools[tool]; // Could return undefined
}
```

## Solution

### Fix 1: Props-Based Tool Selection
Made Canvas accept `activeTool` as a prop and sync it with internal state:

```typescript
// Canvas.tsx - AFTER
interface CanvasProps {
  activeTool?: string;
}

export default function Canvas({ activeTool }: CanvasProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Sync external activeTool prop into internal state
  useEffect(() => {
    if (activeTool && activeTool !== state.activeTool) {
      console.log('🔧 Tool changed:', state.activeTool, '→', activeTool);
      dispatch({ activeTool: activeTool as any });
    }
  }, [activeTool, state.activeTool]);
}
```

```typescript
// room/[id]/page.tsx - AFTER
<Canvas activeTool={activeTool} />
```

### Fix 2: Register Missing Tool
Added the select tool to the registry:

```typescript
// tools/index.ts - AFTER
import { selectTool } from './selectTool';

const tools: Record<string, ToolHandler> = {
  select: selectTool,  // ← Added
  rect: rectTool,
  ellipse: ellipseTool,
  line: lineTool,
  pencil: pencilTool,
};
```

### Fix 3: Add Error Handling & Debugging
Added fallback behavior and console logging:

```typescript
// tools/index.ts - AFTER
export function getToolHandler(tool: string): ToolHandler {
  const handler = tools[tool];
  if (!handler) {
    console.error('❌ Tool not found:', tool, 'Available:', Object.keys(tools));
    return rectTool; // Fallback to prevent crashes
  }
  return handler;
}
```

Added debug logging in Canvas:

```typescript
// Canvas.tsx - AFTER
const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
  isDrawing.current = true;
  const { x, y } = getPos(e);

  console.log('👇 Pointer down with tool:', state.activeTool);

  const result = getToolHandler(state.activeTool).onPointerDown(state, x, y);
  dispatch(result);
}, [state, getPos]);
```

## Architecture Pattern

### Before (Broken)
```
┌─────────────────┐
│   RoomPage      │
│  activeTool: ✓  │ ← State updates here
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼──────────┐
│ToolBar│  │   Canvas    │
│   ✓   │  │activeTool: ✗│ ← Isolated state, never updates
└───────┘  └─────────────┘
```

### After (Fixed)
```
┌─────────────────┐
│   RoomPage      │
│  activeTool: ✓  │ ← Single source of truth
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼──────────┐
│ToolBar│  │   Canvas    │
│   ✓   │  │  prop: ✓    │ ← Receives tool via props
└───────┘  │  sync: ✓    │ ← Syncs to internal state
           └─────────────┘
```

## Testing & Verification

### Manual Testing Steps
1. Open the room page in browser
2. Open browser console (F12)
3. Click different tools in the toolbar
4. Verify console shows: `🔧 Tool changed: rect → ellipse`
5. Draw on canvas
6. Verify console shows: `👇 Pointer down with tool: ellipse`
7. Verify the correct shape is drawn (ellipse, not rectangle)

### Expected Console Output
```
🔧 Tool changed: rect → ellipse
👇 Pointer down with tool: ellipse
🔧 Tool changed: ellipse → pencil
👇 Pointer down with tool: pencil
```

## Lessons Learned

### 1. Single Source of Truth
State should live in the parent component and flow down via props, not be duplicated in child components.

### 2. Props vs Internal State
When a component needs to respond to external changes, accept props and sync them rather than maintaining isolated state.

### 3. Defensive Programming
Always validate inputs and provide fallbacks:
- Check if tool exists before using it
- Log errors for debugging
- Provide sensible defaults

### 4. Debug Logging
Strategic console.log statements help identify:
- When state changes occur
- What values are being used
- Where the flow breaks

## Prevention

### Code Review Checklist
- [ ] Is state duplicated across components?
- [ ] Are all registry entries defined and imported?
- [ ] Does the component accept necessary props?
- [ ] Is there error handling for lookups?
- [ ] Are there debug logs for critical paths?

### Type Safety Improvements
Consider adding runtime validation:

```typescript
// Future improvement
type ToolType = 'rect' | 'ellipse' | 'line' | 'pencil' | 'select';

function isValidTool(tool: string): tool is ToolType {
  return tool in tools;
}
```

## Related Files
- `y/apps/web/components/Canvas.tsx` - Main canvas component
- `y/apps/web/app/room/[id]/page.tsx` - Room page with state management
- `y/apps/web/tools/index.ts` - Tool registry
- `y/apps/web/components/ToolBar.tsx` - Tool selection UI

## Status
✅ **RESOLVED** - Tool switching now works correctly. All tools draw their respective shapes.
