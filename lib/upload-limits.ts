// Keep the displayed MB convention consistent with the existing 1024-based limit.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const UPLOAD_SIZE_ERROR = 'Tệp đính kèm phải có dung lượng từ 1 byte đến 100 MB.';
export function isAllowedUploadSize(size: unknown): size is number {
  return typeof size === 'number' && Number.isInteger(size) && size >= 1 && size <= MAX_UPLOAD_BYTES;
}
