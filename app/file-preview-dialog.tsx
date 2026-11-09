'use client';

import {useState} from 'react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Download, ExternalLink, FileText, Loader2, Maximize2} from 'lucide-react';
import type {Doc} from '@/lib/documents';
import {formatBytes} from '@/lib/documents';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: Doc | null;
}

export default function FilePreviewDialog({open, onOpenChange, doc}: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(true);

  if (!doc || !doc.file_name) return null;

  const ext = (doc.file_name.split('.').pop() || '').toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  const previewUrl = `/api/documents/${encodeURIComponent(doc.id)}/file?preview=1`;
  const downloadUrl = `/api/documents/${encodeURIComponent(doc.id)}/file`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="preview-dialog">
        <div className="preview-header">
          <div className="preview-meta">
            <span className="file-icon-badge">
              <FileText size={20} />
            </span>
            <div>
              <DialogTitle className="preview-title">
                {doc.number} · {doc.file_name}
              </DialogTitle>
              <DialogDescription className="preview-desc">
                {doc.title} ({formatBytes(doc.file_size)})
              </DialogDescription>
            </div>
          </div>
          <div className="preview-actions">
            <a
              href={downloadUrl}
              className="secondary compact"
              title="Tải tệp này về máy"
            >
              <Download size={16} />
              <span>Tải về</span>
            </a>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary compact"
              title="Mở trong tab mới"
            >
              <ExternalLink size={16} />
              <span>Mở tab mới</span>
            </a>
          </div>
        </div>

        <div className="preview-body">
          {isPdf ? (
            <div className="preview-frame-container">
              {loading && (
                <div className="preview-loading">
                  <Loader2 className="animate-spin text-blue-600" size={28} />
                  <span>Đang tải nội dung văn bản…</span>
                </div>
              )}
              <iframe
                src={previewUrl}
                className="preview-iframe"
                title={doc.file_name}
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : isImage ? (
            <div className="preview-image-container">
              <img
                src={previewUrl}
                alt={doc.file_name}
                className="preview-image"
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="preview-fallback">
              <FileText size={48} className="text-gray-400" />
              <p>Tệp định dạng <strong>.{ext.toUpperCase()}</strong> không hỗ trợ xem trực tiếp trong trình duyệt.</p>
              <a href={downloadUrl} className="primary">
                <Download size={16} /> Tải tệp về máy để mở
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
