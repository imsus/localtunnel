export class ServerError {
  readonly _tag = "ServerError";
  constructor(readonly message: string) {}
}

export class ProxyError {
  readonly _tag = "ProxyError";
  constructor(readonly message: string) {}
}

export class ClientError {
  readonly _tag = "ClientError";
  constructor(readonly message: string) {}
}

export type ServerErrors = ServerError | ProxyError | ClientError;
