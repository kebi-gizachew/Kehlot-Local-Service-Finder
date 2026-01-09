import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {connectDB,prisma} from './config/db.js'
import dotenv from 'dotenv'
import http from 'http'
import {Server} from 'socket.io'
import {userRouter} from './routes/userRoutes.js'
import {adminRouter} from './routes/adminRoutes.js'
import {providerRouter} from './routes/providerRoutes.js'
import {ratingRouter} from './routes/ratingRoutes.js'
import {categoryRouter} from './routes/categoryRoutes.js'
import cookieRouter from './routes/cookieRoutes.js' // Add this import
import messageRouter from './routes/messageRoutes.js' // Add this import
dotenv.config()
connectDB()

export const app=express()
const PORT=process.env.PORT || 4000
const server=http.createServer(app)

const io=new Server(server,{
    cors:{
        origin:['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials:true,
        methods: ["GET", "POST"]
    }
})

app.use(express.json({ limit: '50mb' }));
// Increase URL-encoded payload limit to 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
    origin:function (origin, callback) {
    // allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    // allow ALL http and https origins
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      return callback(null, true);
    }

    // block anything else
    return callback(new Error("Not allowed by CORS"));
  },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser())

// Serve static files for uploads/images
app.use('/uploads', express.static('uploads'))
app.use('/images', express.static('public/images'))

// Routes
app.use('/api/user',userRouter)
app.use('/api/cookie',cookieRouter) 
app.use('/api/admin',adminRouter)
app.use('/api/provider',providerRouter)
app.use('/api/rating',ratingRouter)
app.use('/api/category',categoryRouter)
app.use('/api/messages', messageRouter) // Add this line
// Socket.io
import {initSocket} from './sockets/chatSockets.js'
initSocket(io)

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})

export {io}