import {randomUUID} from 'node:crypto';
import type {database} from './database';

export type LogAction = 'create' | 'update' | 'delete' | 'status_change';

export type DocumentLogEntry = {
  id: string;
  document_id: string;
  document_number: string;
  action: LogAction;
  details: string;
  actor: string;
  created_at: string;
};

export async function recordLog(
  db: ReturnType<typeof database>,
  entry: {
    documentId: string;
    documentNumber: string;
    action: LogAction;
    details: string;
    actor?: string;
  }
) {
  try {
    await db.prepare(
      'INSERT INTO document_logs(id, document_id, document_number, action, details, actor) VALUES (?,?,?,?,?,?)'
    ).bind(
      randomUUID(),
      entry.documentId,
      entry.documentNumber,
      entry.action,
      entry.details,
      entry.actor || 'Văn thư'
    ).run();
  } catch {
    // Graceful degradation if migration 003 hasn't been applied yet
  }
}

export async function getDocumentLogs(
  db: ReturnType<typeof database>,
  documentId: string
): Promise<DocumentLogEntry[]> {
  try {
    const res = await db.prepare(
      'SELECT id, document_id, document_number, action, details, actor, created_at FROM document_logs WHERE document_id=? ORDER BY created_at DESC LIMIT 30'
    ).bind(documentId).all<DocumentLogEntry>();
    return res.results;
  } catch {
    return [];
  }
}
