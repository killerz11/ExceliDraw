//http-backend/apps/src/index.ts
import { config } from 'dotenv';
import * as path from 'path';

// Load .env explicitly from workspace root (2 levels up from src)
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateToken, AuthRequest} from './middleware/auth.middleware';
import {createUserSchema, signinSchema, roomCreateSchema} from '@repo/common/types';
import {prismaClient} from "@repo/db/client";

const JWT_SECRET = process.env.JWT_SECRET || "123456789";

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

console.log("JWT_SECRET loaded successfully");

const app = express();

// CORS configuration - Allow all origins in development
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

export function generateToken(userId: string){
    console.log("Generating token with JWT_SECRET:", JWT_SECRET.substring(0, 4) + "****");
    return jwt.sign({id: userId}, JWT_SECRET, {expiresIn: "2d"});
}

app.post('/signup', async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
            error: parsed.error.issues
        })
    }

    const {email, password, name, photo} = parsed.data;

    const existingUser = await prismaClient.user.findUnique({
        where: {email}
    });
    if(existingUser){
        return res.status(400).json({error: "User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try{
        const newUser = await prismaClient.user.create({
        data:{
            email,
            password: hashedPassword,
            name,
            photo: photo || ""
        }
    });
        const token = generateToken(newUser.id);

        return res.status(201).json({
            message: "User registeration successful",
            token
        });
    }catch(e){
        return res.status(400).json({
            message:"User registeration failed",
            error:e
        }
        )
    }
    
});

app.post('/signin', async (req, res) => {
    const parsed = signinSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
            error: parsed.error.issues
        })
    }

    const {email, password} = parsed.data;

    try{
    const user = await prismaClient.user.findUnique({
        where:{email}
    })

    if(!user){
        return res.status(400).json({error: "User does not exist"});
    };

    const isValid = await bcrypt.compare(password, user.password);
    if(!isValid){
        return res.status(400).json({
            error: "Invalid Password"
        })
    }

    const token = generateToken(user.id);

    return res.status(201).json({
        message: "Succesfull login",
        token
    });
    } catch(e){
        return res.status(401).json({
            message: "Run into the error",
            error:e
        })
    }
});

app.get('/rooms/:slug', async (req, res) => {
    const { slug } = req.params;

    try {
        const room = await prismaClient.room.findUnique({
            where: { slug }
        });

        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        res.json({ room });
    } catch (e) {
        return res.status(500).json({
            message: "Error fetching room",
            error: e
        });
    }
});

app.post('/rooms', authenticateToken, async (req: AuthRequest, res) => {

    const roomData = roomCreateSchema.safeParse(req.body);
    if(!roomData.success){
        return res.status(400).json({
            message: "Invalid Input"
        })
    }
    const {slug} = roomData.data;
    
    // Check if room already exists
    const existingRoom = await prismaClient.room.findUnique({
        where: { slug }
    });

    if (existingRoom) {
        return res.status(400).json({ 
            error: "Room with this slug already exists" 
        });
    }
    
    const room = await prismaClient.room.create({
        data:{
            slug,
            adminId: req.user.id
        }
    });
    res.json({ room });
});

app.get('/chats/:roomId', async (req, res) => {
    const roomId = req.params.roomId;

    const chats = await prismaClient.chat.findMany({
        where:{
            roomId: roomId
        },
        orderBy:{
            createdAt: 'asc'
        },
        take:50
    });

    res.json({ chats });
});

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🚀 HTTP Backend running on http://${HOST}:${PORT}`);
    console.log(`📡 Accessible on network at http://100.73.210.34:${PORT}`);
});
