import { RawLetterItem, ProcessedLetter, LetterActionType, RawEraItem, ProcessedEraItem, UnitMonthlyStat, CauseRule, ExclusionRule } from '../types';

export const PERSIAN_MONTH_NAMES: { [key: string]: string } = {
  '01': 'فروردین',
  '02': 'اردیبهشت',
  '03': 'خرداد',
  '04': 'تیر',
  '05': 'مرداد',
  '06': 'شهریور',
  '07': 'مهر',
  '08': 'آبان',
  '09': 'آذر',
  '10': 'دی',
  '11': 'بهمن',
  '12': 'اسفند',
};

export interface PersianMonthItem {
  name: string;
  num: string;
  days: number;
}

export const PERSIAN_MONTHS_LIST: PersianMonthItem[] = [
  { name: 'فروردین', num: '01', days: 31 },
  { name: 'اردیبهشت', num: '02', days: 31 },
  { name: 'خرداد', num: '03', days: 31 },
  { name: 'تیر', num: '04', days: 31 },
  { name: 'مرداد', num: '05', days: 31 },
  { name: 'شهریور', num: '06', days: 31 },
  { name: 'مهر', num: '07', days: 30 },
  { name: 'آبان', num: '08', days: 30 },
  { name: 'آذر', num: '09', days: 30 },
  { name: 'دی', num: '10', days: 30 },
  { name: 'بهمن', num: '11', days: 30 },
  { name: 'اسفند', num: '12', days: 29 },
];

/**
 * Returns current Jalali year, month, and day based on system time or fallback
 */
export function getCurrentJalaliDate(): { year: number; month: number; day: number; str: string } {
  try {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parseInt(parts.find(p => p.type === 'year')?.value || '1405', 10);
    const m = parseInt(parts.find(p => p.type === 'month')?.value || '6', 10);
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
    return {
      year: y,
      month: m,
      day: d,
      str: `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
    };
  } catch {
    return { year: 1405, month: 6, day: 1, str: '1405/06/01' };
  }
}

/**
 * Calculates a Jalali date N months ago from a reference date
 */
export function getJalaliMonthsAgo(monthsAgo: number, refYear?: number, refMonth?: number, refDay?: number): string {
  const current = getCurrentJalaliDate();
  let y = refYear || current.year;
  let m = refMonth || current.month;
  let d = refDay || current.day;

  m -= monthsAgo;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }

  const maxDays = m <= 6 ? 31 : (m <= 11 ? 30 : 29);
  if (d > maxDays) d = maxDays;

  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

export const DEFAULT_EXCLUSION_RULES: ExclusionRule[] = [
  {
    id: 'ex-rule-test-fa',
    keyword: 'تست',
    matchType: 'contains',
    field: 'subject',
    targetUnit: null,
    isActive: true,
    reason: 'حذف نامه‌ها و رکوردهای دارای عنوان «تست» از محاسبات آماری'
  },
  {
    id: 'ex-rule-test-en',
    keyword: 'test',
    matchType: 'contains',
    field: 'subject',
    targetUnit: null,
    isActive: true,
    reason: 'حذف کلمه لاتین test از آمار و داشبوردها'
  },
  {
    id: 'ex-rule-azmayeshi',
    keyword: 'آزمایشی',
    matchType: 'contains',
    field: 'subject',
    targetUnit: null,
    isActive: true,
    reason: 'نادیده‌گیری نامه‌های آزمایشی و تمرینی پرسنل'
  }
];

export const DEFAULT_CAUSE_RULES: CauseRule[] = [
  {
    id: 'rule-bank-1',
    keyword: 'بانک از حساب شرکت برداشت نگردیده',
    cause: 'بانکی',
    targetUnit: 'حسابداری مالی',
    matchType: 'contains',
    isActive: true,
    color: '#2563EB',
    description: 'خطای عدم برداشت توسط بانک در واحد حسابداری مالی (عدم ارتباط با اشتباه کارمند)',
    priority: 10
  },
  {
    id: 'rule-bank-2',
    keyword: 'برداشت نگردیده',
    cause: 'بانکی',
    targetUnit: 'حسابداری مالی',
    matchType: 'contains',
    isActive: true,
    color: '#2563EB',
    description: 'تطابق کلیدواژه عدم برداشت در حسابداری مالی',
    priority: 8
  },
  {
    id: 'rule-bank-3',
    keyword: 'بانک',
    cause: 'بانکی',
    targetUnit: 'حسابداری مالی',
    matchType: 'contains',
    isActive: true,
    color: '#2563EB',
    description: 'تمام مکاتبات مربوط به عملیات و تراکنش‌های بانکی در حسابداری مالی',
    priority: 5
  }
];

/**
 * Normalizes Persian / Arabic letters for robust text matching
 */
export function normalizePersianText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200b\uFEFF]/g, ' ') // replace zero-width spaces with regular space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Classifies a letter's root cause (عامل) based on active rules
 */
export function classifyLetterCause(
  letterData: {
    subject?: string | null;
    originalSubject?: string | null;
    orgUnit?: string | null;
    description?: string | null;
    note?: string | null;
  },
  rules: CauseRule[] = DEFAULT_CAUSE_RULES
): { cause: string; reason: string; color: string } {
  const activeRules = rules.filter(r => r.isActive !== false);

  const subjectNorm = normalizePersianText(`${letterData.subject || ''} ${letterData.originalSubject || ''}`);
  const extraNorm = normalizePersianText(`${letterData.description || ''} ${letterData.note || ''}`);
  const combinedText = `${subjectNorm} ${extraNorm}`.trim();
  const unitNorm = normalizePersianText(letterData.orgUnit);

  // Sort rules by priority descending
  const sortedRules = [...activeRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (!rule.keyword || !rule.keyword.trim()) continue;

    // Check target unit constraint if specified
    if (rule.targetUnit && rule.targetUnit.trim() !== '' && rule.targetUnit !== 'all' && rule.targetUnit !== 'همه واحدها') {
      const ruleUnitNorm = normalizePersianText(rule.targetUnit);
      if (!unitNorm.includes(ruleUnitNorm) && !ruleUnitNorm.includes(unitNorm)) {
        continue; // Target unit didn't match
      }
    }

    const keywordNorm = normalizePersianText(rule.keyword);
    let matched = false;

    if (rule.matchType === 'exact') {
      matched = subjectNorm === keywordNorm || combinedText === keywordNorm;
    } else if (rule.matchType === 'startsWith') {
      matched = subjectNorm.startsWith(keywordNorm) || combinedText.startsWith(keywordNorm);
    } else {
      // Default: contains
      matched = combinedText.includes(keywordNorm) || subjectNorm.includes(keywordNorm);
    }

    if (matched) {
      return {
        cause: rule.cause.trim(),
        reason: `قانون: تطابق با "${rule.keyword}"${rule.targetUnit ? ` (واحد: ${rule.targetUnit})` : ''}`,
        color: rule.color || '#2563EB'
      };
    }
  }

  // Fallback: default to "نامشخص" as instructed by the user
  return {
    cause: 'نامشخص',
    reason: 'عدم تطابق با قوانین فعال',
    color: '#6B7280'
  };
}

/**
 * Extracts the organizational unit from creator string formatted as "Name - Role - Unit"
 * e.g. "حمزه صمصامی - کارشناس - حسابداری مالیاتی و ارزش افزوده" ->
 *      name: "حمزه صمصامی", role: "کارشناس", unit: "حسابداری مالیاتی و ارزش افزوده"
 * e.g. "نیلوفر علیرضائی - کارمند - فروش" -> "فروش"
 * e.g. "نادیا سعدی - کارشناس - حسابداری مالی" -> "حسابداری مالی"
 */
export function extractOrgUnit(creatorStr?: string | null, senderStr?: string | null): { unit: string; name: string; role: string } {
  const target = (creatorStr && creatorStr.trim().length > 0) ? creatorStr : (senderStr || '');
  if (!target || target.trim().length === 0) {
    return { unit: 'نامشخص', name: 'نامشخص', role: 'نامشخص' };
  }

  // Normalize all Unicode dashes, hyphens, and whitespace
  // Includes ASCII hyphen (\u002D), non-breaking hyphen (\u2011), en-dash (\u2013), em-dash (\u2014),
  // minus sign (\u2212), horizontal bar (\u2015), figure dash (\u2012), small hyphens (\uFE58, \uFE63, \uFF0D)
  const normalized = target
    .replace(/[\u002D\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]|\s+ـ\s+/g, '-')
    .replace(/\u00A0/g, ' ')
    .trim();

  // Split by hyphen
  const parts = normalized.split('-').map(p => p.trim()).filter(Boolean);

  if (parts.length >= 3) {
    // 3 or more fields:
    // Field 1: Name (نام شخص) e.g. "حمزه صمصامی"
    // Field 2: Role / Position (سمت/نقش) e.g. "کارشناس"
    // Field 3+: Organizational Unit (واحد سازمانی) e.g. "حسابداری مالیاتی و ارزش افزوده"
    return {
      name: parts[0],
      role: parts[1],
      unit: parts.slice(2).join(' - ') // In case unit contains sub-parts separated by hyphen
    };
  } else if (parts.length === 2) {
    return {
      name: parts[0],
      role: 'کارشناس',
      unit: parts[1]
    };
  } else if (parts.length === 1) {
    return {
      name: parts[0],
      role: 'نامشخص',
      unit: 'نامشخص'
    };
  }

  return { unit: 'نامشخص', name: 'نامشخص', role: 'نامشخص' };
}

/**
 * Resolves creator name, role and unit cleanly for UI tables and cards,
 * ensuring that the organizational unit is removed from the creator name/role
 * and placed exclusively in the unit field.
 */
export function resolveLetterCreatorAndUnit(letter: any): { unit: string; name: string; role: string } {
  if (!letter) {
    return { unit: 'نامشخص', name: 'نامشخص', role: '' };
  }

  const rawCreator = (
    letter.creatorRaw ||
    letter.raw?.["ایجاد کننده نامه"] ||
    letter.raw?.["ایجاد کننده"] ||
    letter.raw?.["ایجادکننده نامه"] ||
    letter.raw?.["ایجادکننده"] ||
    letter.raw?.["کاربر ایجاد کننده"] ||
    letter.raw?.["ثبت کننده"] ||
    letter.raw?.creator ||
    letter["ایجاد کننده نامه"] ||
    letter["ایجاد کننده"] ||
    ''
  );

  // If we have a raw creator string with hyphens, extract cleanly (Field 1: Name, Field 2: Role, Field 3: Unit)
  if (rawCreator && (rawCreator.includes('-') || rawCreator.includes('–') || rawCreator.includes('—'))) {
    const extracted = extractOrgUnit(rawCreator, letter.sender);
    return {
      unit: (extracted.unit && extracted.unit !== 'نامشخص') ? extracted.unit : (letter.orgUnit || 'نامشخص'),
      name: extracted.name || letter.creatorName || 'نامشخص',
      role: (extracted.role && extracted.role !== 'نامشخص') ? extracted.role : (letter.creatorRole || '')
    };
  }

  // If creatorName itself mistakenly contains hyphens (e.g. from unparsed raw source)
  if (letter.creatorName && (letter.creatorName.includes('-') || letter.creatorName.includes('–') || letter.creatorName.includes('—'))) {
    const extracted = extractOrgUnit(letter.creatorName, letter.sender);
    return {
      unit: (extracted.unit && extracted.unit !== 'نامشخص') ? extracted.unit : (letter.orgUnit || 'نامشخص'),
      name: extracted.name || 'نامشخص',
      role: (extracted.role && extracted.role !== 'نامشخص') ? extracted.role : (letter.creatorRole || '')
    };
  }

  return {
    unit: letter.orgUnit || 'نامشخص',
    name: letter.creatorName || 'نامشخص',
    role: (letter.creatorRole && letter.creatorRole !== 'نامشخص' && letter.creatorRole !== letter.creatorName) ? letter.creatorRole : ''
  };
}

/**
 * Checks if subject contains "حذف" -> type is "حذف", otherwise "ویرایش"
 */
export function classifyLetterType(subject?: string | null, letterSubject?: string | null): LetterActionType {
  const combined = `${subject || ''} ${letterSubject || ''}`.trim();
  if (combined.includes('حذف') || combined.includes('خذف')) {
    return 'حذف';
  }
  return 'ویرایش';
}

/**
 * Cleans subject string for deduplication (removes prefixes like "ارجاع به دیگری: ")
 */
export function normalizeSubjectForDeduplication(subject?: string | null, letterSubject?: string | null): string {
  const base = (letterSubject && letterSubject.trim().length > 0) ? letterSubject : (subject || '');
  let cleaned = base.replace(/^(ارجاع به دیگری:\s*)+/gi, '')
                    .replace(/^(پاسخ به:\s*)+/gi, '')
                    .trim();
  // If still empty or "بدون عنوان", fallback to subject
  if (!cleaned || cleaned === 'بدون عنوان') {
    cleaned = (subject || 'نامه بدون عنوان').replace(/^(ارجاع به دیگری:\s*)+/gi, '').trim();
  }
  return cleaned.toLowerCase();
}

/**
 * Extracts Persian Year, Month, Day, and formatted string from date strings like:
 * "11:28 1405/04/17" or "1405\/03\/28" or "1404/12/25" or "1405-03-15"
 */
export function parsePersianDate(dateStr?: string | null): { dateStr: string; year: string; month: string; monthName: string; day: string } {
  if (!dateStr) {
    return { dateStr: '1405/01/01', year: '1405', month: '1405/01', monthName: 'فروردین ۱۴۰۵', day: '۰۱' };
  }

  const faNums = '۰۱۲۳۴۵۶۷۸۹';
  const arNums = '٠١٢٣٤٥٦٧٨٩';
  let cleaned = String(dateStr).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(faNums[i], String(i)).replaceAll(arNums[i], String(i));
  }
  cleaned = cleaned.replace(/\\/g, '/');

  // Match Persian date pattern 13xx or 14xx with /, -, ., or space
  const match = cleaned.match(/(1[34]\d\d)[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{1,2})/);

  if (match) {
    const year = match[1];
    const rawMonth = match[2].padStart(2, '0');
    const rawDay = match[3].padStart(2, '0');
    const monthKey = `${year}/${rawMonth}`;
    const mName = PERSIAN_MONTH_NAMES[rawMonth] || rawMonth;

    return {
      dateStr: `${year}/${rawMonth}/${rawDay}`,
      year,
      month: monthKey,
      monthName: `${mName} ${year}`,
      day: rawDay
    };
  }

  // Check year and month match (e.g. 1405/03)
  const ymMatch = cleaned.match(/(1[34]\d\d)[\/\-\.\s]+(\d{1,2})/);
  if (ymMatch) {
    const year = ymMatch[1];
    const rawMonth = ymMatch[2].padStart(2, '0');
    const monthKey = `${year}/${rawMonth}`;
    const mName = PERSIAN_MONTH_NAMES[rawMonth] || rawMonth;
    return {
      dateStr: `${year}/${rawMonth}/01`,
      year,
      month: monthKey,
      monthName: `${mName} ${year}`,
      day: '01'
    };
  }

  return { dateStr: cleaned.trim(), year: '1405', month: '1405/01', monthName: 'نامشخص', day: '۰۱' };
}

/**
 * Normalizes date inputs (converting Persian/Arabic digits, standardizing separators YYYY/MM/DD)
 */
export function normalizeDateInput(input?: string | null): string {
  if (!input) return '';
  const faNums = '۰۱۲۳۴۵۶۷۸۹';
  const arNums = '٠١٢٣٤٥٦٧٨٩';
  let s = String(input).trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(faNums[i], String(i)).replaceAll(arNums[i], String(i));
  }

  // Match full YYYY/MM/DD first
  const fullMatch = s.match(/(1[34]\d\d)[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{1,2})/);
  if (fullMatch) {
    const y = fullMatch[1];
    const m = fullMatch[2].padStart(2, '0');
    const d = fullMatch[3].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  // Match 2-digit year like 05/03/15 -> 1405/03/15
  const shortYearMatch = s.match(/^(\d{2})[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{1,2})$/);
  if (shortYearMatch) {
    const y = '14' + shortYearMatch[1];
    const m = shortYearMatch[2].padStart(2, '0');
    const d = shortYearMatch[3].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  // Match year + month (e.g. 1405/03 or 1405-3)
  const ymMatch = s.match(/(1[34]\d\d)[\/\-\.\s]+(\d{1,2})/);
  if (ymMatch) {
    const y = ymMatch[1];
    const m = ymMatch[2].padStart(2, '0');
    return `${y}/${m}`;
  }

  // Match year only (e.g. 1405)
  const yMatch = s.match(/(1[34]\d\d)/);
  if (yMatch) {
    return yMatch[1];
  }

  // Fallback cleanup
  s = s.replace(/[\-\.\\\s]+/g, '/').trim();
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    let [y, m, d] = parts;
    if (y.length === 2) y = '14' + y;
    return `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
  } else if (parts.length === 2) {
    let [y, m] = parts;
    if (y.length === 2) y = '14' + y;
    return `${y}/${m.padStart(2, '0')}`;
  } else if (parts.length === 1 && parts[0].length === 4) {
    return parts[0];
  }
  return s;
}

/**
 * Checks if a target date falls within startDate and endDate range (inclusive)
 */
export function isDateInRange(targetDate?: string | null, startDate?: string | null, endDate?: string | null): boolean {
  if (!startDate && !endDate) return true;
  if (!targetDate) return false;

  const normTarget = normalizeDateInput(targetDate);
  if (!normTarget) return false;

  const targetFull = normTarget.length === 4 
    ? `${normTarget}/01/01` 
    : (normTarget.length === 7 ? `${normTarget}/01` : normTarget);

  if (startDate) {
    const normStart = normalizeDateInput(startDate);
    if (normStart) {
      const startFull = normStart.length === 4 
        ? `${normStart}/01/01` 
        : (normStart.length === 7 ? `${normStart}/01` : normStart);
      if (targetFull < startFull) return false;
    }
  }

  if (endDate) {
    const normEnd = normalizeDateInput(endDate);
    if (normEnd) {
      const endFull = normEnd.length === 4 
        ? `${normEnd}/12/29` 
        : (normEnd.length === 7 ? `${normEnd}/31` : normEnd);
      if (targetFull > endFull) return false;
    }
  }

  return true;
}

/**
 * Checks if a letter matches any active exclusion rules (e.g. contains "تست", "test", etc.)
 */
export function isLetterExcluded(
  letterData: {
    subject?: string | null;
    originalSubject?: string | null;
    orgUnit?: string | null;
    creatorName?: string | null;
    creatorRaw?: string | null;
    actionType?: string | null;
    description?: string | null;
    note?: string | null;
    [key: string]: any;
  },
  rules: ExclusionRule[] = DEFAULT_EXCLUSION_RULES
): { isExcluded: boolean; matchedRule?: ExclusionRule; reason?: string } {
  const activeRules = rules.filter(r => r.isActive !== false);
  if (!activeRules.length) {
    return { isExcluded: false };
  }

  const subject = letterData.subject || letterData["موضوع نامه"] || letterData["موضوع"] || '';
  const origSubject = letterData.originalSubject || letterData["موضوع"] || '';
  const desc = letterData.description || letterData["توضیحات نامه"] || letterData["شرح"] || '';
  const unit = letterData.orgUnit || letterData["واحد سازمانی"] || letterData["سازمان"] || '';
  const creator = letterData.creatorName || letterData.creatorRaw || letterData["ایجاد کننده نامه"] || letterData["ایجاد کننده"] || letterData["ثبت کننده"] || '';
  const actionType = letterData.actionType || letterData["نوع عملیات"] || letterData["نوع مکاتبه"] || '';

  const subjectNorm = normalizePersianText(`${subject} ${origSubject}`);
  const unitNorm = normalizePersianText(unit);
  const creatorNorm = normalizePersianText(creator);
  const actionNorm = normalizePersianText(actionType);
  const allNorm = normalizePersianText(`${subject} ${origSubject} ${desc} ${unit} ${creator}`);

  for (const rule of activeRules) {
    if (!rule.keyword || !rule.keyword.trim()) continue;

    // Target unit scope constraint (if specified and not 'all')
    if (rule.targetUnit && rule.targetUnit.trim() !== '' && rule.targetUnit !== 'all' && rule.targetUnit !== 'همه واحدها') {
      const ruleUnitNorm = normalizePersianText(rule.targetUnit);
      if (!unitNorm.includes(ruleUnitNorm) && !ruleUnitNorm.includes(unitNorm)) {
        continue;
      }
    }

    const keywordNorm = normalizePersianText(rule.keyword);
    
    // Choose evaluation target according to rule.field
    let targetText = subjectNorm;
    let fieldLabel = 'موضوع';

    if (rule.field === 'unit') {
      targetText = unitNorm;
      fieldLabel = 'واحد سازمانی';
    } else if (rule.field === 'creator') {
      targetText = creatorNorm;
      fieldLabel = 'ایجادکننده/ثبت‌کننده';
    } else if (rule.field === 'actionType') {
      targetText = actionNorm;
      fieldLabel = 'نوع عملیات (حذف/ویرایش)';
    } else if (rule.field === 'all') {
      targetText = allNorm;
      fieldLabel = 'تمام فیلدها و شرح';
    }

    let matched = false;

    if (rule.matchType === 'exact') {
      matched = targetText === keywordNorm;
    } else if (rule.matchType === 'startsWith') {
      matched = targetText.startsWith(keywordNorm);
    } else {
      // contains
      matched = targetText.includes(keywordNorm);
    }

    if (matched) {
      return {
        isExcluded: true,
        matchedRule: rule,
        reason: rule.reason || `استثنا بر اساس ${fieldLabel}: «${rule.keyword}»${rule.targetUnit && rule.field !== 'unit' ? ` (واحد: ${rule.targetUnit})` : ''}`
      };
    }
  }

  return { isExcluded: false };
}

/**
 * Process an array of raw letter objects
 */
export function processRawLetters(
  rawList: RawLetterItem[],
  rules: CauseRule[] = DEFAULT_CAUSE_RULES,
  exclusionRules: ExclusionRule[] = DEFAULT_EXCLUSION_RULES
): ProcessedLetter[] {
  const seenRegNumbers = new Set<string>();
  const processedLetters: ProcessedLetter[] = [];

  rawList.forEach((item, index) => {
    const rawAny = item as any;

    // Strict extraction of registration number exclusively from "شماره ثبت"
    const regNoRaw = rawAny["شماره ثبت"];
    const registrationNumber = (regNoRaw !== undefined && regNoRaw !== null && String(regNoRaw).trim() !== '')
      ? String(regNoRaw).trim()
      : null;

    // Strict Deduplication: If "شماره ثبت" exists and has already been processed, skip duplicate row
    if (registrationNumber) {
      if (seenRegNumbers.has(registrationNumber)) {
        return; // Skip duplicate letter with identical شماره ثبت
      }
      seenRegNumbers.add(registrationNumber);
    }

    const subject = (
      rawAny["موضوع نامه"] ||
      rawAny["موضوع"] ||
      rawAny["عنوان نامه"] ||
      rawAny["عنوان"] ||
      rawAny["subject"] ||
      rawAny["Subject"] ||
      'نامه بدون موضوع'
    ).toString().trim();

    const originalSubject = (
      rawAny["موضوع"] ||
      rawAny["موضوع نامه"] ||
      rawAny["عنوان نامه"] ||
      rawAny["عنوان"] ||
      rawAny["subject"] ||
      ''
    ).toString().trim();

    const normalizedKey = normalizeSubjectForDeduplication(subject, originalSubject);
    const actionType = classifyLetterType(subject, originalSubject);
    
    const creatorStr = (
      rawAny["ایجاد کننده نامه"] ||
      rawAny["ایجاد کننده"] ||
      rawAny["ایجادکننده نامه"] ||
      rawAny["ایجادکننده"] ||
      rawAny["ایجاد‌کننده نامه"] ||
      rawAny["ایجاد‌کننده"] ||
      rawAny["کاربر ایجاد کننده"] ||
      rawAny["کاربر ایجادکننده"] ||
      rawAny["ثبت کننده نامه"] ||
      rawAny["ثبت کننده"] ||
      rawAny["ثبت‌کننده"] ||
      rawAny["ثبت‌کننده نامه"] ||
      rawAny["نام ایجاد کننده"] ||
      rawAny["creatorRaw"] ||
      rawAny["creator"] ||
      rawAny["creatorName"] ||
      ''
    );
    const senderStr = rawAny["فرستنده"] || rawAny["فرستنده نامه"] || rawAny["ارسال کننده"] || rawAny["sender"] || '';
    const { unit, name: creatorName, role: creatorRole } = extractOrgUnit(creatorStr, senderStr);
    
    const dateInput = rawAny["تاریخ ثبت"] || rawAny["زمان دریافت"] || rawAny["زمان خاتمه"] || rawAny["تاریخ"] || rawAny["date"] || rawAny["Date"] || '';
    const dateParsed = parsePersianDate(dateInput ? String(dateInput) : '');
    
    const isReferral = (
      rawAny["ارجاع به دیگری"] === 'بله' ||
      rawAny["ارجاع به دیگری"] === true ||
      rawAny["ارجاع"] === 'بله' ||
      (subject && subject.includes('ارجاع به دیگری'))
    );

    const description = (rawAny["شرح"] || rawAny["توضیحات نامه"] || rawAny["توضیحات"] || rawAny["description"] || '').toString();
    const note = (rawAny["یادداشت"] || rawAny["یادداشت نامه"] || rawAny["note"] || '').toString();

    // Classify cause using the rule engine
    const causeInfo = classifyLetterCause({
      subject,
      originalSubject,
      orgUnit: unit,
      description,
      note
    }, rules);

    // Check exclusion status
    const exclusionInfo = isLetterExcluded({
      subject,
      originalSubject,
      orgUnit: unit,
      creatorName,
      creatorRaw: creatorStr ? String(creatorStr) : '',
      actionType,
      description,
      note
    }, exclusionRules);

    const rawId = rawAny["شناسه"] ?? rawAny["شماره"] ?? rawAny["کد"] ?? rawAny["id"] ?? rawAny["ID"];
    const uniqueId = `letter-${registrationNumber ? `reg-${registrationNumber}-` : (rawId ? `${rawId}-` : '')}${index + 1}`;
    const displayId = registrationNumber || (rawId !== undefined && rawId !== null && rawId !== '' ? rawId : (index + 1));

    processedLetters.push({
      id: uniqueId,
      letterId: displayId,
      raw: item,
      subject,
      originalSubject,
      normalizedSubjectKey: normalizedKey,
      actionType,
      cause: causeInfo.cause,
      causeReason: causeInfo.reason,
      causeColor: causeInfo.color,
      isExcluded: exclusionInfo.isExcluded,
      exclusionReason: exclusionInfo.reason,
      creatorRaw: creatorStr ? String(creatorStr) : '',
      creatorName,
      creatorRole,
      orgUnit: unit,
      sender: senderStr ? String(senderStr) : 'نامشخص',
      receiver: (rawAny["گیرنده"] || rawAny["گیرنده نامه"] || rawAny["receiver"] || 'نامشخص').toString(),
      dateStr: dateParsed.dateStr,
      year: dateParsed.year,
      month: dateParsed.month,
      monthName: dateParsed.monthName,
      registrationNumber,
      status: rawAny["وضعیت نامه"] || rawAny["وضعیت"] || null,
      urgency: (rawAny["فوریت"] || rawAny["فوریت نامه"] || rawAny["اولویت"] || 'عادی').toString(),
      isReferral: Boolean(isReferral)
    });
  });

  return processedLetters;
}

/**
 * Process an array of raw ERA items ensuring guaranteed globally unique IDs
 */
export function processRawEraItems(rawList: RawEraItem[]): ProcessedEraItem[] {
  const seenIds = new Set<string>();

  return rawList.map((item, index) => {
    const rawAny = item as any;
    const processName = (
      rawAny["نام فرایند"] ||
      rawAny["نام فرآیند"] ||
      rawAny["عنوان فرآیند"] ||
      rawAny["عنوان فرایند"] ||
      rawAny["فرآیند"] ||
      rawAny["فرایند"] ||
      rawAny["نام"] ||
      rawAny["processName"] ||
      rawAny["ProcessName"] ||
      'فرایند بدون نام'
    ).toString().trim();

    const orgUnit = (
      rawAny["واحد سازمانی"] ||
      rawAny["واحد"] ||
      rawAny["سازمان"] ||
      rawAny["دپارتمان"] ||
      rawAny["orgUnit"] ||
      rawAny["OrgUnit"] ||
      'نامشخص'
    ).toString().trim();

    const rawDate = rawAny["تاریخ انجام"] || rawAny["تاریخ ثبت"] || rawAny["تاریخ"] || rawAny["زمان انجام"] || rawAny["executionDate"] || '';
    const dateParsed = parsePersianDate(rawDate ? String(rawDate) : '');
    
    // Generate an ID and ensure absolute uniqueness
    let baseId = item.id || (item as any)._dbId || `era-${index + 1}`;
    let finalId = baseId;
    let counter = 1;
    while (seenIds.has(finalId)) {
      finalId = `${baseId}-dup-${counter}`;
      counter++;
    }
    seenIds.add(finalId);
    
    // Check if selected for slide
    const isSelectedForSlide = Boolean(item.isSelectedForSlide || rawAny["اسلاید"] === 'بله' || rawAny["اسلاید"] === true);

    // Description
    const description = (
      item.description ||
      rawAny["توضیحات"] ||
      rawAny["شرح"] ||
      rawAny["شرح فرآیند"] ||
      rawAny["توضیح"] ||
      rawAny["description"] ||
      ''
    ).toString().trim();

    // Operation type (نوع عملیات: اصلاح | جدید | اتوماتیک‌سازی)
    const rawOpType = (
      item.operationType ||
      rawAny["نوع عملیات"] ||
      rawAny["نوع"] ||
      rawAny["عملیات"] ||
      rawAny["operationType"] ||
      ''
    ).toString().trim();

    let operationType: 'جدید' | 'اصلاح' | 'اتوماتیک‌سازی' | string = 'اصلاح';
    if (
      rawOpType.includes('اتوماتیک') ||
      rawOpType.includes('اوتوماتیک') ||
      rawOpType.includes('اتوماسیون') ||
      rawOpType.toLowerCase().includes('auto') ||
      description.includes('اتوماتیک سازی') ||
      description.includes('اتوماتیک‌سازی') ||
      description.includes('اتوماسیون')
    ) {
      operationType = 'اتوماتیک‌سازی';
    } else if (rawOpType.includes('جدید') || rawOpType.toLowerCase() === 'new' || rawOpType.includes('ایجاد')) {
      operationType = 'جدید';
    } else if (rawOpType.includes('اصلاح') || rawOpType.toLowerCase() === 'edit' || rawOpType.toLowerCase() === 'modify') {
      operationType = 'اصلاح';
    } else if (rawOpType) {
      operationType = rawOpType;
    } else if (description.includes('ایجاد') || description.includes('ساخت')) {
      operationType = 'جدید';
    }

    // Entity Type (نوع موجودیت: فرم | فرآیند | گزارش)
    const rawEntityType = (
      item.entityType ||
      item["نوع موجودیت"] ||
      rawAny["نوع موجودیت"] ||
      rawAny["موجودیت"] ||
      rawAny["entityType"] ||
      rawAny["نوع رکورد"] ||
      ''
    ).toString().trim();

    let entityType: 'فرم' | 'فرآیند' | 'گزارش' | string = 'فرآیند';
    if (
      rawEntityType.includes('گزارش') ||
      rawEntityType.includes('کاوشگر') ||
      rawEntityType.toLowerCase().includes('report')
    ) {
      entityType = 'گزارش';
    } else if (
      rawEntityType.includes('فرم') ||
      rawEntityType.toLowerCase().includes('form')
    ) {
      entityType = 'فرم';
    } else if (
      rawEntityType.includes('فرآیند') ||
      rawEntityType.includes('فرایند') ||
      rawEntityType.toLowerCase().includes('process')
    ) {
      entityType = 'فرآیند';
    } else if (rawEntityType) {
      entityType = rawEntityType;
    } else {
      // Smart detection based on process name and description
      if (processName.includes('کاوشگر') || processName.includes('گزارش') || description.includes('گزارش') || description.includes('کاوشگر')) {
        entityType = 'گزارش';
      } else if (processName.includes('فرم') || description.includes('فرم')) {
        entityType = 'فرم';
      } else {
        entityType = 'فرآیند';
      }
    }

    // Problem, Solution and Operational Achievements descriptions (custom presentation text)
    let problemDescription = item.problemDescription || rawAny["مشکل"] || rawAny["چالش"] || undefined;
    let solutionDescription = item.solutionDescription || rawAny["راهکار"] || rawAny["اقدام"] || undefined;
    let achievements = item.achievements || rawAny["دستاوردها"] || rawAny["دستاوردها و نتایج عملیاتی"] || rawAny["دستاورد"] || undefined;
    let showAchievements = item.showAchievements !== undefined ? item.showAchievements : undefined;
    let impactTimeMetric = item.impactTimeMetric || rawAny["صرفه‌جویی زمان"] || rawAny["صرفه جویی زمان"] || undefined;
    let impactErrorMetric = item.impactErrorMetric || rawAny["کاهش خطای انسانی"] || rawAny["کاهش خطا"] || undefined;
    let showImpactMetrics = item.showImpactMetrics !== undefined ? item.showImpactMetrics : undefined;
    let slideNumber: number | null | undefined = item.slideNumber ?? rawAny["شماره اسلاید"] ?? rawAny["ترتیب اسلاید"] ?? rawAny["slideNumber"] ?? rawAny["slideOrder"] ?? undefined;
    if (slideNumber !== undefined && slideNumber !== null) {
      const parsedNum = Number(slideNumber);
      slideNumber = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : null;
    }

    if (typeof window !== 'undefined') {
      if (!problemDescription) {
        problemDescription = localStorage.getItem(`era_prob_desc_${finalId}`) || localStorage.getItem(`era_prob_desc_${baseId}`) || undefined;
      }
      if (!solutionDescription) {
        solutionDescription = localStorage.getItem(`era_sol_desc_${finalId}`) || localStorage.getItem(`era_sol_desc_${baseId}`) || undefined;
      }
      if (!achievements) {
        achievements = localStorage.getItem(`era_achievements_${finalId}`) || localStorage.getItem(`era_achievements_${baseId}`) || undefined;
      }
      if (showAchievements === undefined) {
        const savedShowAch = localStorage.getItem(`era_show_ach_${finalId}`) || localStorage.getItem(`era_show_ach_${baseId}`);
        if (savedShowAch !== null) showAchievements = savedShowAch === 'true';
      }
      if (!impactTimeMetric) {
        impactTimeMetric = localStorage.getItem(`era_time_metric_${finalId}`) || localStorage.getItem(`era_time_metric_${baseId}`) || undefined;
      }
      if (!impactErrorMetric) {
        impactErrorMetric = localStorage.getItem(`era_error_metric_${finalId}`) || localStorage.getItem(`era_error_metric_${baseId}`) || undefined;
      }
      if (showImpactMetrics === undefined) {
        const savedShowImp = localStorage.getItem(`era_show_imp_${finalId}`) || localStorage.getItem(`era_show_imp_${baseId}`);
        if (savedShowImp !== null) showImpactMetrics = savedShowImp === 'true';
      }
      if (slideNumber === undefined) {
        const savedSlideNum = localStorage.getItem(`era_slide_num_${finalId}`) || localStorage.getItem(`era_slide_num_${baseId}`);
        if (savedSlideNum !== null && savedSlideNum !== '') {
          const parsedNum = Number(savedSlideNum);
          slideNumber = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : null;
        }
      }
    }

    return {
      id: finalId,
      processName,
      orgUnit,
      executionDate: dateParsed.dateStr,
      year: dateParsed.year,
      month: dateParsed.month,
      monthName: dateParsed.monthName,
      operationType,
      entityType,
      description: description,
      createdAt: item.createdAt || new Date().toISOString(),
      formImageUrl: item.formImageUrl,
      formImages: item.formImages,
      beforeImageUrl: item.beforeImageUrl,
      afterImageUrl: item.afterImageUrl,
      isSelectedForSlide,
      slideNumber: slideNumber ?? null,
      slideOrder: slideNumber ?? null,
      problemDescription,
      solutionDescription,
      achievements,
      showAchievements: showAchievements === true,
      impactTimeMetric,
      impactErrorMetric,
      showImpactMetrics: showImpactMetrics === true
    };
  });
}

/**
 * Compute monthly matrix per unit: which unit had how many deletes and edits in each month
 */
export function computeMonthlyMatrix(letters: ProcessedLetter[]): {
  unitStats: UnitMonthlyStat[];
  allMonths: string[];
  grandTotalDeletes: number;
  grandTotalEdits: number;
  grandTotalLetters: number;
  grandTotalUniqueLetters: number;
} {
  // Only include active (non-excluded) letters in statistical computations
  const validLetters = letters.filter(l => !l.isExcluded);

  // Collect all distinct months and sort chronologically
  const monthSet = new Set<string>();
  validLetters.forEach(l => {
    if (l.month) monthSet.add(l.month);
  });
  const allMonths = Array.from(monthSet).sort();

  // Group by Unit
  const unitMap = new Map<string, ProcessedLetter[]>();
  validLetters.forEach(l => {
    const u = l.orgUnit || 'نامشخص';
    if (!unitMap.has(u)) {
      unitMap.set(u, []);
    }
    unitMap.get(u)!.push(l);
  });

  const unitStats: UnitMonthlyStat[] = [];
  let grandTotalDeletes = 0;
  let grandTotalEdits = 0;
  let grandTotalLetters = 0;

  // Track unique letters overall
  const grandUniqueSubjectSet = new Set<string>();

  unitMap.forEach((uLetters, unitName) => {
    const monthsData: UnitMonthlyStat['months'] = {};
    let totalDeletes = 0;
    let totalEdits = 0;

    const unitUniqueSubjects = new Set<string>();
    const unitUniqueDeletes = new Set<string>();
    const unitUniqueEdits = new Set<string>();

    allMonths.forEach(m => {
      monthsData[m] = {
        deleteCount: 0,
        editCount: 0,
        total: 0,
        uniqueDeleteCount: 0,
        uniqueEditCount: 0,
        uniqueTotal: 0
      };
    });

    // Process each letter in this unit
    const monthSubjectDeletes = new Map<string, Set<string>>();
    const monthSubjectEdits = new Map<string, Set<string>>();

    allMonths.forEach(m => {
      monthSubjectDeletes.set(m, new Set<string>());
      monthSubjectEdits.set(m, new Set<string>());
    });

    uLetters.forEach(l => {
      const uKey = l.registrationNumber || l.normalizedSubjectKey || l.id;
      grandUniqueSubjectSet.add(uKey);
      unitUniqueSubjects.add(uKey);

      const m = l.month;
      if (!monthsData[m]) {
        monthsData[m] = {
          deleteCount: 0,
          editCount: 0,
          total: 0,
          uniqueDeleteCount: 0,
          uniqueEditCount: 0,
          uniqueTotal: 0
        };
        monthSubjectDeletes.set(m, new Set<string>());
        monthSubjectEdits.set(m, new Set<string>());
      }

      if (l.actionType === 'حذف') {
        monthsData[m].deleteCount++;
        totalDeletes++;
        grandTotalDeletes++;
        unitUniqueDeletes.add(uKey);
        monthSubjectDeletes.get(m)?.add(uKey);
      } else {
        monthsData[m].editCount++;
        totalEdits++;
        grandTotalEdits++;
        unitUniqueEdits.add(uKey);
        monthSubjectEdits.get(m)?.add(uKey);
      }

      monthsData[m].total++;
      grandTotalLetters++;
    });

    // Populate unique stats per month
    allMonths.forEach(m => {
      if (monthsData[m]) {
        const uDel = monthSubjectDeletes.get(m)?.size || 0;
        const uEd = monthSubjectEdits.get(m)?.size || 0;
        monthsData[m].uniqueDeleteCount = uDel;
        monthsData[m].uniqueEditCount = uEd;
        monthsData[m].uniqueTotal = uDel + uEd;
      }
    });

    unitStats.push({
      unit: unitName,
      months: monthsData,
      totalDeletes,
      totalEdits,
      totalLetters: uLetters.length,
      totalUniqueDeletes: unitUniqueDeletes.size,
      totalUniqueEdits: unitUniqueEdits.size,
      totalUniqueLetters: unitUniqueSubjects.size
    });
  });

  // Sort units by total letters descending
  unitStats.sort((a, b) => b.totalLetters - a.totalLetters);

  return {
    unitStats,
    allMonths,
    grandTotalDeletes,
    grandTotalEdits,
    grandTotalLetters,
    grandTotalUniqueLetters: grandUniqueSubjectSet.size
  };
}

/**
 * Format numbers with Persian thousand separators
 */
export function formatNumber(num: number | string): string {
  if (num === null || num === undefined || isNaN(Number(num))) return '۰';
  return Number(num).toLocaleString('fa-IR');
}

/**
 * Convert JSON list to Persian Excel-friendly CSV with UTF-8 BOM
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(header => {
      const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
