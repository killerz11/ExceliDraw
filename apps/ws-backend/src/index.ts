import {WebSocketServer, WebSocket} from "ws";
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import * as path from 'path';
import prismaClient from "@repo/db/client";
import { UserConnection, ChatMessage, RoomChatState } from "./types";

// Load .env from workspace root
config({ path: path.resolve(__dirname, '../../.env') });

interface TokenPayload {
    id: string;
    iat?: number;
    exp?: number;
}

const connections = new Map<string, UserConnection>();
// Map to store chat rooms and their associated user IDs
const rooms = new Map<string, Set<string>>();
// In-memory chat state for active rooms
const roomChatStates = new Map<string, RoomChatState>();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

const wss = new WebSocketServer({ port: 8080 });

function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    const userIds = rooms.get(roomId);
    if (!userIds) {
        console.log(`[Broadcast] Room ${roomId} not found`);
        return;
    }

    console.log(`[Broadcast] Sending to room ${roomId}, users: ${Array.from(userIds).join(', ')}, exclude: ${excludeUserId || 'none'}`);

    const payload = JSON.stringify(message);
    userIds.forEach(userId => {
        if (userId === excludeUserId) {
            console.log(`[Broadcast] Skipping excluded user ${userId}`);
            return;
        }
        
        const conn = connections.get(userId);
        if (conn && conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(payload);
            console.log(`[Broadcast] Sent to user ${userId}`);
        } else {
            console.log(`[Broadcast] User ${userId} connection not ready (state: ${conn?.ws.readyState})`);
        }
    });
}

function checkUser(token: string): string | null {
    if (!JWT_SECRET) {
        return null;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (typeof decoded === "string" || !decoded || typeof decoded !== "object" || !("id" in decoded)) {
            return null;
        }
        
        return decoded.id as string;
    } catch (error) {
        return null;
    }
}

async function loadChatHistory(roomId: string): Promise<RoomChatState> {
    try{
        const chats = await prismaClient.chat.findMany({
            where:{roomId},
            orderBy:{createdAt:'asc'},
            take: 100
        });

         const messages: ChatMessage[] = chats.map((chat: any) => ({
            id: chat.id,
            userId: chat.userId,
            message: chat.message,
            timestamp: chat.createdAt.toISOString()
        }));

        return {
            messages,
            lastModified: new Date(),
            isDirty: false,
            pendingMessages: []
        };
    }catch(error){
        console.error(`Error loading chat history for room ${roomId}:`, error);
        return {
            messages: [],
            lastModified: new Date(),
            isDirty: false,
            pendingMessages: []
        };
    }
}

async function savePendingMessages(roomId: string, state: RoomChatState): Promise<void> {
    if (state.pendingMessages.length === 0) {
        return;
    }
    // Clear pending queue
    const messagesToSave = [...state.pendingMessages];
    state.pendingMessages = [];

    try { 
        // Batch insert all pending messages
        const savedChats = await prismaClient.chat.createMany({
            data: messagesToSave.map(msg => ({
                roomId,
                userId: msg.userId,
                message: msg.message,
                createdAt: new Date(msg.timestamp)
            }))
        });

        console.log(`✅ Saved ${savedChats.count} messages for room ${roomId}`);
    } catch (error) {
        console.error(`❌ Error saving messages for room ${roomId}:`, error);
        // Re-add messages to pending queue on failure
        state.pendingMessages.push(...messagesToSave);
    }
}

async function getChatState(roomId: string): Promise<RoomChatState> {
    if (!roomChatStates.has(roomId)) {
        const state = await loadChatHistory(roomId);
        roomChatStates.set(roomId, state);
    }
    return roomChatStates.get(roomId)!;
}

// In ws-backend
wss.on('connection', (ws, req) => {
    if (!req.url) {
        ws.close(1008, 'Invalid request');
        return;
    }

    const token = new URL(req.url, 'http://localhost').searchParams.get('token') || "";
    const userId = checkUser(token);

    if (!userId) {
        ws.close(1008, 'Invalid token');
        return;
    }

    connections.set(userId, {
        ws,
        rooms: new Set()
    });

    ws.on('message', async function message(data) {
        console.log(`\n[Message] Received from user ${userId}:`, data.toString());
        
        try {
            const parsedData = JSON.parse(data.toString());
            const { type, payload } = parsedData;
            
            console.log(`[Message] Type: ${type}, Payload:`, payload);
            console.log(`[State] Total connections: ${connections.size}, Total rooms: ${rooms.size}`);
            
            switch (type) {
                case 'join_room': {
                    const userConn = connections.get(userId);
                    
                    if (!userConn) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "User not connected" }
                        }));
                        break;
                    }
                    
                    if (!payload || !payload.roomId) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "roomId is required" }
                        }));
                        break;
                    }
                    
                    const roomId = payload.roomId;
                    
                    // Add room to user's rooms
                    userConn.rooms.add(roomId);
                    
                    // Create room if it doesn't exist
                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, new Set());
                    }
                    
                    // Add user to room
                    rooms.get(roomId)?.add(userId);

                    // Load chat history for the room
                    const chatState = await getChatState(roomId);
                    
                    // Send confirmation
                    ws.send(JSON.stringify({
                        type: 'joined_room',
                        payload: { roomId,
                                   chatHistory: chatState.messages
                         }
                    }));
                    
                    // Notify other users in the room
                    broadcastToRoom(roomId, {
                        type: 'user_joined',
                        payload: { userId, roomId }
                    }, userId);
                    
                    console.log(`User ${userId} joined room ${roomId}`);
                    break;
                }
                
                case 'leave_room': {
                    const userConn = connections.get(userId);
                    
                    if (!userConn) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "User not connected" }
                        }));
                        break;
                    }
                    
                    if (!payload || !payload.roomId) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "roomId is required" }
                        }));
                        break;
                    }
                    
                    const roomId = payload.roomId;
                    
                    // Remove room from user's rooms
                    userConn.rooms.delete(roomId);
                    
                    // Remove user from the room
                    const room = rooms.get(roomId);
                    if (room) {
                        room.delete(userId);
                        
                        // Notify other users before cleaning up
                        if (room.size > 0) {
                            broadcastToRoom(roomId, {
                                type: 'user_left',
                                payload: { userId, roomId }
                            });
                        }
                        
                        // If room is empty, save pending messages and cleanup
                        if (room.size === 0) {
                            rooms.delete(roomId);
                            
                            const chatState = roomChatStates.get(roomId);
                            if (chatState && chatState.isDirty) {
                                // Save pending messages before removing from memory
                                savePendingMessages(roomId, chatState).then(() => {
                                    roomChatStates.delete(roomId);
                                    console.log(`🧹 Room ${roomId} empty - saved and cleaned up`);
                                });
                            } else {
                                roomChatStates.delete(roomId);
                            }
                        }
                    }
                    
                    // Notify user they left
                    ws.send(JSON.stringify({
                        type: 'left_room',
                        payload: { roomId }
                    }));
                    
                    console.log(`User ${userId} left room ${roomId}`);
                    break;
                }

                
                case 'chat': {
                    console.log(`[Chat] Received from user ${userId}, payload:`, payload);
                    
                    const userConn = connections.get(userId);
                    
                    if (!userConn) {
                        console.log(`[Chat] ERROR: User ${userId} connection not found`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "User not connected" }
                        }));
                        break;
                    }
                    
                    if (!payload || !payload.roomId || !payload.message) {
                        console.log(`[Chat] ERROR: Missing roomId or message`, payload);
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "roomId and message are required" }
                        }));
                        break;
                    }
                    
                    const roomId = payload.roomId;
                    const message = payload.message;
                    
                    console.log(`[Chat] User ${userId} rooms:`, Array.from(userConn.rooms));
                    console.log(`[Chat] Checking if user is in room ${roomId}`);
                    
                    // Check if user is in the room
                    if (!userConn.rooms.has(roomId)) {
                        console.log(`[Chat] ERROR: User ${userId} not in room ${roomId}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: { message: "You are not in this room" }
                        }));
                        break;
                    }
                    
                    console.log(`[Chat] User ${userId} is in room, broadcasting message`);
                    
                    const chatState = await getChatState(roomId);

                    // Create chat message
                    const chatMessage: ChatMessage = {
                        userId,
                        message,
                        timestamp: new Date().toISOString()
                    };

                     // Add to in-memory state
                    chatState.messages.push(chatMessage);
                    chatState.pendingMessages.push(chatMessage);
                    chatState.lastModified = new Date();
                    chatState.isDirty = true;

                    // Broadcast message to all users in the room (including sender)
                    broadcastToRoom(roomId, {
                        type: 'chat',
                        payload: {
                            userId,
                            roomId,
                            message,
                            timestamp: chatMessage.timestamp
                        }
                    });
                    
                    console.log(`[Chat] User ${userId} sent message to room ${roomId}: ${message}`);
                    break;
                }
                
                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: { message: 'Unknown message type' }
                    }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Invalid message format' }
            }));
        }
    });
    
    ws.on('close', () => {
    const userConn = connections.get(userId);
    
    if (userConn) {
        // Leave all rooms user was in
        userConn.rooms.forEach(roomId => {
            const room = rooms.get(roomId);
            if (room) {
                room.delete(userId);
                
                // Notify others
                if (room.size > 0) {
                    broadcastToRoom(roomId, {
                        type: 'user_left',
                        payload: { userId, roomId }
                    });
                }
                
                // Clean up empty room and save pending messages
                if (room.size === 0) {
                    rooms.delete(roomId);
                    
                    const chatState = roomChatStates.get(roomId);
                    if (chatState && chatState.isDirty) {
                        savePendingMessages(roomId, chatState).then(() => {
                            roomChatStates.delete(roomId);
                            console.log(`🧹 Room ${roomId} empty after disconnect - saved and cleaned up`);
                        });
                    } else {
                        roomChatStates.delete(roomId);
                    }
                }
            }
        });
        
        // Remove connection
        connections.delete(userId);
        console.log(`User ${userId} disconnected`);
    }
});

    
        console.log(`User ${userId} connected`);
});

// Background worker: Save pending messages every 10 seconds
setInterval(() => {
    roomChatStates.forEach((state, roomId) => {
        if (state.isDirty && state.pendingMessages.length > 0) {
            savePendingMessages(roomId, state).then(() => {
                state.isDirty = false;
            });
        }
    });
}, 10000); // 10 seconds

console.log('WebSocket server running on port 8080');
console.log('💾 Chat auto-save worker started (10s interval)');
