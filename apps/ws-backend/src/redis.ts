import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(REDIS_URL)

redis.on('connect', () => console.log('[Redis] connected'))
redis.on('error', (err) => console.error('[Redis] error', err))

// Keys
export const roomElementsKey = (roomId: string) => `room:${roomId}:elements`

// Operations
export async function getElements(roomId: string): Promise<Record<string, string>> {
  return redis.hgetall(roomElementsKey(roomId))
}

export async function setElement(roomId: string, elementId: string, data: object): Promise<void> {
  await redis.hset(roomElementsKey(roomId), elementId, JSON.stringify(data))
  await redis.expire(roomElementsKey(roomId), 60 * 60 * 24) // 24h TTL
} 

export async function deleteElement(roomId: string, elementId: string): Promise<void> {
  await redis.hdel(roomElementsKey(roomId), elementId)
}

export async function roomExists(roomId: string): Promise<boolean> {
  const count = await redis.hlen(roomElementsKey(roomId))
  return count > 0
}