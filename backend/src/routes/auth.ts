import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../store/db';
import { JWT_SECRET, authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getEmailService } from '../di/container';

// Simple in-memory rate limiter: max 3 requests per email per hour
const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = forgotPasswordAttempts.get(email);
  if (!entry || entry.resetAt < now) {
    forgotPasswordAttempts.set(email, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count += 1;
  return true;
}

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

router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const OK = { message: 'If that email exists, a reset link has been sent.' };

  if (!email || typeof email !== 'string') { res.json(OK); return; }

  if (!checkRateLimit(email.toLowerCase())) { res.json(OK); return; }

  const { data: user } = await db
    .from('users')
    .select('id, username, email')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) { res.json(OK); return; }

  // Delete any existing unused tokens for this user
  await db.from('password_reset_tokens').delete()
    .eq('user_id', user.id)
    .is('used_at', null);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();

  const { error: insertError } = await db.from('password_reset_tokens').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (insertError) { res.json(OK); return; }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  try {
    await getEmailService().sendTemplateEmail({
      to: user.email,
      templateName: 'forgot-password',
      data: { name: user.username, resetUrl },
    });
  } catch (err) {
    console.error('[forgot-password] email send failed:', err);
  }

  res.json(OK);
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const { data: row } = await db
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (!row) { res.status(400).json({ error: 'Invalid or expired reset link' }); return; }
  if (row.used_at) { res.status(400).json({ error: 'This reset link has already been used' }); return; }
  if (new Date(row.expires_at) < new Date()) {
    res.status(400).json({ error: 'This reset link has expired' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await db
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', row.user_id);

  if (updateError) { res.status(500).json({ error: 'Failed to update password' }); return; }

  await db.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);

  res.json({ message: 'Password updated. Please sign in.' });
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
