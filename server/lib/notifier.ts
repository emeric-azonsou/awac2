// Notification du votant lors d'une confirmation tardive (vote régularisé par le
// cron alors que le votant est parti). Point d'accroche : brancher ici un provider
// SMS/WhatsApp quand il sera choisi — le cron n'a pas à changer.

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

// Aucun provider SMS configuré pour l'instant → pas de notifier (le cron
// régularise en silence). Quand un provider est choisi : lire ses clés ici
// (ex. SMS_API_KEY) et renvoyer une implémentation qui envoie le SMS
// « Votre vote pour {candidat} ({quantité} voix) est confirmé. Reçu : /recu/{code} ».
export function createNotifierFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LateConfirmationNotifier | null {
  void env
  return null
}
