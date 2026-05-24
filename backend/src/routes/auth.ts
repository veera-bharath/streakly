import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../store/db';
import { JWT_SECRET, authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getEmailService } from '../di/container';

// --- In-memory rate limiters ---

const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();
const resendOtpAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

const router = Router();

// ------------------------------------------------------------------ register

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || typeof username !== 'string' ||
      !email    || typeof email    !== 'string' ||
      !password || typeof password !== 'string') {
    res.status(400).json({ error: 'Username, email, and password required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await db
    .from('users')
    .insert({ username, email: email.toLowerCase(), password_hash: passwordHash, is_verified: false })
    .select('id, username, email')
    .single();

  if (error) {
    const isDupe = error.code === '23505';
    res.status(isDupe ? 409 : 500).json({ error: isDupe ? 'Email already in use' : error.message });
    return;
  }

  // Invalidate any stale OTPs from a previous attempt with this email
  await db.from('email_verification_otps').update({ used_at: new Date().toISOString() })
    .eq('user_id', data.id)
    .is('used_at', null);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error: otpError } = await db.from('email_verification_otps').insert({
    user_id: data.id,
    otp,
    expires_at: expiresAt,
  });

  if (otpError) {
    console.error('[register] failed to insert OTP:', otpError);
    res.status(500).json({ error: 'Account created but could not send verification email. Please try again.' });
    return;
  }

  try {
    await getEmailService().sendTemplateEmail({
      to: data.email,
      templateName: 'email-verification',
      data: { name: data.username, otp },
    });
  } catch (err) {
    console.error('[register] email send failed:', err);
  }

  res.status(201).json({ userId: data.id, message: 'Check your email for a verification code.' });
});

// ------------------------------------------------------------------ login

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const { data: user, error } = await db
    .from('users')
    .select('id, username, email, password_hash, is_verified')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.is_verified) {
    res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', userId: user.id });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

// --------------------------------------------------------------- verify-email

router.post('/verify-email', async (req: Request, res: Response) => {
  const { userId, otp } = req.body;
  if (!userId || typeof userId !== 'string' || !otp || typeof otp !== 'string') {
    res.status(400).json({ error: 'userId and otp are required' });
    return;
  }

  // Fetch latest unused OTP for this user
  const { data: otpRow } = await db
    .from('email_verification_otps')
    .select('id, otp, expires_at, used_at, attempts')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otpRow) {
    res.status(400).json({ error: 'No active verification code found. Please request a new one.' });
    return;
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    return;
  }

  const currentAttempts = otpRow.attempts ?? 0;
  const attempts = currentAttempts + 1;

  if (otpRow.otp !== otp) {
    if (attempts >= 5) {
      // Optimistic-concurrency guard: .eq('attempts', currentAttempts) ensures concurrent
      // requests don't both reset the counter — only the first write succeeds.
      await db.from('email_verification_otps')
        .update({ used_at: new Date().toISOString(), attempts })
        .eq('id', otpRow.id)
        .eq('attempts', currentAttempts);
      res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    } else {
      await db.from('email_verification_otps')
        .update({ attempts })
        .eq('id', otpRow.id)
        .eq('attempts', currentAttempts);
      const remaining = 5 - attempts;
      res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }
    return;
  }

  // Mark OTP used first — if this fails, abort so the OTP can't be replayed
  const { error: markUsedError } = await db
    .from('email_verification_otps')
    .update({ used_at: new Date().toISOString(), attempts })
    .eq('id', otpRow.id);

  if (markUsedError) {
    console.error('[verify-email] failed to mark OTP used:', markUsedError);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
    return;
  }

  const { error: verifyError } = await db
    .from('users')
    .update({ is_verified: true })
    .eq('id', userId);

  if (verifyError) {
    res.status(500).json({ error: 'Failed to activate account. Please try again.' });
    return;
  }

  const { data: user } = await db
    .from('users')
    .select('id, username, email')
    .eq('id', userId)
    .single();

  if (!user) {
    res.status(500).json({ error: 'Account activated but user not found.' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

// --------------------------------------------------------------- resend-otp

router.post('/resend-otp', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  if (!checkRateLimit(resendOtpAttempts, userId, 3, 3600_000)) {
    res.status(429).json({ error: 'Too many resend requests. Please wait before trying again.' });
    return;
  }

  const { data: user } = await db
    .from('users')
    .select('id, username, email, is_verified')
    .eq('id', userId)
    .single();

  if (!user || user.is_verified) {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }

  // Invalidate all existing OTPs
  await db.from('email_verification_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error: insertError } = await db.from('email_verification_otps').insert({
    user_id: userId,
    otp,
    expires_at: expiresAt,
  });

  if (insertError) {
    res.status(500).json({ error: 'Failed to generate new code. Please try again.' });
    return;
  }

  try {
    await getEmailService().sendTemplateEmail({
      to: user.email,
      templateName: 'email-verification',
      data: { name: user.username, otp },
    });
  } catch (err) {
    console.error('[resend-otp] email send failed:', err);
  }

  res.json({ message: 'A new code has been sent.' });
});

// ----------------------------------------------------------- forgot-password

router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const OK = { message: 'If that email exists, a reset link has been sent.' };

  if (!email || typeof email !== 'string') { res.json(OK); return; }

  if (!checkRateLimit(forgotPasswordAttempts, email.toLowerCase(), 3, 3600_000)) { res.json(OK); return; }

  const { data: user } = await db
    .from('users')
    .select('id, username, email')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) { res.json(OK); return; }

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

// ----------------------------------------------------------- reset-password

router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
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

  const { error: markUsedError } = await db
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  if (markUsedError) {
    console.error('[reset-password] failed to mark token used:', markUsedError);
    res.status(500).json({ error: 'Password updated but token invalidation failed — please contact support' });
    return;
  }

  res.json({ message: 'Password updated. Please sign in.' });
});

// ----------------------------------------------------------------------- me

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
