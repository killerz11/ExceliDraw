'use client';
import { use, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRoom } from '../../../hooks/useRoom';
import Canvas from '../../../components/Canvas';
import ToolBar from '../../../components/ToolBar';
import { ToolType } from '../../../lib/types';

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  useAuth(); // redirect to /signin if no token

  // Next.js 15 — params is a Promise, must unwrap with use()
  const { id } = use(params);

  // WebSocket connection — gives us chat + sendElement for Phase 5
  const { messages, connected, sendMessage, sendElement } = useRoom(id);

  // Active drawing tool state
  const [activeTool, setActiveTool] = useState<ToolType>('rect');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0d0d]">

      {/* Canvas takes up the full screen */}
      <div className="relative flex-1 h-full">

        {/* ToolBar floats on the left side over the canvas */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <ToolBar activeTool={activeTool} onToolChange={setActiveTool} />
        </div>

        {/* Connection status badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border
            ${connected
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#555]'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-[#555]'}`} />
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        {/* The actual drawing canvas */}
        <Canvas />

      </div>

    </div>
  );
}