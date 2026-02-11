import express from 'express';
import {z} from 'zod';
import jwt from 'jsonwebtoken';
import { users } from './db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import 'dotenv/config'
import { authenticateToken, AuthRequest} from './middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || "2345678";

const app = express();
app.use(express.json());

export function generateToken(userId: string){
    return jwt.sign({id: userId}, JWT_SECRET, {expiresIn: "2d"});
}

const signupSchema = z.object({
    email:z.email(),
    password: z.string().min(6),
    name: z.string()
});

const signinSchema = z.object({
    email:z.email(),
    password: z.string().min(6),
})


app.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
            error: parsed.error.issues
        })
    }

    const {email, password, name} = parsed.data;

    const existingUser = users.find(u => u.email === email);
    if(existingUser){
        return res.status(400).json({error: "User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: randomUUID(),
        email: email,
        password: hashedPassword,
        name: name
    }

    users.push(newUser);

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

    const user = users.find(u => u.email === email);

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
    const { name } = req.body;
    const room = {
        id: randomUUID(),
        name,
        createdBy: req.user.id,
        createdAt: new Date()
    };
    // Save to DB
    res.json({ room });
});



app.listen(5000, () => {
    console.log("server running on port 5000");
});