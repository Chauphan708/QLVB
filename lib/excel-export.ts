import type {Doc} from './documents';
import {fmt, today} from './documents';
import type {PrintConfig} from './print-config';

interface ExportExcelOptions {
  docs: Doc[];
  view: string;
  direction: string;
  from?: string;
  to?: string;
  config: PrintConfig;
  yearNote?: string;
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateRegistryExcel({
  docs,
  view,
  direction,
  from,
  to,
  config,
  yearNote,
}: ExportExcelOptions): string {
  const activeDirection = direction !== 'all' ? direction : ['in', 'out', 'internal'].includes(view) ? view : 'all';
  const isIn = activeDirection === 'in';
  const colCount = isIn ? 9 : 8;

  const title = isIn
    ? 'SỔ ĐĂNG KÝ VĂN BẢN ĐẾN'
    : activeDirection === 'out'
    ? 'SỔ ĐĂNG KÝ VĂN BẢN ĐI'
    : activeDirection === 'internal'
    ? 'SỔ ĐĂNG KÝ VĂN BẢN NỘI BỘ'
    : 'SỔ THEO DÕI VĂN BẢN';

  const dateSpanText = from && to
    ? `Từ ngày ${fmt(from)} đến ngày ${fmt(to)}`
    : from
    ? `Từ ngày ${fmt(from)}`
    : to
    ? `Đến ngày ${fmt(to)}`
    : '';

  const leftSpan = Math.floor(colCount / 2);
  const rightSpan = colCount - leftSpan;

  let rowsHtml = '';
  docs.forEach((doc, idx) => {
    if (isIn) {
      rowsHtml += `
        <tr>
          <td class="cell-center">${idx + 1}</td>
          <td class="cell-center">${escapeHtml(fmt(doc.received))}</td>
          <td class="cell-left">${escapeHtml(doc.organization || doc.issuing_body || '—')}</td>
          <td class="cell-center font-bold">${escapeHtml(doc.number)}</td>
          <td class="cell-center">${escapeHtml(fmt(doc.issued))}</td>
          <td class="cell-left">${escapeHtml(doc.title)}</td>
          <td class="cell-left">${escapeHtml(doc.assignee || '—')}</td>
          <td class="cell-center">${escapeHtml(fmt(doc.due))}</td>
          <td class="cell-left">${escapeHtml(doc.notes || '')}</td>
        </tr>`;
    } else {
      rowsHtml += `
        <tr>
          <td class="cell-center">${idx + 1}</td>
          <td class="cell-center font-bold">${escapeHtml(doc.number)}</td>
          <td class="cell-center">${escapeHtml(fmt(doc.issued))}</td>
          <td class="cell-left">${escapeHtml(doc.title)}</td>
          <td class="cell-left">${escapeHtml(doc.assignee || doc.issuing_body || '—')}</td>
          <td class="cell-left">${escapeHtml(doc.organization || '—')}</td>
          <td class="cell-center">${escapeHtml(fmt(doc.due))}</td>
          <td class="cell-left">${escapeHtml(doc.notes || '')}</td>
        </tr>`;
    }
  });

  const tableHeaderHtml = isIn
    ? `
      <tr class="th-row">
        <th style="width: 45px;">STT</th>
        <th style="width: 100px;">Ngày vào sổ</th>
        <th style="width: 170px;">Cơ quan ban hành / Nơi gửi</th>
        <th style="width: 120px;">Số, ký hiệu</th>
        <th style="width: 100px;">Ngày ban hành</th>
        <th style="width: 300px;">Trích yếu nội dung</th>
        <th style="width: 130px;">Người nhận xử lý</th>
        <th style="width: 100px;">Hạn xử lý</th>
        <th style="width: 130px;">Ghi chú</th>
      </tr>`
    : `
      <tr class="th-row">
        <th style="width: 45px;">STT</th>
        <th style="width: 130px;">Số, ký hiệu</th>
        <th style="width: 100px;">Ngày ban hành</th>
        <th style="width: 320px;">Trích yếu nội dung</th>
        <th style="width: 150px;">Người / Đơn vị soạn thảo</th>
        <th style="width: 150px;">Nơi nhận</th>
        <th style="width: 100px;">Hạn xử lý</th>
        <th style="width: 130px;">Ghi chú</th>
      </tr>`;

  const excelContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(title.slice(0, 31))}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:Orientation>Landscape</x:Orientation>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; }
    table { border-collapse: collapse; width: 100%; }
    .org-header { text-align: center; font-size: 11pt; line-height: 1.3; }
    .motto-header { text-align: center; font-size: 11pt; line-height: 1.3; }
    .main-title { font-size: 16pt; font-weight: bold; text-align: center; }
    .sub-title { font-size: 11pt; font-weight: bold; text-align: center; }
    .date-span { font-size: 10pt; font-style: italic; text-align: center; }
    .th-row th {
      background-color: #D9E1F2;
      border: 0.5pt solid #000000;
      font-weight: bold;
      text-align: center;
      padding: 8px 4px;
      vertical-align: middle;
    }
    .cell-center {
      border: 0.5pt solid #000000;
      text-align: center;
      vertical-align: top;
      padding: 6px 4px;
      mso-number-format: "\\@";
    }
    .cell-left {
      border: 0.5pt solid #000000;
      text-align: left;
      vertical-align: top;
      padding: 6px 6px;
      mso-number-format: "\\@";
    }
    .font-bold { font-weight: bold; }
    .italic { font-style: italic; }
    .sig-title { font-weight: bold; font-size: 11pt; text-align: center; }
    .sig-sub { font-style: italic; font-size: 9.5pt; text-align: center; }
    .sig-name { font-weight: bold; font-size: 11pt; text-align: center; }
  </style>
</head>
<body>
  <table>
    <!-- Top Header -->
    <tr>
      <td colspan="${leftSpan}" class="org-header">
        ${config.parentOrg ? `<div style="text-transform: uppercase;">${escapeHtml(config.parentOrg)}</div>` : ''}
        <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(config.schoolName)}</div>
        <div style="font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000;">${escapeHtml(config.department)}</div>
      </td>
      <td colspan="${rightSpan}" class="motto-header">
        <div style="font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight: bold; border-bottom: 1px solid #000;">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>

    <tr><td colspan="${colCount}" style="height: 14px;"></td></tr>

    <!-- Main Title -->
    <tr>
      <td colspan="${colCount}" class="main-title">${escapeHtml(title)}</td>
    </tr>
    ${yearNote ? `<tr><td colspan="${colCount}" class="sub-title">${escapeHtml(yearNote)}</td></tr>` : ''}
    ${dateSpanText ? `<tr><td colspan="${colCount}" class="date-span">${escapeHtml(dateSpanText)}</td></tr>` : ''}

    <tr><td colspan="${colCount}" style="height: 12px;"></td></tr>

    <!-- Data Table -->
    ${tableHeaderHtml}
    ${rowsHtml}

    <tr><td colspan="${colCount}" style="height: 20px;"></td></tr>

    <!-- Signatures -->
    <tr>
      <td colspan="${leftSpan}" class="sig-title">NGƯỜI VÀO SỔ</td>
      <td colspan="${rightSpan}" class="sig-sub">Ngày ${fmt(today())}</td>
    </tr>
    <tr>
      <td colspan="${leftSpan}" class="sig-sub">(Ký và ghi rõ họ tên)</td>
      <td colspan="${rightSpan}" class="sig-title">HIỆU TRƯỞNG / THỦ TRƯỞNG ĐƠN VỊ</td>
    </tr>
    <tr>
      <td colspan="${leftSpan}"></td>
      <td colspan="${rightSpan}" class="sig-sub">(Ký, đóng dấu và ghi rõ họ tên)</td>
    </tr>
    <tr>
      <td colspan="${leftSpan}" style="height: 55px;"></td>
      <td colspan="${rightSpan}" style="height: 55px;"></td>
    </tr>
    <tr>
      <td colspan="${leftSpan}" class="sig-name">${escapeHtml(config.clerkName || '')}</td>
      <td colspan="${rightSpan}" class="sig-name">${escapeHtml(config.principalName || '')}</td>
    </tr>
  </table>
</body>
</html>`;

  return '\uFEFF' + excelContent.trim();
}

export function downloadRegistryExcel(options: ExportExcelOptions) {
  const content = generateRegistryExcel(options);
  const blob = new Blob([content], {type: 'application/vnd.ms-excel;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const activeDirection = options.direction !== 'all' ? options.direction : options.view;
  const slug = activeDirection === 'in' ? 'den' : activeDirection === 'out' ? 'di' : activeDirection === 'internal' ? 'noi-bo' : 'tong-hop';
  link.href = url;
  link.download = `so-van-ban-${slug}-${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
