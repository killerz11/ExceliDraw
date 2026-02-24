import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';

export interface AuthRequest extends Request {
    user?: any;
}

export function authenticateToken(req : AuthRequest, res : Response, next: NextFunction){
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
        return res.status(500).json({error: "Server configuration error"});
    }
    
    const token = req.headers.authorization?.split(' ')[1];

    if(!token){
        return res.status(401).json({error : "No token"})
    }

    try {
        console.log("Verifying token with JWT_SECRET:", JWT_SECRET.substring(0, 4) + "****");
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log("Token verification failed:", error);
        return res.status(403).json({ error: "Invalid token" });
    }
}
