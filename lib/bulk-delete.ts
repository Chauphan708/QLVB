export type DeleteItem = {
  id: string;
  number: string;
  title: string;
  updated: string;
  file_key?: string | null;
};
export type DeleteResult = DeleteItem & {
  outcome: 'deleted' | 'missing' | 'failed' | 'unknown' | 'skipped';
  message: string;
};

// One request per document keeps each operation within a function's time limit.
// Never retry an uncertain response: the server may already have committed it.
export async function deleteSelected(
  items: readonly DeleteItem[],
  options: {
    request?: typeof fetch;
    shouldStop?: () => boolean;
    onProgress?: (completed: number) => void;
  } = {},
): Promise<DeleteResult[]> {
  if (!items.length || items.length > 100 || new Set(items.map(item => item.id)).size !== items.length) {
    throw new Error('Chọn từ 1 đến 100 văn bản khác nhau trên trang.');
  }
  const request = options.request ?? fetch;
  const results: DeleteResult[] = [];
  let stopped = false;
  for (const item of items) {
    if (stopped || options.shouldStop?.()) {
      results.push({...item, outcome: 'skipped', message: 'Chưa thực hiện xóa.'});
      continue;
    }
    try {
      const response = await request('/api/documents/' + encodeURIComponent(item.id), {
        method: 'DELETE',
        headers: {'X-Document-Version': encodeURIComponent(item.updated)},
        signal: AbortSignal.timeout(90000),
      });
      const data = await response.json().catch(() => null) as {ok?: boolean; error?: string; warning?: string} | null;
      if (response.ok && data?.ok === true) {
        results.push({...item, outcome: 'deleted', message: data.warning || 'Đã xóa văn bản.'});
      } else if (response.status === 404) {
        results.push({...item, outcome: 'missing', message: 'Văn bản không còn trong sổ. Kiểm tra tệp Drive nếu cần.'});
      } else if ([400, 401, 403, 409, 429].includes(response.status)) {
        results.push({...item, outcome: 'failed', message: data?.error || 'Yêu cầu bị từ chối. Vui lòng đăng nhập lại hoặc kiểm tra văn bản.'});
        if ([401, 403, 429].includes(response.status)) stopped = true;
      } else {
        results.push({...item, outcome: 'unknown', message: 'Chưa xác định kết quả. Kiểm tra lại sổ và Drive trước khi thử lại.'});
        stopped = true;
      }
    } catch {
      results.push({...item, outcome: 'unknown', message: 'Mất kết nối hoặc hết thời gian chờ. Kiểm tra lại sổ và Drive trước khi thử lại.'});
      stopped = true;
    }
    options.onProgress?.(results.length);
  }
  return results;
}
