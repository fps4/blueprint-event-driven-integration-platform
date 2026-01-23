import type { Connection } from 'mongoose';

export interface LoggerLike {
  info?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
}

export interface WorkspaceModelLike {
  findOne(query: Record<string, unknown>): { lean(): { exec(): Promise<any> } };
}

export interface ClientModelLike {
  findOne(query: Record<string, unknown>): { lean(): { exec(): Promise<any> } };
}

export interface UserModelLike {
  findOne(query: Record<string, unknown>): { lean(): { exec(): Promise<any> } };
}

export interface SessionDocumentLike {
  status?: string;
  principalId?: string;
  principalType?: string;
  workspaceId?: string;
  scopes?: string[];
  topics?: string[];
  expiresAt?: Date;
  updatedAt: Date;
  save(): Promise<void>;
}

export interface SessionModelLike {
  init?: () => Promise<unknown>;
  create: (...args: any[]) => Promise<any>;
  findById(id: string): { exec(): Promise<SessionDocumentLike | null> };
}

export interface AuthorizerModels {
  Workspace: WorkspaceModelLike;
  Client: ClientModelLike;
  User: UserModelLike;
  Session: SessionModelLike;
  [key: string]: unknown;
}

export interface ClientMeta {
  userAgent?: string;
  chUa?: string;
  chUaPlatform?: string;
  chUaMobile?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface ClientTokenInput {
  clientId: string;
  clientSecret: string;
  workspaceId: string;
  scopes?: string[];
  clientMeta?: ClientMeta;
}

export interface ClientTokenResult {
  sessionId: string;
  token: string;
  expiresIn: number;
  expiresAt: Date;
  clientId: string;
  workspaceId: string;
  scopes: string[];
}

export interface UserSessionInput {
  username: string;
  password: string;
  workspaceId: string;
  clientMeta?: ClientMeta;
}

export interface UserSessionResult {
  sessionId: string;
  token: string;
  expiresIn: number;
  expiresAt: Date;
  user: {
    id: string;
    roles: string[];
    workspaceId: string;
  };
}

export interface RefreshSessionInput {
  sessionId: string;
  workspaceId?: string;
}

export interface RefreshSessionResult {
  sessionId: string;
  token: string;
  expiresIn: number;
  expiresAt: Date;
  principal: {
    id: string;
    type: 'client' | 'user';
    workspaceId: string;
    scopes: string[];
  };
}

export interface SignSessionJwtArgs {
  sessionId: string;
  principalId: string;
  principalType: 'client' | 'user';
  workspaceId: string;
  scopes: string[];
  topics?: string[];
  expiresInSec: number;
}

export type SignSessionJwtFn = (args: SignSessionJwtArgs) => Promise<{ token: string; exp: number }>;

export interface AuthorizerCoreDependencies {
  getMasterConnection: () => Promise<Connection>;
  makeModels: (connection: Connection) => AuthorizerModels;
  signJwt: SignSessionJwtFn;
  sessionTtlMinutes: number;
  logger?: LoggerLike;
  uuid?: () => string;
  now?: () => Date;
}

export interface AuthorizerCore {
  issueClientToken(input: ClientTokenInput): Promise<ClientTokenResult>;
  createUserSession(input: UserSessionInput): Promise<UserSessionResult>;
  refreshSession(input: RefreshSessionInput): Promise<RefreshSessionResult>;
}
