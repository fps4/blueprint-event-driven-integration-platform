import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  port: Number(process.env.CONTROL_API_PORT || process.env.API_PORT || 7304),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  mongoDb: process.env.MONGO_DB || process.env.MONGO_MASTER_DB || 'control-api',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtIssuer: process.env.AUTH_JWT_ISSUER || 'control-api',
  jwtAudience: process.env.AUTH_JWT_AUDIENCE || 'control-api-ui',
  kafkaBrokers: (process.env.KAFKA_BROKERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'control-api',
  kafkaUseSsl: process.env.KAFKA_USE_SSL === 'true',
  kafkaSasl: process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD ? {
    mechanism: (process.env.KAFKA_SASL_MECHANISM || 'plain') as any,
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD
  } : undefined
} as const;
