import { createAuthorizerCore } from './lib/session.js';
import { createSessionJwtSigner } from './lib/jwt.js';
import { makeModels } from '@event-streaming-platform/data-models';

import { CONFIG } from './config.js';
import { getMasterConnection } from './utils/db.js';
import { componentLogger } from './utils/logger.js';

const logger = componentLogger(import.meta.url);

const signSessionJwt = createSessionJwtSigner(() => ({
  secret: CONFIG.auth.jwtSecret,
  issuer: CONFIG.auth.jwtIssuer,
  audience: CONFIG.auth.jwtAudience
}));

export const authorizerCore = createAuthorizerCore({
  getMasterConnection,
  makeModels,
  signJwt: signSessionJwt,
  sessionTtlMinutes: CONFIG.auth.sessionTtlMinutes,
  logger
});
