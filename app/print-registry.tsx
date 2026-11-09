'use client';

import {useState, useEffect} from 'react';
import {Printer, FileSpreadsheet, Settings2, Check, ChevronDown, ChevronUp} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Doc} from '@/lib/documents';
import {fmt, today} from '@/lib/documents';
import {downloadRegistryExcel} from '@/lib/excel-export';
import type {PrintConfig} from '@/lib/print-config';

interface PrintRegistryProps {
  docs: Doc[];
  view: string;
  direction: string;
  from?: string;
  to?: string;
  total: number;
}

const defaultLocalConfig: PrintConfig = {
  schoolName: 'TRƯỜNG HỌC',
  department: 'VĂN PHÒNG NHÀ TRƯỜNG',
  parentOrg: '',
  principalName: '',
  clerkName: '',
};

export default function PrintRegistry({docs, view, direction, from, to, total}: PrintRegistryProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PrintConfig>(defaultLocalConfig);
  const [yearNote, setYearNote] = useState(`Năm học ${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved configuration from API with localStorage fallback
  useEffect(() => {
    let active = true;
    async function loadConfig() {
      // 1. Check local storage first for instant load
      try {
        const local = localStorage.getItem('vanthu_print_config');
        if (local) {
          const parsed = JSON.parse(local);
          if (active) setConfig(prev => ({...prev, ...parsed}));
        }
      } catch {}

      // 2. Fetch authoritative setting from server
      try {
        const res = await fetch('/api/settings/print', {cache: 'no-store'});
        if (res.ok) {
          const data = await res.json() as PrintConfig;
          if (active && data?.schoolName) {
            setConfig(data);
            try {
              localStorage.setItem('vanthu_print_config', JSON.stringify(data));
            } catch {}
          }
        }
      } catch {}
    }

    if (open) {
      void loadConfig();
    }
    return () => { active = false; };
  }, [open]);

  async function saveConfig() {
    setSavingSettings(true);
    setSavedSuccess(false);

    // Save to local storage for instant persistence
    try {
      localStorage.setItem('vanthu_print_config', JSON.stringify(config));
    } catch {}

    // Save to database via API
    try {
      const res = await fetch('/api/settings/print', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {} finally {
      setSavingSettings(false);
    }
  }

  const activeDirection = direction !== 'all' ? direction : ['in', 'out', 'internal'].includes(view) ? view : 'all';

  const title = activeDirection === 'in'
    ? 'SỔ ĐĂNG KÝ VĂN BẢN ĐẾN'
    : activeDirection === 'out'
    ? 'SỔ ĐĂNG KÝ VĂN BẢN ĐI'
    : activeDirection === 'internal'
    ? 'SỔ ĐĂNG KÝ VĂN BẢN NỘI BỘ'
    : 'SỔ THEO DÕI VĂN BẢN';

  function handlePrint() {
    window.print();
  }

  function handleExportExcel() {
    downloadRegistryExcel({
      docs,
      view,
      direction,
      from,
      to,
      config,
      yearNote,
    });
  }

  return (
    <>
      <button
        type="button"
        className="secondary compact"
        onClick={() => setOpen(true)}
        disabled={docs.length === 0}
        title="In sổ văn bản chuẩn Nghị định 30/2020/NĐ-CP"
      >
        <Printer size={16} />
        <span>In sổ</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="print-dialog-content">
          <div className="print-dialog-toolbar no-print">
            <div>
              <DialogTitle className="text-lg font-bold">In sổ & Xuất Excel (Nghị định 30/2020/NĐ-CP)</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Khổ A4 ngang · Bảng in {docs.length} văn bản đang hiển thị trên trang này
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowSettings(!showSettings)}
                title="Cài đặt tên trường, tên hiệu trưởng một lần cho tất cả"
              >
                <Settings2 size={16} />
                <span>Cài đặt thông tin in ấn</span>
                {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={handleExportExcel}
                title="Xuất file Excel đúng định dạng và chữ ký như trang in"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span>Xuất Excel mẫu in</span>
              </button>

              <button type="button" className="primary" onClick={handlePrint}>
                <Printer size={16} /> In sổ ngay
              </button>
            </div>
          </div>

          {/* PRINT SETTINGS COLLAPSIBLE PANEL */}
          {showSettings && (
            <div className="print-settings-panel no-print">
              <div className="flex items-center justify-between mb-2">
                <strong className="text-sm text-blue-900">
                  ⚙️ Cài đặt thông tin in ấn (Lưu 1 lần áp dụng cho mọi lần in & xuất Excel)
                </strong>
                <button
                  type="button"
                  className="primary compact"
                  disabled={savingSettings}
                  onClick={saveConfig}
                >
                  {savedSuccess ? (
                    <>
                      <Check size={14} /> Đã lưu mặc định
                    </>
                  ) : savingSettings ? (
                    'Đang lưu…'
                  ) : (
                    'Lưu làm mặc định'
                  )}
                </button>
              </div>

              <div className="print-settings-grid">
                <label>
                  <span>Cơ quan chủ quản cấp trên (tùy chọn):</span>
                  <input
                    type="text"
                    value={config.parentOrg || ''}
                    onChange={(e) => setConfig({...config, parentOrg: e.target.value})}
                    placeholder="VD: PHÒNG GIÁO DỤC VÀ ĐÀO TẠO..."
                    maxLength={150}
                  />
                </label>

                <label>
                  <span>Tên trường học *:</span>
                  <input
                    type="text"
                    value={config.schoolName}
                    onChange={(e) => setConfig({...config, schoolName: e.target.value})}
                    placeholder="VD: TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN"
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  <span>Bộ phận vào sổ *:</span>
                  <input
                    type="text"
                    value={config.department}
                    onChange={(e) => setConfig({...config, department: e.target.value})}
                    placeholder="VD: BỘ PHẬN VĂN THƯ - VĂN PHÒNG"
                    maxLength={150}
                  />
                </label>

                <label>
                  <span>Họ và tên Hiệu trưởng / Thủ trưởng:</span>
                  <input
                    type="text"
                    value={config.principalName}
                    onChange={(e) => setConfig({...config, principalName: e.target.value})}
                    placeholder="VD: Thầy Nguyễn Văn A"
                    maxLength={100}
                  />
                </label>

                <label>
                  <span>Họ và tên Cán bộ Văn thư:</span>
                  <input
                    type="text"
                    value={config.clerkName}
                    onChange={(e) => setConfig({...config, clerkName: e.target.value})}
                    placeholder="VD: Cô Trần Thị B"
                    maxLength={100}
                  />
                </label>

                <label>
                  <span>Ghi chú niên khóa:</span>
                  <input
                    type="text"
                    value={yearNote}
                    onChange={(e) => setYearNote(e.target.value)}
                    maxLength={100}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Nhấn <strong>"Lưu làm mặc định"</strong> để hệ thống tự động ghi nhớ thông tin này vĩnh viễn cho tất cả các lần in và xuất Excel sau này.
              </p>
            </div>
          )}

          {/* PRINTABLE CONTAINER */}
          <div className="print-sheet-wrapper" id="printable-area">
            <div className="print-header">
              <div className="print-org">
                {config.parentOrg && <p className="font-bold uppercase tracking-wider text-xs mb-0.5">{config.parentOrg}</p>}
                <p className="font-bold uppercase tracking-wider border-b border-black pb-0.5 inline-block">{config.schoolName}</p>
                <p className="font-bold uppercase tracking-wider text-xs mt-0.5">{config.department}</p>
              </div>
              <div className="print-motto">
                <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold border-b border-black pb-0.5 inline-block">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>

            <div className="print-title-section">
              <h1 className="print-main-title">{title}</h1>
              <p className="print-sub-title font-semibold">{yearNote}</p>
              {(from || to) && (
                <p className="print-date-range italic text-sm">
                  {from && to ? `Từ ngày ${fmt(from)} đến ngày ${fmt(to)}` : from ? `Từ ngày ${fmt(from)}` : `Đến ngày ${fmt(to || '')}`}
                </p>
              )}
            </div>

            <table className="print-table">
              <thead>
                {activeDirection === 'in' ? (
                  <tr>
                    <th style={{width: '5%'}}>STT</th>
                    <th style={{width: '9%'}}>Ngày vào sổ</th>
                    <th style={{width: '16%'}}>Cơ quan ban hành / Nơi gửi</th>
                    <th style={{width: '12%'}}>Số, ký hiệu</th>
                    <th style={{width: '9%'}}>Ngày ban hành</th>
                    <th style={{width: '27%'}}>Trích yếu nội dung</th>
                    <th style={{width: '11%'}}>Người xử lý</th>
                    <th style={{width: '9%'}}>Hạn xử lý</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{width: '5%'}}>STT</th>
                    <th style={{width: '14%'}}>Số, ký hiệu</th>
                    <th style={{width: '10%'}}>Ngày ban hành</th>
                    <th style={{width: '33%'}}>Trích yếu nội dung</th>
                    <th style={{width: '14%'}}>Người / Bộ phận soạn thảo</th>
                    <th style={{width: '12%'}}>Nơi nhận</th>
                    <th style={{width: '10%'}}>Hạn xử lý / Ghi chú</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {docs.map((doc, idx) => (
                  <tr key={doc.id}>
                    <td className="text-center">{idx + 1}</td>
                    {activeDirection === 'in' ? (
                      <>
                        <td className="text-center">{fmt(doc.received)}</td>
                        <td>{doc.organization || doc.issuing_body || '—'}</td>
                        <td className="font-semibold">{doc.number}</td>
                        <td className="text-center">{fmt(doc.issued)}</td>
                        <td>
                          <strong>{doc.title}</strong>
                          {doc.notes && <p className="print-note">Ghi chú: {doc.notes}</p>}
                        </td>
                        <td>{doc.assignee || '—'}</td>
                        <td className="text-center">{fmt(doc.due)}</td>
                      </>
                    ) : (
                      <>
                        <td className="font-semibold">{doc.number}</td>
                        <td className="text-center">{fmt(doc.issued)}</td>
                        <td>
                          <strong>{doc.title}</strong>
                          {doc.notes && <p className="print-note">Ghi chú: {doc.notes}</p>}
                        </td>
                        <td>{doc.assignee || doc.issuing_body || '—'}</td>
                        <td>{doc.organization || '—'}</td>
                        <td className="text-center">{fmt(doc.due)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="print-footer">
              <div className="print-signature-box">
                <p className="font-bold uppercase">NGƯỜI VÀO SỔ</p>
                <p className="italic text-xs">(Ký và ghi rõ họ tên)</p>
                <div style={{height: '50px'}} />
                {config.clerkName ? (
                  <p className="font-bold text-sm uppercase">{config.clerkName}</p>
                ) : (
                  <div style={{height: '18px'}} />
                )}
              </div>
              <div className="print-signature-box">
                <p className="italic text-xs">Ngày {fmt(today())}</p>
                <p className="font-bold uppercase">HIỆU TRƯỞNG / THỦ TRƯỞNG ĐƠN VỊ</p>
                <p className="italic text-xs">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <div style={{height: '50px'}} />
                {config.principalName ? (
                  <p className="font-bold text-sm uppercase">{config.principalName}</p>
                ) : (
                  <div style={{height: '18px'}} />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
