'use client';

import {useState} from 'react';
import {Printer, X} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Doc} from '@/lib/documents';
import {fmt, today} from '@/lib/documents';

interface PrintRegistryProps {
  docs: Doc[];
  view: string;
  direction: string;
  from?: string;
  to?: string;
  total: number;
}

export default function PrintRegistry({docs, view, direction, from, to, total}: PrintRegistryProps) {
  const [open, setOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('TRƯỜNG HỌC');
  const [department, setDepartment] = useState('BỘ PHẬN VĂN THƯ - VĂN PHÒNG');
  const [yearNote, setYearNote] = useState(`Năm học ${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`);

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
              <DialogTitle className="text-lg font-bold">In sổ văn bản (Nghị định 30/2020/NĐ-CP)</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Khổ giấy A4 ngang · Bảng in {docs.length} văn bản đang hiển thị trên trang này
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="primary" onClick={handlePrint}>
                <Printer size={16} /> In sổ ngay
              </button>
            </div>
          </div>

          <div className="print-customization-bar no-print">
            <label>
              <span>Tên đơn vị:</span>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                maxLength={100}
                placeholder="VD: TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN"
              />
            </label>
            <label>
              <span>Bộ phận vào sổ:</span>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                maxLength={100}
                placeholder="VD: VĂN PHÒNG NHÀ TRƯỜNG"
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

          {/* PRINTABLE CONTAINER */}
          <div className="print-sheet-wrapper" id="printable-area">
            <div className="print-header">
              <div className="print-org">
                <p className="font-bold uppercase tracking-wider">{department}</p>
                <p className="font-bold uppercase tracking-wider border-b border-black pb-0.5 inline-block">{schoolName}</p>
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
                    <th style={{width: '6%'}}>STT</th>
                    <th style={{width: '10%'}}>Ngày vào sổ</th>
                    <th style={{width: '15%'}}>Cơ quan ban hành / Nơi gửi</th>
                    <th style={{width: '13%'}}>Số, ký hiệu</th>
                    <th style={{width: '10%'}}>Ngày ban hành</th>
                    <th style={{width: '26%'}}>Trích yếu nội dung</th>
                    <th style={{width: '10%'}}>Người xử lý</th>
                    <th style={{width: '10%'}}>Hạn xử lý</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{width: '6%'}}>STT</th>
                    <th style={{width: '14%'}}>Số, ký hiệu</th>
                    <th style={{width: '11%'}}>Ngày ban hành</th>
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
                <div style={{height: '60px'}} />
              </div>
              <div className="print-signature-box">
                <p className="italic text-xs">Ngày {fmt(today())}</p>
                <p className="font-bold uppercase">HIỆU TRƯỞNG / THỦ TRƯỞNG ĐƠN VỊ</p>
                <p className="italic text-xs">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <div style={{height: '60px'}} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
