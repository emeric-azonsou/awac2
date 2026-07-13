import type { Sql } from 'postgres'

export type Db = Sql

export interface SebpayCollection {
  transaction_id: string
  status: string
  external_reference?: string
  amount?: number
  currency?: string
  provider_link?: string | null
  message?: string
}

export interface SebpayCollectionInput {
  amount: number
  currency: string
  phone: string
  operator: string
  country?: string
  externalReference: string
  callbackUrl: string
}

export interface SebpayCountry {
  country_code: string
  country_name?: string
  prefix?: string
  currency?: { code: string; name?: string; symbol?: string }
  [key: string]: unknown
}

export interface SebpayOperator {
  slug: string
  name?: string
  code?: string
  otp_required?: boolean
  [key: string]: unknown
}

export interface SebpayClient {
  createCollection(input: SebpayCollectionInput): Promise<SebpayCollection>
  getCollection(reference: string): Promise<SebpayCollection>
  getCountries(): Promise<SebpayCountry[]>
  getOperators(country?: string): Promise<SebpayOperator[]>
}

export interface PaymentConfig {
  callbackUrl: string
}

// Variables injectées dans le contexte Hono par le middleware de app.ts.
export interface AppVariables {
  db: Db
  sebpay: SebpayClient | null
  sebpaySecret: string
  paymentConfig: PaymentConfig
}

export type AppEnv = { Variables: AppVariables }
