// 簡單的 JWT-in-cookie 管理員 session。NextAuth 對單一管理員過重。

import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAdminPasswordHash, setAdminPasswordHash } from "./db";
import { env } from "./server-env";

export const ADMIN_COOKIE = "tf_admin";
const SESSION_TTL_SEC = 60 * 60 * 12; // 12h

function secret() {
  return new TextEncoder().encode(env.jwtSecret());
}

// 第一次叫 verify 時若 DB 沒有 hash，從 env 種一筆進去
export async function ensureAdminSeeded(): Promise<void> {
  const existing = await getAdminPasswordHash();
  if (existing) return;
  const fromEnv = env.adminPasswordHash() ?? null;
  if (fromEnv) {
    await setAdminPasswordHash(fromEnv);
    return;
  }
  const plain = env.adminPasswordPlain();
  if (!plain) {
    throw new Error(
      "Admin password not initialised. Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH.",
    );
  }
  const hash = await bcrypt.hash(plain, 10);
  await setAdminPasswordHash(hash);
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (username !== env.adminUsername()) return false;
  await ensureAdminSeeded();
  const hash = await getAdminPasswordHash();
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function changeAdminPassword(newPlain: string): Promise<void> {
  const hash = await bcrypt.hash(newPlain, 10);
  await setAdminPasswordHash(hash);
}

export async function issueSessionToken(): Promise<string> {
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function setAdminCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
