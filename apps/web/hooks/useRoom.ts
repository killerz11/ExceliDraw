'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getToken } from '../lib/api';
import { Element } from '../lib/types';

interface ChatMessage {
  userId: string;
  message: string;
  timestamp: string;
}

interface UseRoomReturn {
  messages: ChatMessage[];
  connected: boolean;
  sendMessage: (message: string) => void;
  sendElement: (element: Element) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function useRoom(roomId: string): UseRoomReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        payload: { roomId, message }
      }));
    }
  }, [roomId]);

  const sendElement = useCallback((element: Element) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'draw',
        payload: { roomId, element }
      }));
    }
  }, [roomId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Connect to WebSocket with token
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Join the room
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: { roomId }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'joined_room':
            console.log('Joined room:', data.payload);
            // Load chat history if provided
            if (data.payload.chatHistory) {
              setMessages(data.payload.chatHistory);
            }
            break;
            
          case 'chat':
            setMessages(prev => [...prev, {
              userId: data.payload.userId,
              message: data.payload.message,
              timestamp: data.payload.timestamp
            }]);
            break;
            
          case 'error':
            console.error('WebSocket error:', data.payload);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'leave_room',
          payload: { roomId }
        }));
      }
      ws.close();
    };
  }, [roomId]);

  return {
    messages,
    connected,
    sendMessage,
    sendElement
  };
}
