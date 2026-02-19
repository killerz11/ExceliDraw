import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || "2345678";

export interface AuthRequest extends Request {
    user?: any; // or { id: string } for better typing
}

export function authenticateToken(req : AuthRequest, res : Response, next: NextFunction){
    const token = req.headers.authorization?.split(' ')[1];

    if(!token){
        return res.status(401).json({error : "No token"})
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user to request
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid token" });
    }
}