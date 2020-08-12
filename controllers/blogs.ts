import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken'
import { Blog } from "../models/blog"
import { User } from '../models/user';

interface DecodedToken {
    id: string;
    username: string;
}

const getTokenFrom = (request: Request) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

export const blogsRouter = Router()

blogsRouter.get('/', async (_: Request, res: Response) => {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
    res.json(blogs)
})

blogsRouter.post('/', async (req: Request, res: Response) => {
    const { title, url, likes } = req.body
    if (!url && !title) {
        return res.status(400).end()
    } else {
        const token = getTokenFrom(req)
        /*   The object decoded from the token contains the username and id fields, 
          which tells the server who made the request. */
        /* If the application has multiple interfaces requiring identification, 
        JWT's validation should be separated into its own middleware. 
        Some existing library like express-jwt could also be used.
        */
        // https://fullstackopen.com/en/part4/token_authentication
        const decodedToken = jwt.verify(token as string, process.env.SECRET as string)
        if (!token || !(decodedToken as DecodedToken).id) {
            return res.status(401).json({ error: 'token missing or invalid' })
        }
        const user = await User.findById((decodedToken as DecodedToken).id)
        const blog = new Blog({ ...req.body, user: user?._id, likes: likes || 0 })
        const savedBlog = await blog.save();
        (user as any).blogs = (user as any)?.blogs?.concat(savedBlog._id)
        await user?.save()
        res.status(201).json(savedBlog)
    }
})


blogsRouter.put('/:id', async (req: Request, res: Response) => {
    const { title, author, url, likes } = req.body
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, { title, author, url, likes }, { new: true })
    res.json(updatedBlog)
})

blogsRouter.delete("/:id", async (req: Request, res: Response) => {
    const deletedPost = await Blog.findByIdAndRemove(req.params.id)
    res.status(204).end()
})