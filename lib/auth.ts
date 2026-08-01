import { createHmac, timingSafeEqual } from "crypto";

import type { NextRequest } from "next/server";

import { getSettings } from "@/lib/storage";

export const ADMIN_COOKIE = "vento_admin_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 12;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-this-session-secret-before-production";
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safelyCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function isValidAdminPassword(password: unknown) {
  if (typeof password !== "string") return false;
  const settings = await getSettings();
  const configuredPassword = settings.adminPassword.trim() || process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;
  return safelyCompare(password, configuredPassword);
}

export function createAdminSession() {
  const payload = `${Date.now() + sessionLifetimeMs}.admin`;
  return `${Buffer.from(payload).toString("base64url")}.${signature(payload)}`;
}

export function verifyAdminSession(token?: string) {
  if (!token) return false;
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return false;

  try {
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    if (!safelyCompare(providedSignature, signature(payload))) return false;
    const [expiresAt, role] = payload.split(".");
    return role === "admin" && Number(expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function isAdminRequest(request: NextRequest) {
  return verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: sessionLifetimeMs / 1000,
};
