import type {Doc} from './documents';

/**
 * Suggests the next sequential document number based on category, direction, and existing documents.
 * Recognizes formats such as "05/CV-TH", "12/QĐ-UBND", "100/KH-TH", etc.
 * Keeps separate number sequence for each document category.
 */
export function suggestNextNumber(docs: Doc[], direction: string, category: string): string {
  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);

  // Filter docs matching direction, category, and relevant to current year
  const candidateDocs = docs.filter(d => {
    if (direction !== 'all' && d.direction !== direction) return false;
    if (category && category !== 'all' && d.category !== category) return false;
    const matchesYear = d.issued?.startsWith(yearStr) || d.received?.startsWith(yearStr) || d.number.includes(yearStr);
    return matchesYear;
  });

  let maxNum = 0;
  let detectedSuffix = '';

  for (const d of candidateDocs) {
    const trimmed = (d.number || '').trim();
    const match = trimmed.match(/^(\d+)(.*)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum && num < 100000) {
        maxNum = num;
        detectedSuffix = match[2];
      }
    }
  }

  const nextNum = maxNum + 1;
  const numStr = nextNum < 10 ? `0${nextNum}` : String(nextNum);

  if (detectedSuffix) {
    return `${numStr}${detectedSuffix}`;
  }

  const abbrMap: Record<string, string> = {
    'Công văn': 'CV',
    'Quyết định': 'QĐ',
    'Thông báo': 'TB',
    'Kế hoạch': 'KH',
    'Báo cáo': 'BC',
    'Tờ trình': 'TTr',
    'Khác': 'VB',
  };
  const abbr = abbrMap[category] || 'VB';
  return `${numStr}/${abbr}-TH`;
}
