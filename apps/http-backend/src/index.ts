import express from 'express';
import jwt from 'jsonwebtoken';
import { users } from './db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import 'dotenv/config'
import { authenticateToken, AuthRequest} from './middleware/auth.middleware';
import {createUserSchema, signinSchema, roomCreateSchema} from '@repo/common/types';
import {prismaClient} from "@repo/db/client";

const JWT_SECRET = process.env.JWT_SECRET || "2345678";

const app = express();
app.use(express.json());

export function generateToken(userId: string){
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

    const newUser = await prismaClient.user.create({
        data:{
            email,
            password: hashedPassword,
            name,
            photo: photo || ""
        }
    })

    const token = generateToken(newUser.id);

    return res.status(201).json({
        message: "User registeration successful",
        token
    });
});

app.post('/signin', async (req, res) => {
    const parsed = signinSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
            error: parsed.error.issues
        })
    }

    const {email, password} = parsed.data;

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
});

app.post('/rooms', authenticateToken, async (req: AuthRequest, res) => {

    const roomData = roomCreateSchema.safeParse(req.body);
    if(!roomData.success){
        return res.status(400).json({
            message: "Invalid Input"
        })
    }
    const {slug} = roomData.data;
    
    const room = await prismaClient.room.create({
        data:{
            slug,
            adminId: req.user.id
        }
    });
    // Save to DB
    res.json({ room });
});



app.listen(5000, () => {
    console.log("server running on port 5000");
});