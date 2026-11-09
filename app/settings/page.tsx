'use client';

import './settings.css';
import {useEffect, useState} from 'react';

type Quota = {
  limit?: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
};

type Status = {
  admin: boolean;
  database?: boolean;
  drive?: {email: string; folderId: string} | null;
  quota?: Quota | null;
};

function formatGB(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 GB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function Settings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/admin/session', {cache: 'no-store'});
      if (!r.ok) throw new Error('Không đọc được trạng thái kết nối.');
      setStatus(await r.json());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không tải được cấu hình.');
    }
  }

  useEffect(() => {
    void load();
    setMessage(new URLSearchParams(window.location.search).get('message') || '');
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Không đăng nhập được.');
      setPassword('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không đăng nhập được.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/session', {method: 'DELETE'});
      if (!r.ok) throw new Error('Không đăng xuất được.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Lỗi đăng xuất.');
    } finally {
      setBusy(false);
    }
  }

  async function runCleanup() {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const r = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Dọn dẹp thất bại.');
      setCleanupResult(`Đã dọn dẹp ${d.cleaned || 0} tệp dở dang${d.errors ? ` (lỗi ${d.errors} tệp)` : ''}.`);
      await load();
    } catch (e) {
      setCleanupResult(e instanceof Error ? e.message : 'Không thể dọn dẹp.');
    } finally {
      setCleaning(false);
    }
  }

  const quota = status?.quota;
  const usagePercent = quota?.limit ? Math.min(100, Math.round((quota.usage / quota.limit) * 100)) : 0;

  return (
    <main className="settings-page">
      <a href="/" className="back-link">← Về sổ văn bản</a>
      <h1>Quản trị & kết nối</h1>
      <p>Thông tin văn bản lưu ở Supabase. Tệp đính kèm lưu trong Google Drive cá nhân đã kết nối.</p>

      {message && <p role="status" className="settings-message">{message}</p>}

      {!status ? (
        <p>Đang kiểm tra…</p>
      ) : !status.admin ? (
        <form onSubmit={login} className="settings-login-form">
          <h2>Đăng nhập quản trị</h2>
          <label>
            <span>Mật khẩu quản trị:</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu quản trị..."
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
          <p className="settings-hint">Mật khẩu do người triển khai thiết lập trong ADMIN_PASSWORD. Không dùng mật khẩu Gmail.</p>
        </form>
      ) : (
        <>
          <section className="settings-section">
            <h2>Cơ sở dữ liệu Supabase</h2>
            <p>
              {status.database
                ? '✅ Đã kết nối cơ sở dữ liệu PostgreSQL an toàn qua Transaction Pooler.'
                : '❌ Chưa kết nối được. Kiểm tra DATABASE_URL và chạy tệp SQL theo README.'}
            </p>
          </section>

          <section className="settings-section">
            <h2>Google Drive & Dung lượng lưu trữ</h2>
            {status.drive ? (
              <>
                <p>
                  Đã cấu hình tài khoản Google: <strong>{status.drive.email}</strong>
                </p>
                <p>
                  <a
                    href={'https://drive.google.com/drive/folders/' + encodeURIComponent(status.drive.folderId)}
                    target="_blank"
                    rel="noreferrer"
                    className="drive-folder-link"
                  >
                    📂 Mở thư mục "Văn thư trường học" trên Google Drive ↗
                  </a>
                </p>

                {quota && (
                  <div className="quota-box">
                    <div className="quota-header">
                      <span>Dung lượng tài khoản Drive:</span>
                      <strong>
                        {formatGB(quota.usage)} / {quota.limit ? formatGB(quota.limit) : 'Không giới hạn'} ({usagePercent}%)
                      </strong>
                    </div>
                    {quota.limit && (
                      <div className="quota-bar-bg">
                        <div
                          className={`quota-bar-fill ${usagePercent > 85 ? 'danger' : usagePercent > 70 ? 'warning' : ''}`}
                          style={{width: `${usagePercent}%`}}
                        />
                      </div>
                    )}
                    <div className="quota-details">
                      <span>Tệp văn thư trong Drive: {formatGB(quota.usageInDrive)}</span>
                      <span>Trong Thùng rác Drive: {formatGB(quota.usageInDriveTrash)}</span>
                    </div>
                  </div>
                )}

                <p className="settings-hint">
                  Nếu quyền Google hết hạn (chế độ Testing 7 ngày), nhấn "Kết nối lại" cùng tài khoản. Toàn bộ tệp cũ đã lưu vẫn được giữ nguyên.
                </p>
              </>
            ) : (
              <p>Kết nối lần đầu sẽ tự động tạo thư mục “Văn thư trường học” trong Drive của bạn.</p>
            )}

            <div className="settings-btn-group">
              <a className="primary" href="/api/drive/connect">
                {status.drive ? 'Kết nối lại Google Drive' : 'Kết nối Google Drive'}
              </a>
            </div>
          </section>

          <section className="settings-section">
            <h2>Bảo trì kho dữ liệu</h2>
            <p>
              Dọn dẹp các phiên tải dở dang trong bảng tạm và thùng rác Drive đối với các tệp đã tạo quá 24 giờ mà không được lưu thành công.
            </p>
            <button
              type="button"
              className="secondary"
              disabled={cleaning}
              onClick={runCleanup}
            >
              {cleaning ? 'Đang dọn dẹp…' : '🧹 Dọn dẹp tệp tải dở (> 24 giờ)'}
            </button>
            {cleanupResult && <p className="cleanup-result">{cleanupResult}</p>}
          </section>

          <div className="settings-actions">
            <a href="/" className="primary">Mở sổ văn bản</a>
            <button className="secondary" disabled={busy} onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </main>
  );
}
