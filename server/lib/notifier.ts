export interface LateConfirmationInfo {
  receiptCode: string
  voterPhone: string
  candidateName: string
  quantity: number
  amount: number
  currency: string
}
export interface LateConfirmationNotifier {
  voteConfirmedLate(info: LateConfirmationInfo): Promise<void>
}

export function createNotifierFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LateConfirmationNotifier | null {
  void env
  return null
}
