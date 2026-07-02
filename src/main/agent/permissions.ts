import type { PermissionDecision } from '@shared/types'

/** Bridges canUseTool promises (main) with user decisions arriving over IPC (renderer). */
export class PermissionBroker {
  private pending = new Map<string, (d: PermissionDecision) => void>()

  wait(requestId: string, signal: AbortSignal): Promise<PermissionDecision> {
    return new Promise<PermissionDecision>((resolve) => {
      const onAbort = (): void => {
        this.pending.delete(requestId)
        resolve({ kind: 'deny', message: 'Operacja przerwana' })
      }
      if (signal.aborted) return onAbort()
      signal.addEventListener('abort', onAbort, { once: true })
      this.pending.set(requestId, (d) => {
        signal.removeEventListener('abort', onAbort)
        this.pending.delete(requestId)
        resolve(d)
      })
    })
  }

  respond(requestId: string, decision: PermissionDecision): void {
    this.pending.get(requestId)?.(decision)
  }

  /** Deny everything still pending for a closing session. */
  denyAll(): void {
    for (const [, resolve] of this.pending) resolve({ kind: 'deny', message: 'Sesja zamknięta' })
    this.pending.clear()
  }
}
