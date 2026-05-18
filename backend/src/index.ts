import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth';
import { createHabitsRouter } from './routes/habits';
import analyticsRouter from './routes/analytics';
import { JWT_SECRET } from './middleware/auth';

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://veera-bharath.github.io',
];

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/habits', createHabitsRouter(io));
app.use('/analytics', analyticsRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) { next(new Error('No token')); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', socket => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  console.log(`[ws] user ${userId} connected`);
  socket.on('disconnect', () => console.log(`[ws] user ${userId} disconnected`));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Streakly backend running on :${PORT}`));
