export class PollingError extends Error {
  readonly kind: 'auth' | 'configuration' | 'transient' | 'invalid'
  constructor(kind: PollingError['kind'], message: string) {
    super(message)
    this.name = 'PollingError'
    this.kind = kind
  }
}
