import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../store/db';
import { JWT_SECRET, authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password required' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await db
    .from('users')
    .insert({ username, email, password_hash: passwordHash })
    .select('id, username, email')
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    res.status(isDupe ? 409 : 500).json({ error: isDupe ? 'Email already in use' : error.message });
    return;
  }

  const token = jwt.sign({ userId: data.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: data.id, username: data.username, email: data.email } });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const { data: user, error } = await db
    .from('users')
    .select('id, username, email, password_hash')
    .eq('email', email)
    .single();

  if (error || !user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await db
    .from('users')
    .select('id, username, email')
    .eq('id', req.userId)
    .single();

  if (error || !data) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(data);
});

export default router;
