import mongoose, { Connection } from 'mongoose';
import { componentLogger } from './logger';

const log = componentLogger('db');
let cachedConnection: Promise<Connection> | null = null;

export async function getConnection(): Promise<Connection> {
  const uri = (process.env.MONGO_URI || 'mongodb://localhost:27017').trim().replace(/\/+$/, '');
  const db = (process.env.MONGO_DB || 'control-api').trim();
  if (!cachedConnection) {
    const mongoUrl = `${uri}/${db}`;
    log.info({ uri, db }, 'opening mongo connection');
    cachedConnection = mongoose.createConnection(mongoUrl).asPromise()
      .then((conn) => {
        log.info({ host: conn.host, name: conn.name }, 'mongo connection established');
        return conn;
      })
      .catch((err) => {
        cachedConnection = null;
        log.error({ err }, 'failed to establish mongo connection');
        throw err;
      });
  }
  return cachedConnection;
}
