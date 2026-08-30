const INTERNAL_ERROR_MESSAGE = 'Une erreur interne est survenue'

interface HttpErrorLike {
  status?: unknown
  code?: unknown
  message?: unknown
}

export function jsonResult(result: { status: number; body: unknown }): Response {
  return Response.json(result.body, { status: result.status })
}

export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status })
}

// Reproduit readBody(event).catch(() => ({})) : un corps illisible devient un
// objet vide et laisse le service produire son erreur de validation métier,
// plutôt que de remonter une 500 technique.
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json()
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Reproduit getRequestIP(event, { xForwardedFor: true }). Cette IP alimente le
// limiteur de tentatives de connexion : la perdre desarmerait la limitation par
// IP. Derivee de la Request plutot que du getRequestIP de TanStack, qui lit un
// contexte async implicite et rendrait les handlers intestables isolement.
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  if (first) return first
  return request.headers.get('x-real-ip')?.trim() || 'ip-inconnue'
}

// Une erreur inattendue ne doit jamais transporter son message vers le client :
// il peut contenir une chaîne de connexion ou un secret. Seules les erreurs
// applicatives, qui portent un `status` non-500 explicite, gardent leur message.
export function toErrorResponse(err: unknown): Response {
  const candidate = err as HttpErrorLike
  const status = typeof candidate?.status === 'number' ? candidate.status : 500
  const code = typeof candidate?.code === 'string' ? candidate.code : 'internal_error'
  const message =
    typeof candidate?.message === 'string' ? candidate.message : INTERNAL_ERROR_MESSAGE

  if (status === 500) {
    return errorResponse(500, 'internal_error', INTERNAL_ERROR_MESSAGE)
  }
  return errorResponse(status, code, message)
}
