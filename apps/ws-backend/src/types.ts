import { WebSocket } from "ws";

export interface UserConnection {
    ws: WebSocket;
    rooms: Set<string>;
}

export interface ChatMessage {
    id?: number; // Optional for new messages (DB assigns ID)
    userId: string;
    message: string;
    timestamp: string;
}

export interface RoomChatState {
    messages: ChatMessage[];
    lastModified: Date;
    isDirty: boolean; // Has unsaved messages
    pendingMessages: ChatMessage[]; // Messages waiting to be saved to DB
}
