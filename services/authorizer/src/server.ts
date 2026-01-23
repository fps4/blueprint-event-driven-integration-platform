import express from 'express';
import cors from 'cors';

import { runWithLogContext } from '@event-streaming-platform/logging-utils';
import { CONFIG } from './config.js';
import { getMasterConnection } from './utils/db.js';
import authRoutes from './routes/auth-routes.js';
import { componentLogger } from './utils/logger.js';
const app = express();
const logger = componentLogger(import.meta.url);

app.use(express.json());

app.use((req, _res, next) => {
  const bodyVisitor = typeof req.body?.visitor_id === 'string' ? req.body.visitor_id : undefined;
  runWithLogContext({ visitorId: bodyVisitor }, () => next());
});

const isProd = process.env.NODE_ENV === 'production';
const staticAllowed = CONFIG.cors.origins || [];
const devAllowed = isProd ? [] : [
  'http://localhost:3033',
  'http://127.0.0.1:3033',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const allowedOrigins = new Set([...staticAllowed, ...devAllowed]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.size === 0) return callback(null, true);
    return allowedOrigins.has(origin) ? callback(null, true) : callback(null, false);
  },
  methods: CONFIG.cors.methods as any,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Ensure MongoDB master connection is established before serving routes
await getMasterConnection();

app.use('/auth', authRoutes);

app.listen(CONFIG.port, () => {
  logger.info(`Server is running on port ${CONFIG.port}`);
});
