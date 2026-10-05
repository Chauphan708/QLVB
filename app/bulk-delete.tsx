'use client';

import {useEffect, useRef, useState} from 'react';
import {Trash2} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import {AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from '@/components/ui/alert-dialog';
import {deleteSelected, type DeleteItem, type DeleteResult} from '@/lib/bulk-delete';

export function useBulkDelete(docs: DeleteItem[], scope: string, loading: boolean, reload: () => Promise<unknown>) {
  const [admin, setAdmin] = useState(false);
  const [selection, setSelection] = useState<{scope: string; versions: Record<string, string>}>({scope, versions: {}});
  const [review, setReview] = useState<DeleteItem[] | null>(null);
  const [results, setResults] = useState<DeleteResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');
  const stop = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', {cache: 'no-store'}).then(r => r.ok ? r.json() : null)
      .then(data => {if (active) setAdmin(data?.admin === true)}).catch(() => {});
    return () => {active = false};
  }, []);
  useEffect(() => {setSelection({scope, versions: {}})}, [scope]);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = ''};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  const chosen = docs.filter(doc => selection.scope === scope && selection.versions[doc.id] === doc.updated);
  const chosenIds = new Set(chosen.map(doc => doc.id));
  const clear = () => setSelection({scope, versions: {}});
  const rowCheckbox = (doc: DeleteItem) => admin ? <Checkbox
    aria-label={'Chọn văn bản ' + doc.number}
    checked={chosenIds.has(doc.id)} disabled={loading || busy}
    onCheckedChange={value => setSelection(previous => {
      const versions = previous.scope === scope ? {...previous.versions} : {};
      if (value === true) versions[doc.id] = doc.updated; else delete versions[doc.id];
      return {scope, versions};
    })}/> : null;
  const headerCheckbox = admin ? <Checkbox aria-label="Chọn tất cả văn bản trên trang"
    checked={docs.length > 0 && chosen.length === docs.length ? true : chosen.length ? 'indeterminate' : false}
    disabled={loading || busy || !docs.length}
    onCheckedChange={value => setSelection({scope, versions: value === true ? Object.fromEntries(docs.map(doc => [doc.id, doc.updated])) : {}})}/> : null;

  async function confirm() {
    if (!review?.length || running.current) return;
    running.current = true;
    stop.current = false;
    setStopping(false); setBusy(true); setError(''); setCompleted(0);
    try {
      const report = await deleteSelected(review, {shouldStop: () => stop.current, onProgress: setCompleted});
      setResults(report); clear();
      await reload();
    } catch {
      setError('Không hoàn tất thao tác. Kiểm tra lại danh sách trước khi thử lại.');
    } finally {running.current = false; setBusy(false)}
  }

  const bar = admin && chosen.length > 0 ? <div className="bulk-toolbar">
    <span>Đã chọn <strong>{chosen.length}</strong> văn bản trên trang</span>
    <button className="secondary compact" disabled={busy || loading} onClick={clear}>Bỏ chọn</button>
    <button className="secondary compact danger" disabled={busy || loading} onClick={() => {
      setReview(chosen.map(doc => ({...doc}))); setResults(null); setError('');
    }}><Trash2 size={16}/>Xóa đã chọn ({chosen.length})</button>
  </div> : null;
  const removed = results?.filter(result => result.outcome === 'deleted').length || 0;
  const entries: Array<DeleteItem & {outcome?: DeleteResult['outcome']; message?: string}> = results || review || [];
  const dialog = <AlertDialog open={review !== null} onOpenChange={open => {if (!open && !running.current) setReview(null)}}>
    <AlertDialogContent className="bulk-dialog">
      <AlertDialogTitle>{results ? 'Kết quả xóa văn bản' : `Xóa ${review?.length || 0} văn bản đã chọn?`}</AlertDialogTitle>
      <AlertDialogDescription>{results
        ? `Đã xóa ${removed}/${review?.length || 0} văn bản. Xem kết quả từng mục bên dưới.`
        : `Sẽ xóa thông tin ${review?.length || 0} văn bản khỏi sổ và chuyển ${review?.filter(doc => doc.file_key).length || 0} tệp đính kèm vào Thùng rác Google Drive. Thông tin văn bản không thể khôi phục trong phần mềm. Chỉ các mục liệt kê dưới đây được xóa.`}
      </AlertDialogDescription>
      <ul className="bulk-review">{entries.map(doc => <li key={doc.id}>
        <strong>{doc.number}</strong><span>{doc.title}</span>
        {doc.outcome && <><p className={'bulk-result ' + doc.outcome}>{doc.message}</p>
          {doc.file_key && (doc.outcome !== 'deleted' || doc.message !== 'Đã xóa văn bản.') &&
            <a href={'https://drive.google.com/file/d/' + encodeURIComponent(doc.file_key) + '/view'} target="_blank" rel="noreferrer">Kiểm tra tệp trên Drive</a>}</>}
      </li>)}</ul>
      {busy && <p role="status">Đã xử lý {completed}/{review?.length} văn bản. {stopping ? 'Sẽ dừng sau mục đang xử lý.' : 'Vui lòng giữ trang này mở.'}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <AlertDialogFooter>{busy ? <button className="secondary" disabled={stopping} onClick={() => {stop.current = true; setStopping(true)}}>Dừng sau mục đang xử lý</button>
        : results ? <AlertDialogCancel>Đóng kết quả</AlertDialogCancel>
        : <><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="delete-action" onClick={event => {event.preventDefault(); void confirm()}}>Xóa {review?.length} văn bản</AlertDialogAction></>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return {admin, chosenIds, rowCheckbox, headerCheckbox, bar, dialog};
}
