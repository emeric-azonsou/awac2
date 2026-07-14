import { createSebpayFromEnv } from '../lib/sebpay'
import type { SebpayClient, PaymentConfig } from '../types'
let sebpayInstance: SebpayClient | null | undefined
export function getSebpay(): SebpayClient | null {
  if (sebpayInstance === undefined) sebpayInstance = createSebpayFromEnv()
  return sebpayInstance
}
export function getSebpaySecret(): string {
  return process.env.SEBPAY_SECRET_KEY ?? ''
}
export function getPaymentConfig(): PaymentConfig {
  return { callbackUrl: process.env.SEBPAY_CALLBACK_URL ?? '' }
}
