export const CONFIG = {
  port: Number(process.env.AUTHORIZER_PORT || 7305),
  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'OPTIONS']
  },
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET || '',
    jwtIssuer: process.env.AUTH_JWT_ISSUER || 'authorizer-service',
    jwtAudience: process.env.AUTH_JWT_AUDIENCE || 'api',
    sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES || 60)
  }
} as const;

export default CONFIG;
