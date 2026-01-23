import express from 'express';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { mergeLogContext } from '@event-streaming-platform/logging-utils';
import {
  ClientNotFoundError,
  ClientSecretMismatchError,
  InvalidInputError,
  MissingJwtSecretError,
  ScopeNotAllowedError,
  SessionNotFoundError,
  UserNotFoundError,
  UserPasswordMismatchError,
  WorkspaceNotFoundError
} from '../lib/errors.js';
import { componentLogger } from '../utils/logger.js';
import { authorizerCore } from '../core.js';
import { CONFIG } from '../config.js';

const router = express.Router();
const logger = componentLogger(import.meta.url);

function extractClientMeta(req: Request) {
  const headers: any = req.headers || {};
  const userAgent = headers['user-agent'] || headers['User-Agent'] || '';
  const chUa = headers['sec-ch-ua'] || headers['Sec-CH-UA'] || '';
  const chUaPlatform = headers['sec-ch-ua-platform'] || headers['Sec-CH-UA-Platform'] || '';
  const chUaMobile = headers['sec-ch-ua-mobile'] || headers['Sec-CH-UA-Mobile'] || '';
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  const ip = (Array.isArray(forwarded) ? forwarded[0] : (forwarded || '')).split(',')[0].trim() || (req.ip as string) || '';
  return { userAgent, chUa, chUaPlatform, chUaMobile, ip };
}

function verifyHs256JwtNoExpiry(token: string, secret: string, opts: { issuer?: string; audience?: string } = {}) {
  const [encodedHeader, encodedPayload, signature] = (token || '').split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token format');
  }
  const expected = createHmac('sha256', Buffer.from(secret, 'utf-8'))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  const providedSig = Buffer.from(signature);
  const expectedSig = Buffer.from(expected);
  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    throw new Error('Invalid signature');
  }

  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('Unsupported alg');
  const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

  if (opts.issuer && claims.iss && claims.iss !== opts.issuer) {
    throw new Error('Invalid token issuer');
  }
  if (opts.audience) {
    const aud = claims.aud;
    const ok = Array.isArray(aud) ? aud.includes(opts.audience) : aud === opts.audience;
    if (!ok) throw new Error('Invalid token audience');
  }
  return { header, claims };
}

router.post('/token', async (req: Request, res: Response) => {
  const { client_id, client_secret, workspace_id } = req.body || {};
  const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes.map((s: any) => String(s)) : undefined;
  mergeLogContext({ clientId: client_id, workspaceId: workspace_id });

  try {
    const result = await authorizerCore.issueClientToken({
      clientId: client_id,
      clientSecret: client_secret,
      workspaceId: workspace_id,
      scopes,
      clientMeta: extractClientMeta(req)
    });

    return res.status(201).json({
      sessionId: result.sessionId,
      token: result.token,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      client_id: result.clientId,
      workspace_id: result.workspaceId,
      scopes: result.scopes
    });
  } catch (err: any) {
    logger.error({ err, clientId: client_id, workspaceId: workspace_id }, 'token issuance error');
    if (err instanceof WorkspaceNotFoundError) return res.status(404).json({ message: 'Workspace not found' });
    if (err instanceof ClientNotFoundError) return res.status(404).json({ message: 'Client not found or inactive' });
    if (err instanceof ClientSecretMismatchError) return res.status(401).json({ message: 'Invalid client credentials' });
    if (err instanceof ScopeNotAllowedError) return res.status(400).json({ message: 'Requested scopes are not allowed' });
    if (err instanceof MissingJwtSecretError) return res.status(500).json({ message: 'Server configuration error: missing AUTH_JWT_SECRET' });
    if (err instanceof InvalidInputError) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/session', async (req: Request, res: Response) => {
  const { username, password, workspace_id } = req.body || {};
  mergeLogContext({ principalId: username, principalType: 'user', workspaceId: workspace_id });

  try {
    const result = await authorizerCore.createUserSession({
      username,
      password,
      workspaceId: workspace_id,
      clientMeta: extractClientMeta(req)
    });

    return res.status(201).json({
      sessionId: result.sessionId,
      token: result.token,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      user: {
        id: result.user.id,
        roles: result.user.roles,
        workspace_id: result.user.workspaceId
      }
    });
  } catch (err: any) {
    logger.error({ err, username, workspaceId: workspace_id }, 'user session error');
    if (err instanceof WorkspaceNotFoundError) return res.status(404).json({ message: 'Workspace not found' });
    if (err instanceof UserNotFoundError) return res.status(404).json({ message: 'User not found or inactive' });
    if (err instanceof UserPasswordMismatchError) return res.status(401).json({ message: 'Invalid credentials' });
    if (err instanceof MissingJwtSecretError) return res.status(500).json({ message: 'Server configuration error: missing AUTH_JWT_SECRET' });
    if (err instanceof InvalidInputError) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const authz = (req.get('authorization') || '').trim();
  const tokenFromHeader = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  const token = tokenFromHeader || (req.get('x-session-token') || '').trim();

  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    if (!CONFIG.auth.jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error: missing AUTH_JWT_SECRET' });
    }

    const { claims } = verifyHs256JwtNoExpiry(token, CONFIG.auth.jwtSecret, {
      issuer: CONFIG.auth.jwtIssuer,
      audience: CONFIG.auth.jwtAudience
    });

    const sessionId = String((claims as any).sid || '').trim();
    const workspaceId = String((claims as any).wid || '').trim();

    if (!sessionId || !workspaceId) {
      return res.status(401).json({ message: 'Invalid token claims' });
    }

    const result = await authorizerCore.refreshSession({
      sessionId,
      workspaceId
    });

    mergeLogContext({ workspaceId, sessionId });

    return res.status(200).json({
      sessionId: result.sessionId,
      token: result.token,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      principal: result.principal
    });
  } catch (err: any) {
    logger.error({ err }, 'refresh route error');
    if (err instanceof SessionNotFoundError) return res.status(404).json({ message: 'Session not found' });
    if (err instanceof MissingJwtSecretError) return res.status(500).json({ message: 'Server configuration error: missing AUTH_JWT_SECRET' });
    if (err?.code === 'ERR_JWT_EXPIRED' || err?.message === 'JWT Expired') return res.status(401).json({ message: 'Token expired' });
    if (err?.message?.toLowerCase().includes('audience')) return res.status(401).json({ message: 'Invalid token audience' });
    if (err?.message?.toLowerCase().includes('issuer')) return res.status(401).json({ message: 'Invalid token issuer' });
    return res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
