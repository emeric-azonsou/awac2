const SAVED_MESSAGES: Record<string, string> = {
  created: 'Candidat créé.',
  updated: 'Modifications enregistrées.',
}

export function getCandidateSavedMessage(savedQueryValue: unknown): string {
  return typeof savedQueryValue === 'string' ? (SAVED_MESSAGES[savedQueryValue] ?? '') : ''
}
