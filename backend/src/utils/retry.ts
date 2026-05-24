export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  if (attempts < 1) throw new RangeError(`withRetry: attempts must be >= 1, got ${attempts}`);
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1 || !shouldRetry(err)) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  // never reached — loop always throws or returns
  throw new Error('unreachable');
}
