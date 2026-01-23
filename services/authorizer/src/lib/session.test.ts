import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthorizerCore } from './session.js';
import {
  ClientNotFoundError,
  ClientSecretMismatchError,
  InvalidInputError,
  ScopeNotAllowedError,
  SessionNotFoundError,
  UserNotFoundError,
  UserPasswordMismatchError,
  WorkspaceNotFoundError
} from './errors.js';
import { AuthorizerCoreDependencies, SessionDocumentLike } from './types.js';

function buildDeps(overrides: Partial<AuthorizerCoreDependencies> = {}): AuthorizerCoreDependencies {
  const now = new Date('2024-01-01T00:00:00.000Z');
  let savedSession: Record<string, any> | null = null;
  const savedSessions: Record<string, SessionDocumentLike> = {};

  const deps: AuthorizerCoreDependencies = {
    sessionTtlMinutes: 60,
    logger: { info() {}, error() {} },
    getMasterConnection: async () => ({}) as any,
    makeModels: () => ({
      Workspace: {
        findOne: () => ({
          lean: () => ({
            exec: async () => ({ _id: 'ws1', status: 'active' })
          })
        })
      },
      Client: {
        findOne: ({ _id, workspaceId }: any) => ({
          lean: () => ({
            exec: async () => {
              if (_id !== 'client-1' || workspaceId !== 'ws1') return null;
              return {
                _id,
                workspaceId,
                status: 'active',
                secretHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // sha256('password')
                secretSalt: null,
                allowedScopes: ['a', 'b'],
                allowedTopics: ['t1', 't2']
              };
            }
          })
        })
      },
      User: {
        findOne: ({ username, workspaceId }: any) => ({
          lean: () => ({
            exec: async () => {
              if (username !== 'alice' || workspaceId !== 'ws1') return null;
              return {
                _id: 'user-1',
                username,
                workspaceId,
                status: 'active',
                passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // sha256('password')
                passwordSalt: null,
                roles: ['admin']
              };
            }
          })
        })
      },
      Session: {
        init: async () => {},
        create: async (session: any) => {
          savedSession = session;
          savedSessions[session._id] = {
            ...session,
            save: async () => {
              savedSessions[session._id] = { ...savedSessions[session._id], ...session };
            }
          } as any;
        },
        findById: (id: string) => ({
          exec: async () => savedSessions[id] ?? null
        })
      }
    }),
    signJwt: async (args) => ({
      token: `jwt-${args.sessionId}`,
      exp: Math.floor(now.getTime() / 1000) + args.expiresInSec
    }),
    uuid: () => 'session-123',
    now: () => now,
    ...overrides
  };

  return deps;
}

test('issueClientToken success', async () => {
  const deps = buildDeps();
  const core = createAuthorizerCore(deps);

  const result = await core.issueClientToken({
    clientId: 'client-1',
    clientSecret: 'password',
    workspaceId: 'ws1',
    scopes: ['a']
  });

  assert.equal(result.sessionId, 'session-123');
  assert.equal(result.token, 'jwt-session-123');
  assert.deepEqual(result.scopes, ['a']);
  assert.equal(result.workspaceId, 'ws1');
});

test('issueClientToken rejects missing inputs', async () => {
  const core = createAuthorizerCore(buildDeps());
  await assert.rejects(() => core.issueClientToken({} as any), InvalidInputError);
});

test('issueClientToken fails on workspace missing', async () => {
  const deps = buildDeps({
    makeModels: () => ({
      Workspace: {
        findOne: () => ({ lean: () => ({ exec: async () => null }) })
      }
    }) as any
  });
  const core = createAuthorizerCore(deps);
  await assert.rejects(
    () => core.issueClientToken({ clientId: 'c', clientSecret: 's', workspaceId: 'missing' }),
    WorkspaceNotFoundError
  );
});

test('issueClientToken fails on client not found or bad secret', async () => {
  const core = createAuthorizerCore(buildDeps());
  await assert.rejects(
    () => core.issueClientToken({ clientId: 'missing', clientSecret: 'password', workspaceId: 'ws1' }),
    ClientNotFoundError
  );
  await assert.rejects(
    () => core.issueClientToken({ clientId: 'client-1', clientSecret: 'wrong', workspaceId: 'ws1' }),
    ClientSecretMismatchError
  );
});

test('issueClientToken fails on disallowed scope', async () => {
  const core = createAuthorizerCore(buildDeps());
  await assert.rejects(
    () => core.issueClientToken({ clientId: 'client-1', clientSecret: 'password', workspaceId: 'ws1', scopes: ['c'] }),
    ScopeNotAllowedError
  );
});

test('createUserSession success', async () => {
  const deps = buildDeps();
  const core = createAuthorizerCore(deps);
  const result = await core.createUserSession({
    username: 'alice',
    password: 'password',
    workspaceId: 'ws1'
  });

  assert.equal(result.sessionId, 'session-123');
  assert.equal(result.user.id, 'user-1');
  assert.deepEqual(result.user.roles, ['admin']);
  assert.equal(result.token, 'jwt-session-123');
});

test('createUserSession failures', async () => {
  const core = createAuthorizerCore(buildDeps());
  await assert.rejects(
    () => core.createUserSession({ username: 'missing', password: 'password', workspaceId: 'ws1' }),
    UserNotFoundError
  );
  await assert.rejects(
    () => core.createUserSession({ username: 'alice', password: 'bad', workspaceId: 'ws1' }),
    UserPasswordMismatchError
  );
});

test('refreshSession success', async () => {
  const deps = buildDeps();
  const core = createAuthorizerCore(deps);
  await core.createUserSession({ username: 'alice', password: 'password', workspaceId: 'ws1' });

  const refreshed = await core.refreshSession({ sessionId: 'session-123' });
  assert.equal(refreshed.sessionId, 'session-123');
  assert.equal(refreshed.token, 'jwt-session-123');
  assert.equal(refreshed.principal.id, 'user-1');
});

test('refreshSession errors on missing or expired session', async () => {
  const deps = buildDeps();
  const core = createAuthorizerCore(deps);
  await assert.rejects(() => core.refreshSession({ sessionId: 'missing' }), SessionNotFoundError);

  // expired session should be rejected
  const expiredNow = new Date('2024-01-02T00:00:00.000Z');
  const expiredDeps = buildDeps({
    now: () => expiredNow,
    makeModels: () => ({
      Workspace: {
        findOne: () => ({ lean: () => ({ exec: async () => ({ _id: 'ws1', status: 'active' }) }) })
      },
      Session: {
        findById: () => ({
          exec: async () =>
            ({
              _id: 'session-expired',
              status: 'active',
              principalId: 'user-1',
              principalType: 'user',
              workspaceId: 'ws1',
              scopes: [],
              topics: [],
              expiresAt: new Date('2024-01-01T00:00:00.000Z'),
              updatedAt: expiredNow,
              save: async () => {}
            } as SessionDocumentLike)
        })
      }
    }) as any
  });
  const expiredCore = createAuthorizerCore(expiredDeps);
  await assert.rejects(() => expiredCore.refreshSession({ sessionId: 'session-expired' }), SessionNotFoundError);
});
