import {transaction} from './database';
import {bucket} from './drive';

export async function deleteDocument(
  id: string,
  expectedVersion: string | null,
  dependencies = {transaction, trash: (fileId: string) => bucket().delete(fileId)},
) {
  const result = await dependencies.transaction(async db => {
    const row = await db.prepare('SELECT file_key,updated FROM documents WHERE id=? FOR UPDATE')
      .bind(id).first<{file_key: string | null; updated: string}>();
    if (!row) return {kind: 'missing' as const};
    if (expectedVersion !== null && row.updated !== expectedVersion) return {kind: 'changed' as const};
    await db.prepare('DELETE FROM documents WHERE id=?').bind(id).run();
    return {kind: 'deleted' as const, fileKey: row.file_key};
  });
  if (result.kind === 'missing') return Response.json({error: 'Không tìm thấy văn bản.'}, {status: 404});
  if (result.kind === 'changed') return Response.json({error: 'Văn bản đã được sửa sau khi bạn chọn. Tải lại danh sách và kiểm tra trước khi xóa.'}, {status: 409});
  let warning = '';
  if (result.fileKey) {
    try {await dependencies.trash(result.fileKey)}
    catch {warning = 'Đã xóa thông tin văn bản, nhưng chưa chuyển được tệp vào Thùng rác Drive. Hãy kiểm tra tệp trên Drive.'}
  }
  return Response.json({ok: true, warning});
}
