export class AuthorizerCoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidInputError extends AuthorizerCoreError {
  constructor(message: string) {
    super(message);
  }
}

export class WorkspaceNotFoundError extends AuthorizerCoreError {
  constructor(public readonly workspaceId: string) {
    super(`Workspace ${workspaceId} not found`);
  }
}

export class MissingJwtSecretError extends AuthorizerCoreError {
  constructor() {
    super('JWT secret is not configured');
  }
}

export class SessionNotFoundError extends AuthorizerCoreError {
  constructor(public readonly sessionId: string) {
    super(`Session ${sessionId} not found`);
  }
}

export class ClientNotFoundError extends AuthorizerCoreError {
  constructor(public readonly clientId: string) {
    super(`Client ${clientId} not found`);
  }
}

export class ClientSecretMismatchError extends AuthorizerCoreError {
  constructor() {
    super('Client secret mismatch');
  }
}

export class UserNotFoundError extends AuthorizerCoreError {
  constructor(public readonly username: string) {
    super(`User ${username} not found`);
  }
}

export class UserPasswordMismatchError extends AuthorizerCoreError {
  constructor() {
    super('User password mismatch');
  }
}

export class ScopeNotAllowedError extends AuthorizerCoreError {
  constructor() {
    super('Requested scopes are not allowed for this client');
  }
}
