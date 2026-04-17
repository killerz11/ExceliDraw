import {redis, setElement, deleteElement, getElements} from './redis';
import { prismaClient } from '@repo/db/client';

const dirtyElements = new Map<string, Map<string, any>>()
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>()

const DEBOUNCE_MS = 500;

export function markDirty(roomId: string, element: any): void{
    if(!dirtyElements.has(roomId)){
        dirtyElements.set(roomId, new Map());

    }
    dirtyElements.get(roomId)!.set(element.id, element);
    scheduleFlush(roomId);
}

function scheduleFlush(roomId: string):void{
    if(flushTimers.has(roomId)){
        clearTimeout(flushTimers.get(roomId));
    }

    const timer = setTimeout(() => {
        flushRoom(roomId)
        flushTimers.delete(roomId);
    }, DEBOUNCE_MS)

    flushTimers.set(roomId, timer);
}

async function flushRoom(roomId: string): Promise<void>{
    const dirty = dirtyElements.get(roomId);
    if(!dirty || dirty.size === 0) return;

    const elements = Array.from(dirty.values());
    dirtyElements.delete(roomId);

      try {
    // Batch upsert — 1 round trip regardless of element count
    await prismaClient.$transaction(
      elements.map(el =>
        prismaClient.element.upsert({
          where: { id: el.id },
          update: {
            data: el,
            version: { increment: 1 },
            isDeleted: el.isDeleted ?? false,
            updatedAt: new Date(),
          },
          create: {
            id: el.id,
            roomId,
            type: el.type,
            data: el,
            version: 1,
            isDeleted: false,
          },
        })
      )
    )
    console.log(`[Persistence] flushed ${elements.length} elements for room ${roomId}`)
  } catch (err) {
    console.error(`[Persistence] flush failed for room ${roomId}`, err)
    // Re-mark as dirty so next update triggers another flush attempt
    elements.forEach(el => markDirty(roomId, el))
  }
}

// Called when a user joins — load elements into Redis from Postgres if cache miss
export async function loadRoomElements(roomId: string): Promise<any[]> {
  // Check Redis first
  const cached = await getElements(roomId)

  if (Object.keys(cached).length > 0) {
    console.log(`[Persistence] cache hit for room ${roomId}`)
    return Object.values(cached).map(v => JSON.parse(v))
  }

  // Cache miss — load from Postgres
  console.log(`[Persistence] cache miss for room ${roomId}, loading from Postgres`)
  const rows = await prismaClient.element.findMany({
    where: { roomId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
  })

  // Populate Redis
  for (const row of rows) {
    await setElement(roomId, row.id, row.data as object)
  }

  return rows.map(row => row.data)
}

// Called on element_add and element_update
export async function persistElement(roomId: string, element: any): Promise<void> {
  await setElement(roomId, element.id, element)  // Redis immediately
  markDirty(roomId, element)                      // Postgres debounced
}

// Called on element_delete
export async function removeElement(roomId: string, elementId: string): Promise<void> {
  await deleteElement(roomId, elementId)          // Redis immediately
  markDirty(roomId, { id: elementId, isDeleted: true, roomId }) // Postgres debounced
}
