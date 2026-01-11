export class ConnectionError {
  readonly _tag = "ConnectionError";
  constructor(
    readonly host: string,
    readonly port: number,
    readonly reason: string
  ) {}
}

export class TimeoutError {
  readonly _tag = "TimeoutError";
  constructor(readonly duration: number) {}
}

export class TunnelError {
  readonly _tag = "TunnelError";
  constructor(readonly message: string) {}
}

export type TunnelErrors = ConnectionError | TimeoutError | TunnelError;
