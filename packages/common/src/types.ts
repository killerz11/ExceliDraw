import {z} from "zod";

export const signinSchema = z.object({
    email:z.email(),
    password: z.string().min(6),
})

export const createUserSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
    name: z.string(),
    photo: z.string().url().optional(),
})

export const roomCreateSchema = z.object({
    slug : z.string(),
    adminId : z.string()
})