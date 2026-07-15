import { createFeexpayFromEnv } from '../lib/feexpay'
import type { FeexpayClient } from '../types'
let feexpayInstance: FeexpayClient | null | undefined
export function getFeexpay(): FeexpayClient | null {
  if (feexpayInstance === undefined) feexpayInstance = createFeexpayFromEnv()
  return feexpayInstance
}
export function getFeexpayWebhookSecret(): string {
  return process.env.FEEXPAY_WEBHOOK_SECRET ?? ''
}
