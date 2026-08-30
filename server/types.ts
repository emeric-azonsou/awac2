import type { Sql } from 'postgres'
export type Db = Sql
export interface PaymentInitInput {
  amount: number
  network: string
  phoneNumber: string
  callbackInfo: string
}
export interface PaymentInitResult {
  reference: string
  status: string
  message?: string
  amount?: number
  phoneNumber?: string
}
export interface PaymentStatusResult {
  reference: string
  status: string
  amount?: number
  phoneNumber?: string
  reason?: string
  callback_info?: string | null
}
export interface FeexpayClient {
  initPayment(input: PaymentInitInput): Promise<PaymentInitResult>
  getPaymentStatus(reference: string): Promise<PaymentStatusResult>
}
