"use client";

import { authApi, type UserOut } from "@/lib/api";

const TOKEN_KEY = "tf_token";
const USER_KEY = "tf_user";

export function saveSession(token: string, user: UserOut): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): UserOut | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserOut) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export async function login(email: string, password: string): Promise<UserOut> {
  const { access_token } = await authApi().login(email, password);
  localStorage.setItem(TOKEN_KEY, access_token);
  const user = await authApi().me();
  saveSession(access_token, user);
  return user;
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<UserOut> {
  const { access_token } = await authApi().register(email, password, displayName);
  localStorage.setItem(TOKEN_KEY, access_token);
  const user = await authApi().me();
  saveSession(access_token, user);
  return user;
}

export function logout(): void {
  clearSession();
  window.location.href = "/login";
}
