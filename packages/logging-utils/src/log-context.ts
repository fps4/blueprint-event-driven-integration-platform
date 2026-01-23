import { AsyncLocalStorage } from 'async_hooks';

export type LogContext = Partial<{
  workspaceId: string;
  clientId: string;
  principalId: string;
  principalType: string;
  sessionId: string;
  requestId: string;
  correlationId: string;
  tenantId: string; // legacy
  visitorId: string; // legacy
  bookingId: string; // legacy
}>;

const keys: Array<keyof LogContext> = [
  'workspaceId',
  'clientId',
  'principalId',
  'principalType',
  'sessionId',
  'requestId',
  'correlationId',
  'tenantId',
  'visitorId',
  'bookingId'
];

const storage = new AsyncLocalStorage<LogContext>();

function sanitize(ctx?: LogContext): LogContext {
  const sanitized: LogContext = {};
  if (!ctx) return sanitized;
  for (const key of keys) {
    const raw = ctx[key];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function runWithLogContext<T>(ctx: LogContext, fn: () => T): T {
  const parent = storage.getStore() || {};
  const merged = { ...parent, ...sanitize(ctx) };
  return storage.run(merged, fn);
}

export function mergeLogContext(ctx: LogContext): void {
  const sanitized = sanitize(ctx);
  if (Object.keys(sanitized).length === 0) return;
  const store = storage.getStore();
  if (store) {
    Object.assign(store, sanitized);
  } else {
    storage.enterWith({ ...sanitized });
  }
}

export function getLogContextSnapshot(): LogContext {
  const store = storage.getStore();
  if (!store) return {};
  return { ...sanitize(store) };
}
