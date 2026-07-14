import bcrypt from 'bcryptjs'
import type { Db } from '../../types'
import { ok, fail, ERRORS, type HttpResult, type ErrorEntry } from '../../lib/errors'
export const LOGIN_MAX_ATTEMPTS = 5
export const EMAIL_MAX_ATTEMPTS = 20
const LOCK_DURATION_MS = 15 * 60 * 1000
const LOCKED: ErrorEntry = {
  status: 429,
  code: 'too_many_attempts',
  message: 'Trop de tentatives, réessayez dans quelques minutes',
}
interface ThrottleEntry {
  failures: number
  lockedUntil: number
}
let throttleByKey = new Map<string, ThrottleEntry>()
export function resetLoginThrottle(): void {
  throttleByKey = new Map()
}
function ipEmailKey(clientIp: string, email: string): string {
  return `ip:${clientIp}|${email.toLowerCase()}`
}
function emailKey(email: string): string {
  return `email:${email.toLowerCase()}`
}
function isLocked(key: string): boolean {
  const entry = throttleByKey.get(key)
  return Boolean(entry && entry.lockedUntil > Date.now())
}
function registerFailure(key: string, threshold: number): void {
  const entry = throttleByKey.get(key) ?? { failures: 0, lockedUntil: 0 }
  entry.failures += 1
  if (entry.failures >= threshold) {
    entry.lockedUntil = Date.now() + LOCK_DURATION_MS
    entry.failures = 0
  }
  throttleByKey.set(key, entry)
}
export interface AdminAuthDeps {
  db: Db
}
export interface AdminLoginInput {
  email: string
  password: string
  clientIp: string
}
export interface AdminProfile {
  id: string
  email: string
  full_name: string
  token_version: number
}
export async function verifyAdminLogin(
  deps: AdminAuthDeps,
  { email, password, clientIp }: AdminLoginInput,
): Promise<HttpResult> {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
    return fail(ERRORS.VALIDATION, 'Email et mot de passe requis')
  }
  const ipKey = ipEmailKey(clientIp, normalizedEmail)
  const accountKey = emailKey(normalizedEmail)
  if (isLocked(ipKey) || isLocked(accountKey)) return fail(LOCKED)
  const rows = await deps.db`
    SELECT id, email, password_hash, full_name, token_version FROM admins WHERE email = ${normalizedEmail}`
  const admin = rows[0]
  const passwordMatches = admin
    ? await bcrypt.compare(password, String(admin.password_hash))
    : false
  if (!admin || !passwordMatches) {
    registerFailure(ipKey, LOGIN_MAX_ATTEMPTS)
    registerFailure(accountKey, EMAIL_MAX_ATTEMPTS)
    return fail(ERRORS.UNAUTHORIZED, 'Identifiants invalides')
  }
  throttleByKey.delete(ipKey)
  throttleByKey.delete(accountKey)
  const profile: AdminProfile = {
    id: String(admin.id),
    email: String(admin.email),
    full_name: String(admin.full_name ?? ''),
    token_version: Number(admin.token_version) || 0,
  }
  return ok(profile)
}
