// Les routes serveur TanStack acceptent deux formes pour `handlers` : un objet
// méthode -> handler, ou une fonction recevant `createHandlers`. TypeScript ne
// peut pas réduire cette union depuis l'extérieur de la route, alors que les
// tests n'utilisent que la première forme. Ce helper fait la réduction une
// seule fois, en la validant à l'exécution, plutôt que de disperser des casts.

export interface RouteHandlerCtx {
  request: Request
  params: Record<string, string>
}

export type RouteHandler = (ctx: RouteHandlerCtx) => Response | Promise<Response>

type RouteLike = { options?: { server?: { handlers?: unknown } } }

export function handlerOf(route: unknown, method: string): RouteHandler {
  const handlers = (route as RouteLike)?.options?.server?.handlers
  if (!handlers || typeof handlers !== 'object') {
    throw new Error(`Route sans objet handlers : impossible de récupérer ${method}`)
  }
  const handler = (handlers as Record<string, unknown>)[method]
  if (typeof handler !== 'function') {
    throw new Error(`Handler ${method} absent de la route`)
  }
  return handler as RouteHandler
}
