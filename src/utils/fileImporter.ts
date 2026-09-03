import * as XLSX from 'xlsx';

export interface ParsedFileInfo {
  name: string;
  size: string;
  count: number;
  data: any[];
  sheetName?: string;
  format: 'json' | 'xlsx' | 'xls' | 'csv';
}

/**
 * Parses either a JSON file or an Excel file (.xlsx, .xls, .csv).
 * In Excel files:
 * - Row 1 (first row) is treated as the column headers (Object Keys / JSON properties)
 * - Subsequent rows become object values
 */
export async function parseImportFile(file: File): Promise<ParsedFileInfo> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const sizeFormatted = file.size > 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : `${(file.size / 1024).toFixed(1)} KB`;

  // 1. JSON File
  if (lowerName.endsWith('.json') || file.type === 'application/json') {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error(`محتوای فایل JSON باید یک آرایه از رکوردها باشد (با [ شروع شود).`);
      }
      return {
        name: fileName,
        size: sizeFormatted,
        count: parsed.length,
        data: parsed,
        format: 'json'
      };
    } catch (err: any) {
      throw new Error(`خطا در پردازش فایل JSON (${fileName}): ${err.message || 'ساختار نامعتبر'}`);
    }
  }

  // 2. Excel / CSV File (.xlsx, .xls, .csv)
  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type.includes('csv')
  ) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: false,
        raw: false,
        cellText: true
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error(`فایل اکسل ${fileName} فاقد شیت داده است.`);
      }

      // Read the first active sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`شیت ${sheetName} در فایل اکسل خالی یا نامعتبر است.`);
      }

      // Convert sheet to JSON array where row 1 = keys
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        blankrows: false,
        raw: false
      });

      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error(`هیچ رکوردی در شیت «${sheetName}» فایل اکسل یافت نشد (یا ردیف‌های پس از سرستون خالی هستند).`);
      }

      // Clean keys and values: trim whitespaces from header keys and string values
      const cleanedData = rawRows.map((row) => {
        const item: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim();
          if (!cleanKey) return;
          let val = row[key];
          if (typeof val === 'string') {
            val = val.trim();
          }
          item[cleanKey] = val;
        });
        return item;
      }).filter(row => {
        // Filter out completely empty rows
        return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
      });

      return {
        name: fileName,
        size: sizeFormatted,
        count: cleanedData.length,
        data: cleanedData,
        sheetName,
        format: lowerName.endsWith('.csv') ? 'csv' : (lowerName.endsWith('.xls') ? 'xls' : 'xlsx')
      };
    } catch (err: any) {
      throw new Error(`خطا در خواندن فایل اکسل (${fileName}): ${err.message || 'فرمت نامعتبر'}`);
    }
  }

  // 3. Fallback: try parsing as JSON first, then as Excel workbook
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return {
        name: fileName,
        size: sizeFormatted,
        count: parsed.length,
        data: parsed,
        format: 'json'
      };
    }
  } catch {
    // Attempt Excel parse fallback
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', raw: false });
      if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', blankrows: false });
        if (Array.isArray(rows) && rows.length > 0) {
          return {
            name: fileName,
            size: sizeFormatted,
            count: rows.length,
            data: rows,
            sheetName,
            format: 'xlsx'
          };
        }
      }
    } catch (e: any) {
      console.warn(e);
    }
  }

  throw new Error(`فرمت فایل «${fileName}» پشتیبانی نمی‌شود. لطفاً فایل Excel (.xlsx / .xls) یا JSON انتخاب کنید.`);
}
