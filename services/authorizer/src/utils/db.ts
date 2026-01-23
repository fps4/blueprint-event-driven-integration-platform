import mongoose, { Connection } from 'mongoose';
import { componentLogger } from './logger.js';

const logger = componentLogger(import.meta.url);

const MONGO_URI = process.env.MONGO_URI as string | undefined;
const AUTH_DB_NAME = process.env.AUTH_DB_NAME as string | undefined;

if (!MONGO_URI) {
  logger.error('MONGO_URI is not set');
  throw new Error('MONGO_URI is not set');
}
if (!AUTH_DB_NAME) {
  logger.error('AUTH_DB_NAME is not set');
  throw new Error('AUTH_DB_NAME is not set');
}

let masterConnection: Connection | null = null;

const buildDbUri = (base: string, dbName: string) => {
  try {
    const url = new URL(base);
    url.pathname = `/${dbName}`;
    return url.toString();
  } catch {
    const stripped = base.replace(/\/[^/]*$/, '');
    return `${stripped}/${dbName}`;
  }
};

const waitForOpen = (conn: Connection) => new Promise<Connection>((resolve, reject) => {
  if (conn.readyState === 1) return resolve(conn);
  conn.once('open', () => resolve(conn));
  conn.once('error', (err) => reject(err));
});

export const getMasterConnection = async (): Promise<Connection> => {
  if (masterConnection && masterConnection.readyState === 1) return masterConnection;
  const uri = buildDbUri(MONGO_URI!, AUTH_DB_NAME!);
  try {
    const conn = mongoose.createConnection(uri);
    await waitForOpen(conn as any);
    masterConnection = conn;
    logger.info({ db: masterConnection.name, uri }, 'MongoDB connected');
    return masterConnection;
  } catch (err: any) {
    logger.error({ err, uri }, `MongoDB connection error: ${err?.message || err}`);
    throw err;
  }
};
