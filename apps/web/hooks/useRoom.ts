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

export function useRoom(roomId: string,
  onElementReceived: (element: Element) => void, 
  onElementsLoaded: (elements: Element[]) => void): UseRoomReturn {
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
        type: 'element_update',
        payload: { roomId, element }
      }));
    }
  }, [roomId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.error('❌ No token found - user not logged in');
      return;
    }

    // Resolve WS_URL at runtime so window.location is available
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
      `ws://${window.location.hostname}:8080`;

    console.log('🔌 Attempting WebSocket connection to:', WS_URL);
    console.log('🎫 Token:', token.substring(0, 20) + '...');

    // Connect to WebSocket with token
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      setConnected(true);
      
      // Join the room
      console.log('📨 Sending join_room for:', roomId);
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: { roomId }
      }));
    };

    ws.onmessage = (event) => {
      console.log('📩 Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'joined_room':
            console.log('✅ Joined room:', data.payload);
            // Load chat history if provided
            if (data.payload.chatHistory) {
              setMessages(data.payload.chatHistory);
            }
            if (data.payload.elements && data.payload.elements.length > 0) {
              onElementsLoaded(data.payload.elements);
            }
            break;
            
          case 'chat':
            setMessages(prev => [...prev, {
              userId: data.payload.userId,
              message: data.payload.message,
              timestamp: data.payload.timestamp
            }]);
            break;

          case 'element_update':
            console.log('🎨 Received element update:', data.payload.element);
            onElementReceived(data.payload.element);
            break;  
            
          case 'error':
            console.error('❌ WebSocket error message:', data.payload);
            break;
        }
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket connection error - Is ws-backend running on port 8080?');
      console.error('Error details:', error);
      setConnected(false);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected');
      console.log('Close code:', event.code, 'Reason:', event.reason);
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
