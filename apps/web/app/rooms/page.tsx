'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../lib/api';

interface Room {
  id: string;
  slug: string;
}

export default function RoomsPage() {
  useAuth(); // redirect to /signin if no token

  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Create a new room
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.createRoom(slug.trim());
      // After creating, go straight into that room
      router.push(`/room/${res.room.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center px-4">

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-white mb-2">Your Rooms</h1>
        <p className="text-sm text-[#555]">Create a room and start drawing</p>
      </div>

      {/* Create room form */}
      <div className="w-full max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-xl px-8 py-8 mb-6">
        <h2 className="text-sm text-[#888] uppercase tracking-wider mb-4">Create a new room</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="room-name"
            required
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors"
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black font-medium text-sm rounded-lg py-2.5 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>

    </div>
  );
}