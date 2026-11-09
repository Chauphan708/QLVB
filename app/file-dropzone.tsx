'use client';

import {useState, useRef, DragEvent, ChangeEvent} from 'react';
import {UploadCloud, FileText, X, CheckCircle2, AlertCircle} from 'lucide-react';
import {isAllowedUploadSize, UPLOAD_SIZE_ERROR} from '@/lib/upload-limits';
import {formatBytes} from '@/lib/documents';

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  existingFileName?: string | null;
  uploadProgress: number | null;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'];

function getFileTypeBadge(fileName: string): {label: string; color: string} {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return {label: 'PDF', color: 'badge-pdf'};
  if (['doc', 'docx'].includes(ext)) return {label: 'WORD', color: 'badge-word'};
  if (['xls', 'xlsx'].includes(ext)) return {label: 'EXCEL', color: 'badge-excel'};
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return {label: 'ẢNH', color: 'badge-img'};
  return {label: ext.toUpperCase(), color: 'badge-other'};
}

export default function FileDropzone({
  file,
  onFileSelect,
  existingFileName,
  uploadProgress,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSelect(selectedFile: File) {
    setClientError('');
    const ext = '.' + (selectedFile.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setClientError('Chỉ hỗ trợ tệp định dạng PDF, Word, Excel hoặc Ảnh (PNG, JPG, WEBP).');
      return;
    }
    if (!isAllowedUploadSize(selectedFile.size)) {
      setClientError(UPLOAD_SIZE_ERROR);
      return;
    }
    onFileSelect(selectedFile);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSelect(droppedFile);
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSelect(selected);
    }
  }

  function clearSelected(e: React.MouseEvent) {
    e.stopPropagation();
    setClientError('');
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="dropzone-container">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        className="sr-only"
        id="dropzone-file-input"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {file ? (
        <div className="dropzone-selected">
          <div className="dropzone-file-info">
            <span className={`file-badge ${getFileTypeBadge(file.name).color}`}>
              {getFileTypeBadge(file.name).label}
            </span>
            <div className="dropzone-file-meta">
              <strong className="dropzone-file-name" title={file.name}>{file.name}</strong>
              <small className="dropzone-file-size">{formatBytes(file.size)}</small>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              className="dropzone-remove-btn"
              onClick={clearSelected}
              aria-label="Hủy chọn tệp này"
              title="Hủy chọn tệp"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`dropzone-box ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="Kéo thả hoặc nhấp để tải tệp đính kèm"
        >
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="dropzone-prompt">
                <strong>Kéo thả tệp vào đây</strong> hoặc <span className="dropzone-browse">chọn từ máy tính</span>
              </p>
              <p className="dropzone-hint">
                Hỗ trợ PDF, Word, Excel, ảnh · Dung lượng tối đa 100 MB
              </p>
              {existingFileName && (
                <p className="dropzone-existing">
                  <CheckCircle2 size={14} className="inline mr-1 text-emerald-600" />
                  Đang có: <strong>{existingFileName}</strong> (chọn tệp mới nếu muốn thay thế)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="dropzone-progress" aria-live="polite">
          <div className="dropzone-progress-bar">
            <div
              className="dropzone-progress-fill"
              style={{width: `${uploadProgress}%`}}
            />
          </div>
          <span className="dropzone-progress-text">
            Đang tải lên Drive: {uploadProgress}%
          </span>
        </div>
      )}

      {clientError && (
        <p className="dropzone-error" role="alert">
          <AlertCircle size={15} />
          <span>{clientError}</span>
        </p>
      )}
    </div>
  );
}
