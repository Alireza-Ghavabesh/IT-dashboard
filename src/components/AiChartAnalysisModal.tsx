import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Printer,
  BarChart3,
  Building2,
  Zap,
  Layers,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../services/api';
import { formatNumber } from '../utils/parser';

interface AiChartAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType?: 'era' | 'letters';
  chartData: any[];
  appliedFilters: {
    unit?: string;
    opType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    slideFilter?: string;
    searchQuery?: string;
    [key: string]: any;
  };
  metrics?: {
    totalItems?: number;
    newCount?: number;
    fixCount?: number;
    autoCount?: number;
    uniqueUnits?: number;
    [key: string]: any;
  };
  onOpenGeneralAiChat?: (initialQuestion?: string) => void;
}

export const AiChartAnalysisModal: React.FC<AiChartAnalysisModalProps> = ({
  isOpen,
  onClose,
  chartType = 'era',
  chartData,
  appliedFilters,
  metrics,
  onOpenGeneralAiChat
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.7-flash');
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);

  const fetchAnalysis = async (force = false) => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.analyzeBarChart({
        chartType,
        chartData,
        appliedFilters,
        metrics,
        focusAction: 'most_effective_actions'
      });

      if (response.success && response.analysis) {
        setAnalysis(response.analysis);
        setModelUsed(response.model || 'gemini-3.7-flash');
        setExecutionTimeMs(response.executionTimeMs);
        setAnalysisTimestamp(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        throw new Error('پاسخ معتبری از هوش مصنوعی دریافت نشد.');
      }
    } catch (err: any) {
      console.error('Error in Bar Chart AI analysis:', err);
      setError(err?.message || 'خطا در ارتباط با هوش مصنوعی. لطفاً از اتصال اینترنت یا کلید API اطمینان حاصل کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Auto-trigger analysis when opened if not already loaded
      fetchAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const hasActiveFilters = Boolean(
    (appliedFilters.unit && appliedFilters.unit !== 'all') ||
    (appliedFilters.opType && appliedFilters.opType !== 'all') ||
    (appliedFilters.entityType && appliedFilters.entityType !== 'all') ||
    appliedFilters.startDate ||
    appliedFilters.endDate ||
    (appliedFilters.slideFilter && appliedFilters.slideFilter !== 'all') ||
    appliedFilters.searchQuery
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-[#DDDBCF] shadow-2xl rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right font-sans animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E6DF] bg-[#FAFAF7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#545D4B] text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#2D2C28]">
                  تحلیل هوش مصنوعی از موثرترین کارهای انجام شده
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAEAE5] text-[#545D4B] border border-[#DDDBCF] flex items-center gap-1 font-mono">
                  <Cpu className="h-3 w-3" />
                  {modelUsed}
                </span>
              </div>
              <p className="text-xs text-[#75746E] mt-0.5">
                گزارش جامع راهبردی و تحلیلی بر پایه توزیع نمودار میله‌ای واحدهای سازمانی و دستاوردهای نرم‌افزاری
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#75746E] hover:text-[#2D2C28] hover:bg-[#EAEAE5] rounded-xl transition cursor-pointer shrink-0"
            title="بستن پنجره"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters Context Bar */}
        <div className="px-5 py-2.5 bg-[#F5F5F0] border-b border-[#E8E6DF] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-[#545D4B]">
            <span className="font-bold flex items-center gap-1 text-[11px] text-[#2D2C28]">
              <Filter className="h-3.5 w-3.5 text-[#545D4B]" />
              مبنای داده‌های تحلیل:
            </span>

            {hasActiveFilters ? (
              <>
                {appliedFilters.unit && appliedFilters.unit !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-[#DDDBCF] text-[11px] font-bold text-[#2D2C28]">
                    واحد: {appliedFilters.unit}
                  </span>
                )}
                {appliedFilters.opType && appliedFilters.opType !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-[#DDDBCF] text-[11px] font-bold text-[#2D2C28]">
                    اقدام: {appliedFilters.opType}
                  </span>
                )}
                {appliedFilters.entityType && appliedFilters.entityType !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-[#DDDBCF] text-[11px] font-bold text-[#2D2C28]">
                    موجودیت: {appliedFilters.entityType}
                  </span>
                )}
                {(appliedFilters.startDate || appliedFilters.endDate) && (
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-[#DDDBCF] text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {appliedFilters.startDate || '...'} تا {appliedFilters.endDate || '...'}
                  </span>
                )}
                {appliedFilters.slideFilter === 'selected' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                    فقط منتخبین اسلاید
                  </span>
                )}
              </>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-white border border-[#DDDBCF] text-[11px] text-[#75746E]">
                تمام واحدهای سازمانی (بدون فیلتر محدودکننده)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#75746E]">
            {metrics?.totalItems !== undefined && (
              <span>
                کل موارد مورد تحلیل: <strong className="text-[#2D2C28] font-bold">{formatNumber(metrics.totalItems)}</strong>
              </span>
            )}
            {chartData.length > 0 && (
              <span>
                ستون‌های نمودار: <strong className="text-[#2D2C28] font-bold">{chartData.length} واحد</strong>
              </span>
            )}
          </div>
        </div>

        {/* Quick KPI Badges */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-[#FAFAF7] border-b border-[#E8E6DF]">
            <div className="bg-white p-2.5 rounded-2xl border border-[#DDDBCF] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#75746E] block truncate">اتوماتیک‌سازی‌ها</span>
                <span className="text-xs font-black text-purple-800">{formatNumber(metrics.autoCount || 0)} مورد</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-2xl border border-[#DDDBCF] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#75746E] block truncate">فرآیندهای جدید</span>
                <span className="text-xs font-black text-emerald-800">{formatNumber(metrics.newCount || 0)} مورد</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-2xl border border-[#DDDBCF] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#75746E] block truncate">اصلاحات و بهینه‌سازی</span>
                <span className="text-xs font-black text-amber-800">{formatNumber(metrics.fixCount || 0)} مورد</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-2xl border border-[#DDDBCF] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#75746E] block truncate">واحدهای پوشش داده‌شده</span>
                <span className="text-xs font-black text-blue-800">{formatNumber(metrics.uniqueUnits || chartData.length)} واحد</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body / Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-white text-right leading-relaxed">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-[#545D4B]/10 border-2 border-[#545D4B] flex items-center justify-center animate-pulse">
                  <Sparkles className="h-8 w-8 text-[#545D4B] animate-spin" />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-black text-[#2D2C28]">
                  در حال استخراج و تحلیل موثرترین اقدامات با هوش مصنوعی...
                </h3>
                <p className="text-xs text-[#75746E]">
                  هوش مصنوعی در حال تحلیل توزیع ستون‌های نمودار میله‌ای، شناسایی اتوماتیک‌سازی‌های کلیدی و نگارش گزارش تحلیلی است.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#545D4B] font-bold bg-[#F5F5F0] px-3 py-1.5 rounded-xl border border-[#DDDBCF]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>پردازش شناختی داده‌ها با Gemini 3.7 Flash</span>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 px-6 bg-red-50 border border-red-200 rounded-3xl text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-black text-red-900">خطا در تولید تحلیل هوش مصنوعی</h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchAnalysis(true)}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>تلاش مجدد</span>
              </button>
            </div>
          ) : analysis ? (
            <div className="prose prose-sm max-w-none text-[#2D2C28] space-y-4">
              <div className="bg-[#FAFAF7] p-5 sm:p-6 rounded-3xl border border-[#E8E6DF] shadow-xs">
                <div className="markdown-body">
                  <Markdown>{analysis}</Markdown>
                </div>
              </div>

              {/* Analysis Meta Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#75746E] pt-2 border-t border-[#E8E6DF] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    تحلیل موفقیت‌آمیز در زمان {analysisTimestamp || 'اکنون'}
                  </span>
                  {executionTimeMs && (
                    <span className="font-mono bg-[#F5F5F0] px-1.5 py-0.5 rounded-md border border-[#E8E6DF]">
                      {executionTimeMs}ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#545D4B]">
                  <span>مدل موتور هوشمند: <strong>{modelUsed}</strong></span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[#E8E6DF] bg-[#FAFAF7] flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAnalysis(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#545D4B] bg-white hover:bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="تولید مجدد تحلیل با داده‌های تازه"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحلیل مجدد</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!analysis || isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2D2C28] bg-white hover:bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="کپی کردن متن گزارش در حافظه"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'کپی شد!' : 'کپی متن گزارش'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!analysis || isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2D2C28] bg-white hover:bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="چاپ یا ذخیره به صورت PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>چاپ / PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGeneralAiChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGeneralAiChat('درباره موثرترین کارهای انجام شده در نمودار میله‌ای و راهکارهای افزایش اتوماتیک‌سازی بیشتر توضیح بده.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#545D4B] hover:bg-[#434A3C] rounded-xl transition shadow-xs cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-amber-300" />
                <span>گفتگو و پرسش تکمیلی</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#75746E] hover:text-[#2D2C28] hover:bg-[#EAEAE5] rounded-xl transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
