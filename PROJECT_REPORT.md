# ExceliDraw — Project Report

## Overview

**ExceliDraw** is a real-time collaborative drawing application. Multiple users can join a named "room" and draw shapes on a shared canvas simultaneously. Changes are broadcast over WebSocket so every participant sees updates live. A chat system is layered on top of the same WebSocket connection.

The project is a **pnpm monorepo** managed by **Turborepo**, split into three runnable apps and four shared packages.

---

## Repository Structure

```
y/                              ← monorepo root
├── apps/
│   ├── web/                    ← Next.js 16 frontend
│   ├── http-backend/           ← Express REST API (port 5000)
│   └── ws-backend/             ← Node.js WebSocket server (port 8080)
└── packages/
    ├── DB/                     ← @repo/db  — Prisma client + schema
    ├── common/                 ← @repo/common — shared Zod schemas
    ├── backend-common/         ← @repo/backend-common — (empty, reserved)
    ├── ui/                     ← @repo/ui — stub React component library
    ├── eslint-config/          ← shared ESLint configs
    └── typescript-config/      ← shared tsconfig bases
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| HTTP API | Express 5, JWT (jsonwebtoken), bcrypt, Zod |
| WebSocket | ws (Node.js), JWT auth via query param |
| Database | PostgreSQL (Neon serverless) via Prisma 7 + `@prisma/adapter-pg` |
| Validation | Zod v4 (shared via `@repo/common`) |
| Monorepo | Turborepo 2, pnpm 9 workspaces |
| Language | TypeScript throughout |

---

## Apps

### `apps/web` — Next.js Frontend

**Port:** 3000 (dev), bound to `0.0.0.0`  
**Framework:** Next.js 16 App Router, React 19, Tailwind CSS v4

#### Routes

| Route | Description |
|---|---|
| `/` | Landing page — links to signup/signin |
| `/signup` | Registration form |
| `/signin` | Login form |
| `/rooms` | Join or create a room by slug |
| `/room/[id]` | The actual collaborative canvas room |

#### Key Components

**`components/Canvas.tsx`**
- Core drawing surface using a raw HTML5 `<canvas>` element
- State managed with `useReducer` — `AppState` holds `elements`, `preview`, `activeTool`, `selectedIds`
- Pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) delegate to the active tool handler
- Undo/redo via a `history` ref array with `historyIndex` — triggered by `Ctrl+Z` / `Ctrl+Y`
- Remote elements received via WebSocket are merged into local state using `applyRemoteElement` (upsert by `id`)
- Canvas resizes to fill its container on mount and window resize

**`components/ToolBar.tsx`**
- Vertical floating toolbar with 5 tool buttons: Select, Rectangle, Ellipse, Line, Pencil
- Highlights the active tool with a white background

#### Drawing Tools (`apps/web/tools/`)

Each tool implements the `ToolHandler` interface:
```ts
interface ToolHandler {
  onPointerDown(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerMove(state: AppState, x: number, y: number): Partial<AppState>;
  onPointerUp(state: AppState, x: number, y: number): Partial<AppState>;
}
```

| Tool | File | Behavior |
|---|---|---|
| `rect` | `rectTool.ts` | Click-drag to draw rectangle; handles negative drag direction |
| `ellipse` | `ellipseTool.ts` | Click-drag to draw ellipse using center + radii |
| `line` | `lineTool.ts` | Click-drag to draw a straight line |
| `pencil` | `pencilTool.ts` | Freehand path — accumulates points on every `pointermove` |
| `select` | `selectTool.ts` | Click to select, drag to move, drag handles to resize |

All tools use a **preview pattern**: a temporary element is shown while dragging, then committed to `state.elements` on pointer up.

The `selectTool` has three internal modes: `idle`, `moving`, `resizing`. It uses `getHitElement` (hit testing) and `getHitHandle` (handle hit testing) to determine what the user clicked.

#### Library (`apps/web/lib/`)

| File | Purpose |
|---|---|
| `types.ts` | All TypeScript types: `RectElement`, `EllipseElement`, `LineElement`, `PencilElement`, `Element` (union), `AppState`, `ToolType` |
| `renderer.ts` | `drawElement()` and `renderCanvas()` — pure canvas 2D drawing functions |
| `hitTest.ts` | Per-shape hit testing using distance-to-segment math; `getHitElement()` returns topmost clicked shape |
| `handle.ts` | Bounding box calculation, 8-handle positions (nw/n/ne/e/se/s/sw/w), handle drawing, handle hit testing |
| `api.ts` | Typed HTTP client wrapping `fetch`; token stored in `localStorage`; `ApiError` class for error handling |
| `uuid.ts` | UUID v4 generator using `crypto.randomUUID()` with manual fallback |

#### Hooks

**`useRoom(roomId, onElementReceived)`**
- Manages the WebSocket lifecycle for a room
- Connects to `NEXT_PUBLIC_WS_URL` (falls back to `ws://<hostname>:8080`) with JWT token as query param
- On open: sends `join_room`
- Handles incoming message types: `joined_room` (loads chat history), `chat`, `element_update`, `error`
- `sendMessage(msg)` — sends a `chat` message to the room
- `sendElement(el)` — sends an `element_update` to broadcast a drawn shape
- On unmount: sends `leave_room` and closes the socket
- Returns `{ messages, connected, sendMessage, sendElement }`

**`useAuth()`**
- Checks `localStorage` for a token on mount
- Redirects to `/signin` if missing

#### Environment Variables

```
NEXT_PUBLIC_API_URL=http://<host>:5000
NEXT_PUBLIC_WS_URL=ws://<host>:8080
```

Both fall back to `window.location.hostname` at runtime if not set.

---

### `apps/http-backend` — REST API

**Port:** 5000, bound to `0.0.0.0`  
**Framework:** Express 5

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | No | Register user — validates with `createUserSchema`, hashes password with bcrypt (10 rounds), returns JWT |
| `POST` | `/signin` | No | Login — validates with `signinSchema`, compares bcrypt hash, returns JWT |
| `GET` | `/rooms/:slug` | No | Fetch room by slug |
| `POST` | `/rooms` | Yes (JWT) | Create a new room — checks slug uniqueness, sets `adminId` to requesting user |
| `GET` | `/chats/:roomId` | No | Fetch last 50 chat messages for a room, ordered by `createdAt` asc |

#### Auth Middleware (`auth.middleware.ts`)

- Extracts Bearer token from `Authorization` header
- Verifies with `JWT_SECRET` from env
- Attaches decoded payload to `req.user`
- Returns 401 if no token, 403 if invalid

#### Notes

- CORS is set to `origin: true` (all origins) — suitable for development, should be locked down for production
- JWT expiry is 2 days
- `@types/bcrypt` and `@types/express` are listed under `dependencies` instead of `devDependencies` (minor packaging issue)

---

### `apps/ws-backend` — WebSocket Server

**Port:** 8080, bound to `0.0.0.0`  
**Library:** `ws`

#### Authentication

JWT token is passed as a URL query parameter on connection:
```
ws://host:8080?token=<jwt>
```
The `checkUser()` function verifies the token and extracts `userId`. Invalid tokens close the connection with code 1008.

#### In-Memory State

```ts
connections: Map<userId, { ws: WebSocket, rooms: Set<roomId> }>
rooms:       Map<roomId, Set<userId>>
roomChatStates: Map<roomId, RoomChatState>
```

#### Message Protocol

All messages follow `{ type: string, payload: object }`.

**Client → Server:**

| Type | Payload | Description |
|---|---|---|
| `join_room` | `{ roomId }` | Join a room; server loads chat history from DB and sends it back |
| `leave_room` | `{ roomId }` | Leave a room; triggers cleanup if room becomes empty |
| `chat` | `{ roomId, message }` | Send a chat message; broadcast to all other users in room |
| `element_update` | `{ roomId, element }` | Broadcast a drawn element to all other users in room |

**Server → Client:**

| Type | Payload | Description |
|---|---|---|
| `joined_room` | `{ roomId, chatHistory }` | Confirmation + full chat history |
| `user_joined` | `{ userId, roomId }` | Notifies others when someone joins |
| `user_left` | `{ userId, roomId }` | Notifies others when someone leaves |
| `left_room` | `{ roomId }` | Confirmation of leaving |
| `chat` | `{ userId, roomId, message, timestamp }` | Incoming chat message |
| `element_update` | `{ element }` | Incoming drawing element from another user |
| `error` | `{ message }` | Error response |

#### Chat Persistence Strategy

Chat messages are **not written to the database immediately**. Instead:

1. New messages are appended to `RoomChatState.messages` (in-memory) and `pendingMessages` queue
2. A background `setInterval` runs every **10 seconds** and batch-inserts all pending messages via `prismaClient.chat.createMany()`
3. When a room becomes empty (last user leaves or disconnects), pending messages are flushed before the room state is removed from memory

This reduces DB write pressure at the cost of potential message loss if the process crashes before the flush.

#### Disconnect Handling

On WebSocket `close`, the server:
1. Removes the user from all rooms they were in
2. Broadcasts `user_left` to remaining room members
3. Flushes and cleans up any empty rooms

---

## Shared Packages

### `packages/DB` (`@repo/db`)

- Exports `prismaClient` (and as default) from `./src/index.ts`
- Uses `@prisma/adapter-pg` with a `pg.Pool` for connection pooling — required for Neon serverless PostgreSQL
- Implements the global singleton pattern to prevent multiple Prisma instances in development (hot reload)
- `DATABASE_URL` loaded from root `.env`

#### Prisma Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  photo     String?
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  chats     Chat[]
  room      Room[]
}

model Room {
  id        String   @id @default(uuid())
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  adminId   String
  chats     Chat[]
  admin     User     @relation(fields: [adminId], references: [id])
}

model Chat {
  id        Int      @id @default(autoincrement())
  roomId    String
  userId    String
  message   String
  createdAt DateTime @default(now())
  room      Room     @relation(fields: [roomId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

4 migrations applied. `Chat.id` is an auto-increment `Int`; `User.id` and `Room.id` are UUIDs.

### `packages/common` (`@repo/common`)

Shared Zod v4 validation schemas used by both the HTTP backend and (potentially) the frontend:

```ts
signinSchema     — { email, password (min 6) }
createUserSchema — { email, password (min 6), name, photo? (url) }
roomCreateSchema — { slug }
```

### `packages/backend-common` (`@repo/backend-common`)

Package exists and is declared in the monorepo but `src/index.ts` is currently empty. Intended for shared backend utilities.

### `packages/ui` (`@repo/ui`)

Stub React component library with `button.tsx`, `card.tsx`, `code.tsx`. Not currently used by the web app.

---

## Data Flow

### Drawing (element sync)

```
User draws on canvas
  → tool handler produces Element
  → committed to local state (immediate render)
  → sendElement(element) via useRoom
    → WS: { type: 'element_update', payload: { roomId, element } }
      → ws-backend broadcasts to all other users in room
        → WS: { type: 'element_update', payload: { element } }
          → onElementReceived callback in useRoom
            → applyRemoteElement() merges by id into Canvas state
              → canvas re-renders
```

### Chat

```
User types message
  → sendMessage(msg) via useRoom
    → WS: { type: 'chat', payload: { roomId, message } }
      → ws-backend adds to in-memory RoomChatState + pendingMessages
      → broadcasts to all other users in room
        → WS: { type: 'chat', payload: { userId, roomId, message, timestamp } }
          → setMessages() in useRoom updates React state
      → every 10s: batch INSERT pendingMessages to DB
```

### Auth

```
Signup/Signin → POST /signup or /signin
  → JWT returned → stored in localStorage
  → useRoom reads token from localStorage
  → passed as ?token= on WS connection URL
  → ws-backend verifies JWT on connect
```

---

## Known Issues & Observations

1. **JWT secret in `.env` is `"12345678"`** — trivially weak, must be changed before any deployment.

2. **`.env` is committed to the repo** — contains the live Neon `DATABASE_URL` with credentials. This is a security risk.

3. **CORS is fully open** (`origin: true`) in http-backend — fine for local dev, dangerous in production.

4. **`@types/*` packages in `dependencies`** (not `devDependencies`) in http-backend — they ship to production unnecessarily.

5. **`packages/backend-common/src/index.ts` is empty** — the package is wired up but has no content.

6. **No canvas state persistence** — drawing elements exist only in memory. Refreshing the page loses all drawings. There is no mechanism to save or load canvas state from the DB.

7. **`element_update` is not persisted** — only chat messages are saved to the database. Canvas drawings are ephemeral and only exist while users are connected.

8. **WS server has no reconnection logic on the client** — if the WebSocket drops, `useRoom` does not attempt to reconnect.

9. **`useRoom` sends the last drawn element only** on `onPointerUp` — not the full canvas state. New users joining a room receive chat history but no drawing history.

10. **Select tool resize for ellipse is approximate** — the resize math uses `dx/2` increments which can drift from the handle position over large drags.

11. **Module type mismatch risk** — all backend packages use `"type": "commonjs"` but import via `tsx` in dev (which handles ESM/CJS transparently). The built `dist/` output is CJS, which is consistent.

12. **`prisma.config.ts` is at the DB package root** but the schema datasource block has no `url` field — it relies entirely on the `DATABASE_URL` env var being present at migration time.

---

## Running the Project

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Or run individually
pnpm dev --filter=web
pnpm dev --filter=http-backend
pnpm dev --filter=ws-backend
```

**Ports:**
- Web: `3000`
- HTTP API: `5000`
- WebSocket: `8080`

**Required env (root `.env`):**
```
JWT_SECRET="<strong-secret>"
DATABASE_URL="postgresql://..."
```

**Required env (`apps/web/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://<host>:5000
NEXT_PUBLIC_WS_URL=ws://<host>:8080
```
