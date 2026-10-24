import type { Book, ReadingAccess } from '@prisma/client';

/**
 * Short-lived memo of "this user may read this book", used by the page endpoint so a long read does not re-run the
 * full access check for every page. Anything that changes who can read what MUST call forgetAccess(), so a
 * revocation takes effect on the very next request rather than when the memo expires.
 */
type Entry = { exp: number; value: { book: Book; access: ReadingAccess | null } };

const TTL_MS = 15_000;
const memo = new Map<string, Entry>();

export const getAccess = (userId: string, bookId: string) => {
  const hit = memo.get(`${userId}:${bookId}`);
  return hit && hit.exp > Date.now() ? hit.value : null;
};

export const setAccess = (userId: string, bookId: string, value: Entry['value']) => {
  if (memo.size > 5000) memo.clear();
  memo.set(`${userId}:${bookId}`, { exp: Date.now() + TTL_MS, value });
};

/** Forget one user's decisions, or everyone's when called without a user (book / schedule changes). */
export const forgetAccess = (userId?: string) => {
  if (!userId) return memo.clear();
  for (const k of memo.keys()) if (k.startsWith(`${userId}:`)) memo.delete(k);
};
