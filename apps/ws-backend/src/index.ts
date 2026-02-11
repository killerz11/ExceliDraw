import {WebSocketServer} from "ws";
import jwt, { JwtPayload } from 'jsonwebtoken';
import 'dotenv/config';

interface TokenPayload {
    id: string;
    iat?: number;
    exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "1234567";
const wss = new WebSocketServer({ port: 8080 });

// In ws-backend
wss.on('connection', (ws, req) => {
    if (!req.url) {
        ws.close(1008, 'Invalid request');
        return;
    }

    const token = new URL(req.url, 'http://localhost').searchParams.get('token') || "";
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (!decoded.id) {
        ws.close(1008, 'Invalid token');
        return;
    }

});
