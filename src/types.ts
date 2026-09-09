export interface RawLetterItem {
  شناسه?: number | string;
  "نوع مکاتبه"?: string | null;
  "فایل ارجاع"?: string | null;
  فرستنده?: string | null;
  گیرنده?: string | null;
  "رونوشت گیرنده"?: string | null;
  "پیگیری کننده"?: string | null;
  "جهت مکاتبه"?: string | null;
  سررسید?: string | null;
  فوریت?: string | null;
  "طبقه بندی اطلاعاتی"?: string | null;
  موضوع?: string | null;
  شرح?: string | null;
  "زمان خاتمه"?: string | null;
  "زمان ارسال"?: string | null;
  "زمان دریافت"?: string | null;
  "نوع نامه"?: string | null;
  "شماره ثبت"?: string | null;
  "تاریخ ثبت"?: string | null;
  "وضعیت نامه"?: string | null;
  "شماره وارده"?: string | null;
  "تاریخ وارده"?: string | null;
  "موضوع نامه"?: string | null;
  "پیوست نامه"?: string | null;
  "ارجاع به دیگری"?: string | null;
  پاسخ?: string | null;
  "تاریخ مشاهده"?: string | null;
  یادداشت?: string | null;
  "فرستنده نامه"?: string | null;
  "ایجاد کننده نامه"?: string | null;
  "گیرنده نامه"?: string | null;
  "فوریت نامه"?: string | null;
  "طبقه‌بندی اطلاعاتی نامه"?: string | null;
  "توضیحات نامه"?: string | null;
  "زبان نامه"?: string | null;
  "انجام دهنده"?: string | null;
  [key: string]: any;
}

export interface LetterQueryParams {
  unit?: string;
  units?: string[];
  month?: string;
  actionType?: string;
  cause?: string;
  showExcludedOnly?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface LettersServerFilterResponse {
  success: boolean;
  data: ProcessedLetter[];
  total: number;
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTimeMs: number;
  stats?: {
    total: number;
    uniqueTotal: number;
    deletes: number;
    edits: number;
    bankCount: number;
    activeUnits: number;
    topUnit: string;
    topCount: number;
    causesDistribution: { cause: string; count: number; percent: number }[];
  };
}

export type LetterActionType = 'حذف' | 'ویرایش';

export type EraOperationType = 'جدید' | 'اصلاح' | 'اتوماتیک‌سازی' | 'اتوماتیک سازی' | string;
export type EraEntityType = 'فرم' | 'فرآیند' | 'گزارش' | string;
export type EraProcessStatus = 'برای انجام' | 'درحال انجام' | 'انجام شده' | string;

export interface CauseRule {
  id: string;
  keyword: string;
  cause: string;
  targetUnit?: string | null;
  matchType?: 'contains' | 'exact' | 'startsWith';
  targetField?: string | null; // e.g. 'all' | 'یادداشت' | 'موضوع' | 'شرح' | any Excel column key
  isActive?: boolean;
  color?: string | null;
  description?: string | null;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExclusionRule {
  id: string;
  keyword: string; // e.g. "تست", "test", "آزمایشی" or unit name or creator name
  targetUnit?: string | null; // null or "all" for all units, or specific unit
  matchType?: 'contains' | 'exact' | 'startsWith';
  field?: 'subject' | 'unit' | 'creator' | 'actionType' | 'all'; // Field to evaluate rule against
  isActive?: boolean;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcessedLetter {
  id: string;
  letterId?: string | number;
  raw: RawLetterItem;
  subject: string;
  originalSubject: string;
  normalizedSubjectKey: string;
  actionType: LetterActionType;
  cause: string; // e.g. "بانکی", "نامشخص", etc.
  causeReason?: string; // Reason / rule that matched
  causeColor?: string; // Hex color tag
  isExcluded?: boolean; // Whether letter is excluded from statistics
  exclusionReason?: string; // Rule / keyword that caused exclusion
  creatorRaw: string;
  creatorName: string;
  creatorRole: string;
  orgUnit: string;
  sender: string;
  receiver: string;
  dateStr: string; // e.g. "1405/04/17"
  year: string; // e.g. "1405"
  month: string; // e.g. "1405/04"
  monthName: string; // e.g. "تیر ۱۴۰۵"
  registrationNumber?: string | null;
  status?: string | null;
  urgency?: string | null;
  isReferral?: boolean;
  note?: string | null;
}

export interface RawEraItem {
  "نام فرایند": string;
  "واحد سازمانی": string;
  "تاریخ انجام": string;
  "نوع عملیات": EraOperationType;
  "نوع موجودیت"?: EraEntityType;
  entityType?: EraEntityType;
  "وضعیت"?: EraProcessStatus;
  status?: EraProcessStatus;
  توضیحات: string;
  problemDescription?: string;
  solutionDescription?: string;
  achievements?: string[] | string;
  showAchievements?: boolean;
  impactTimeMetric?: string;
  impactErrorMetric?: string;
  showImpactMetrics?: boolean;
  isSelectedForSlide?: boolean;
  slideNumber?: number | null; // شماره و ترتیب اسلاید
  slideOrder?: number | null;
  bpmnXml?: string; // ساختار استاندارد دیاگرام BPMN 2.0 XML
  bpmnSvg?: string; // تصویر وکتور رندر شده از دیاگرام BPMN
  hasBpmn?: boolean;
  [key: string]: any;
}

export interface ProcessedEraItem {
  id: string;
  processName: string;
  orgUnit: string;
  executionDate: string; // e.g. "1405/03/28"
  year: string;
  month: string;
  monthName: string;
  operationType: EraOperationType;
  entityType?: EraEntityType;
  status?: EraProcessStatus;
  description: string;
  createdAt: string;
  formImageUrl?: string; // Main screenshot/photo of the created form
  formImages?: string[]; // Multiple photos/screenshots of the created form
  beforeImageUrl?: string; // Optional photo of the legacy paper/system
  afterImageUrl?: string; // Optional secondary screenshot of workflow
  isSelectedForSlide?: boolean; // Toggle switch for presentation slides mode
  slideNumber?: number | null; // شماره و اولویت ترتیب نمایش اسلاید
  slideOrder?: number | null;
  problemDescription?: string; // متن مشکل و چالش شناسایی‌شده (سمت راست در پرزنتیشن)
  solutionDescription?: string; // متن راهکار پیاده‌سازی‌شده در سامانه (سمت چپ در پرزنتیشن)
  achievements?: string[] | string; // دستاوردها و نتایج عملیاتی فرآیند (نمایش در کادر دستاوردهای اسلاید)
  showAchievements?: boolean; // آیا کادر دستاوردها و نتایج عملیاتی در اسلاید نمایش داده شود
  impactTimeMetric?: string; // متن شاخص صرفه‌جویی زمان (مثلا: کاهش بیش از ۸۰٪ زمان پردازش حواله‌ها)
  impactErrorMetric?: string; // متن شاخص کاهش خطای انسانی (مثلا: صفر شدن خطاهای مغایرت حساب بانکی و تراستی)
  showImpactMetrics?: boolean; // آیا کادر شاخص‌های اثرگذاری در اسلاید نمایش داده شود
  bpmnXml?: string; // نمودار فرآیند با فرمت استاندارد BPMN 2.0 XML
  bpmnSvg?: string; // تصویر وکتور رندر شده از دیاگرام BPMN
  hasBpmn?: boolean; // آیا فرآیند دارای دیاگرام طراحی شده است
}

export interface UnitMonthlyStat {
  unit: string;
  months: {
    [monthKey: string]: {
      deleteCount: number;
      editCount: number;
      total: number;
      uniqueDeleteCount: number;
      uniqueEditCount: number;
      uniqueTotal: number;
    };
  };
  totalDeletes: number;
  totalEdits: number;
  totalLetters: number;
  totalUniqueDeletes: number;
  totalUniqueEdits: number;
  totalUniqueLetters: number;
}

export interface AiSqlQueryTrace {
  title: string;
  sql: string;
  params?: any[];
  resultCount?: number;
  result?: any;
}

export interface AiDebugInfo {
  debugMode: boolean;
  modelUsed?: string;
  processingTimeMs?: number;
  keywordsExtracted?: string[];
  sqlQueries?: AiSqlQueryTrace[];
  payloadSummary?: {
    totalLetters: number;
    deleteCount: number;
    editCount: number;
    eraProcesses: number;
    activeRules: number;
  };
}

export interface EraColumnVisibility {
  index: boolean;           // # شماره ردیف
  processName: boolean;     // نام فرآیند / موجودیت
  entityType: boolean;      // نوع
  orgUnit: boolean;         // واحد سازمانی
  executionDate: boolean;   // تاریخ انجام
  operationType: boolean;   // نوع عملیات
  status: boolean;          // وضعیت
  description: boolean;     // توضیحات و شرح تغییرات
  bpmn: boolean;            // دیاگرام BPMN
  slideFullscreen: boolean; // نمایش اسلاید
  slideToggle: boolean;     // اسلایدشو
  actions: boolean;         // عملیات
}

export const DEFAULT_ERA_COLUMN_VISIBILITY: EraColumnVisibility = {
  index: true,
  processName: true,
  entityType: true,
  orgUnit: true,
  executionDate: true,
  operationType: true,
  status: true,
  description: true,
  bpmn: true,
  slideFullscreen: true,
  slideToggle: true,
  actions: true,
};

export interface EraVisibilitySettings {
  showHeader: boolean;        // باکس ۱: هدر اصلی و عنوان ERA و دکمه‌های ارائه
  showMetrics: boolean;       // باکس ۲: کارت‌های آماری ۴گانه (متریک‌ها)
  showEntityChips: boolean;   // باکس ۳: نوار ترکیب و تفکیک نوع موجودیت‌ها
  autoScrollToTable: boolean; // اسکرول خودکار به جدول هنگام کلیک روی واحدهای سازمانی و نمودارها
  slideHoverPreview: boolean; // نمایش پاپ‌آپ اسلاید هنگام رفتن ماوس روی دکمه نمایش اسلاید (۸۰٪ صفحه)
  showAiChartAnalysis?: boolean; // نمایش دکمه تحلیل هوش مصنوعی از موثرترین کارها در هدر نمودار میله‌ای (پیش‌فرض: غیرفعال)
  slideBeforeAfterUnderImage?: boolean; // نمایش متن وضعیت قبل و بعد زیر عکس‌ها (پیش‌فرض: فعال / true) یا در تب جداگانه (false)
  columnVisibility?: EraColumnVisibility; // کنترل پویای نمایش یا عدم نمایش تک‌تک ستون‌های جدول فرآیندها
}

