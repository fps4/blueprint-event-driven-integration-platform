import jsonata from 'jsonata';
import mongoose from 'mongoose';
import { makeModels, type JsonataTransformDocument } from '@event-streaming-platform/data-models';
import { logger } from './config.js';

export type TransformRuntime = {
  id: string;
  sourceTopic: string;
  targetTopic: string;
  version: number;
  expression: string;
  compiled: jsonata.Expression;
};

export async function loadTransforms(conn: mongoose.Connection, workspaceId?: string): Promise<Map<string, TransformRuntime>> {
  const { JsonataTransform } = makeModels(conn);
  const filter: Record<string, unknown> = { status: 'active' };
  if (workspaceId) filter.workspaceId = workspaceId;

  const docs = await JsonataTransform.find(filter).sort({ version: -1 }).lean<JsonataTransformDocument[]>().exec();

  const byTopic = new Map<string, TransformRuntime>();
  for (const doc of docs) {
    const key = doc.sourceTopic;
    if (byTopic.has(key)) continue; // keep highest version due to sort
    try {
      const compiled = jsonata(doc.expression);
      byTopic.set(key, {
        id: doc._id,
        sourceTopic: doc.sourceTopic,
        targetTopic: doc.targetTopic,
        version: doc.version,
        expression: doc.expression,
        compiled
      });
    } catch (err) {
      logger.error({ err, transformId: doc._id }, 'failed to compile jsonata expression');
    }
  }

  if (!byTopic.size) {
    logger.warn({ workspaceId }, 'no active jsonata transforms found');
  } else {
    logger.info({ count: byTopic.size, topics: Array.from(byTopic.keys()) }, 'loaded jsonata transforms');
  }

  return byTopic;
}
