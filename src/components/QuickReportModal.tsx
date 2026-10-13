import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  Calendar,
  CheckSquare,
  Square,
  Search,
  Filter,
  Sparkles,
  ClipboardCheck,
  Building2,
  Tag,
  Info,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { ProcessedEraItem } from '../types';
import { getCurrentJalaliDate, formatNumber, isDateInRange } from '../utils/parser';
import { JalaliDateInput } from './JalaliDateInput';

interface QuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcessedEraItem[];
}

export const QuickReportModal: React.FC<QuickReportModalProps> = ({
  isOpen,
  onClose,
  items
}) => {
  // Current Jalali date calculation
  const curJalali = useMemo(() => getCurrentJalaliDate(), []);
  
  // Persian day of week name
  const dayOfWeekName = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now);
    } catch {
      return 'پنج‌شنبه';
    }
  }, []);

  // Form custom report date & title state
  const [reportDate, setReportDate] = useState<string>(curJalali.str);
  const [reportDayName, setReportDayName] = useState<string>(dayOfWeekName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<boolean>(false);

  // Format options
  const [includeDetails, setIncludeDetails] = useState<boolean>(true); // include challenge & solution
  const [includeDateInItem, setIncludeDateInItem] = useState<boolean>(false);
  const [includeUnitInItem, setIncludeUnitInItem] = useState<boolean>(true);

  // --- FILTERS (عین فهرست فرآیندها) ---
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedOpType, setSelectedOpType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Unique lists for dropdowns
  const allUnits = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (it.orgUnit) set.add(it.orgUnit.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const allEntityTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      const et = it.entityType || 'فرآیند';
      set.add(et.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Status counts for pills / options
  const statusCounts = useMemo(() => {
    let todo = 0, doing = 0, done = 0, rejected = 0;
    items.forEach(it => {
      const st = it.status || 'انجام شده';
      if (st === 'برای انجام') todo++;
      else if (st === 'درحال انجام') doing++;
      else if (st === 'رد شده') rejected++;
      else done++;
    });
    return { todo, doing, done, rejected };
  }, [items]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchFilter.trim()) count++;
    if (selectedUnit !== 'all') count++;
    if (selectedOpType !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedEntityType !== 'all') count++;
    if (startDate.trim() || endDate.trim()) count++;
    return count;
  }, [searchFilter, selectedUnit, selectedOpType, selectedStatus, selectedEntityType, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchFilter('');
    setSelectedUnit('all');
    setSelectedOpType('all');
    setSelectedStatus('all');
    setSelectedEntityType('all');
    setStartDate('');
    setEndDate('');
  };

  // Filtered items list for the selection checklist
  const filteredItems = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return items.filter(it => {
      // 1. Search text
      if (q) {
        const mName = (it.processName || '').toLowerCase().includes(q);
        const mUnit = (it.orgUnit || '').toLowerCase().includes(q);
        const mDate = (it.executionDate || '').includes(q);
        const mDesc = (it.description || '').toLowerCase().includes(q);
        const mProb = (it.problemDescription || '').toLowerCase().includes(q);
        const mSol = (it.solutionDescription || '').toLowerCase().includes(q);
        if (!mName && !mUnit && !mDate && !mDesc && !mProb && !mSol) return false;
      }

      // 2. Unit filter
      if (selectedUnit !== 'all' && it.orgUnit !== selectedUnit) return false;

      // 3. Operation type filter
      if (selectedOpType !== 'all' && it.operationType !== selectedOpType) return false;

      // 4. Status filter
      if (selectedStatus !== 'all') {
        const st = it.status || 'انجام شده';
        if (st !== selectedStatus) return false;
      }

      // 5. Entity type filter
      if (selectedEntityType !== 'all') {
        const et = it.entityType || 'فرآیند';
        if (et !== selectedEntityType) return false;
      }

      // 6. Date Range filter
      if (startDate.trim() || endDate.trim()) {
        if (!isDateInRange(it.executionDate, startDate.trim(), endDate.trim())) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchFilter, selectedUnit, selectedOpType, selectedStatus, selectedEntityType, startDate, endDate]);

  // Initialize selection with items matching today or all completed items
  useEffect(() => {
    if (isOpen) {
      const todayItems = items.filter(it => it.executionDate === curJalali.str);
      if (todayItems.length > 0) {
        setSelectedIds(new Set(todayItems.map(it => it.id)));
      } else {
        setSelectedIds(new Set(items.slice(0, Math.min(items.length, 5)).map(it => it.id)));
      }
      setReportDate(curJalali.str);
      setReportDayName(dayOfWeekName);
      setCopied(false);
    }
  }, [isOpen, items, curJalali.str, dayOfWeekName]);

  // Toggle individual item
  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select filtered only / Deselect filtered
  const handleSelectFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(it => next.add(it.id));
      return next;
    });
  };

  const handleDeselectFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(it => next.delete(it.id));
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(items.map(it => it.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Selected items objects ordered
  const selectedItemsList = useMemo(() => {
    return items.filter(it => selectedIds.has(it.id));
  }, [items, selectedIds]);

  // Generate the formatted report text
  const reportText = useMemo(() => {
    if (selectedItemsList.length === 0) {
      return `گزارش کار های انجام شده روز ${reportDayName} مورخ ${reportDate}\n\n(هیچ فرآیندی برای این گزارش انتخاب نشده است. از لیست سمت راست فرآیندهای مورد نظر را تیک بزنید.)`;
    }

    let text = `گزارش کار های انجام شده روز ${reportDayName} مورخ ${reportDate}\n\n`;

    selectedItemsList.forEach((item, index) => {
      const num = index + 1;
      text += `${num}- ${item.processName || 'فرآیند بدون عنوان'}\n`;

      if (includeUnitInItem && item.orgUnit) {
        text += `واحد سازمانی: ${item.orgUnit}\n`;
      }

      if (includeDateInItem && item.executionDate) {
        text += `تاریخ انجام: ${item.executionDate}\n`;
      }

      // Problem description (چالش / مشکل)
      const challenge = (item.problemDescription || '').trim();
      if (challenge) {
        text += `شرح چالش:\n${challenge}\n`;
      } else if (includeDetails) {
        const desc = (item.description || '').trim();
        text += `شرح چالش:\n${desc || 'بررسی و شناسایی نیاز فرآیندی'}\n`;
      }

      // Solution description (راهکار انجام شده)
      const solution = (item.solutionDescription || '').trim();
      if (solution) {
        text += `راهکار انجام شده:\n${solution}\n`;
      } else if (includeDetails) {
        text += `راهکار انجام شده:\nپیاده‌سازی و نهایی‌سازی در سامانه سازمانی\n`;
      }

      // Additional achievements if exists
      if (item.achievements) {
        const achList = Array.isArray(item.achievements) ? item.achievements : [item.achievements];
        const cleanAch = achList.filter(a => a && typeof a === 'string' && a.trim().length > 0);
        if (cleanAch.length > 0) {
          text += `دستاوردها:\n${cleanAch.map(a => `• ${a.trim()}`).join('\n')}\n`;
        }
      }

      text += `\n`;
    });

    return text.trim();
  }, [selectedItemsList, reportDayName, reportDate, includeUnitInItem, includeDateInItem, includeDetails]);

  // Copy to clipboard
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = reportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-[#DDDBCF] overflow-hidden text-right font-sans transition-all animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#545D4B] via-[#434A3C] to-[#2D3328] text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-inner">
                <ClipboardCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>گزارش متنی سریع فرآیندها</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                    فرمت استاندارد اداری
                  </span>
                </h3>
                <p className="text-xs text-white/80 mt-0.5 font-medium">
                  فیلتر پیشرفته فرآیندها (عین فهرست)، تیک‌زدن موارد و تولید فوری متن گزارش کار روزانه
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="بستن (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date & Title Configuration Strip */}
        <div className="bg-[#F8F8F4] border-b border-[#E2E0D8] p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Day of Week */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDDBCF] shadow-2xs">
              <span className="text-[#75746E] font-medium">روز هفته:</span>
              <select
                value={reportDayName}
                onChange={e => setReportDayName(e.target.value)}
                className="font-bold text-[#2D2C28] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="شنبه">شنبه</option>
                <option value="یک‌شنبه">یک‌شنبه</option>
                <option value="دوشنبه">دوشنبه</option>
                <option value="سه‌شنبه">سه‌شنبه</option>
                <option value="چهارشنبه">چهارشنبه</option>
                <option value="پنج‌شنبه">پنج‌شنبه</option>
                <option value="جمعه">جمعه</option>
              </select>
            </div>

            {/* Date String */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#DDDBCF] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#545D4B]" />
              <span className="text-[#75746E] font-medium">مورخ:</span>
              <input
                type="text"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                placeholder="۱۴۰X/MM/DD"
                className="w-24 font-mono font-bold text-[#2D2C28] bg-transparent focus:outline-none text-center"
              />
            </div>

            {/* Quick button to set date to today */}
            <button
              type="button"
              onClick={() => {
                setReportDate(curJalali.str);
                setReportDayName(dayOfWeekName);
              }}
              className="text-[11px] font-bold text-[#545D4B] hover:text-[#2D2C28] underline cursor-pointer"
            >
              تنظیم به امروز ({curJalali.str})
            </button>
          </div>

          {/* Format Options Toggles */}
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#5A5852]">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeUnitInItem}
                onChange={e => setIncludeUnitInItem(e.target.checked)}
                className="rounded accent-[#545D4B] cursor-pointer"
              />
              <span>ذکر واحد سازمانی</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDateInItem}
                onChange={e => setIncludeDateInItem(e.target.checked)}
                className="rounded accent-[#545D4B] cursor-pointer"
              />
              <span>ذکر تاریخ فرآیند</span>
            </label>
          </div>
        </div>

        {/* Modal Body: Split 2 columns (Left: Generated Text, Right: Process Selection & Filters) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-[#FCFCFA]">
          {/* Right Column: Process Checklist + Rich Filters (6 cols on lg) */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-l border-[#E2E0D8] flex flex-col h-full overflow-hidden bg-[#FAF9F5]">
            {/* Filter Toolbar (عین فهرست فرآیندها) */}
            <div className="p-3 border-b border-[#E8E6DF] space-y-2.5 shrink-0 bg-white">
              {/* Row 1: Search & Status / Quick Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-[#8A8880]" />
                  <input
                    type="text"
                    placeholder="جستجو در نام فرآیند، واحد، چالش، راهکار یا تاریخ..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-xl pr-8 pl-3 py-1.5 text-xs text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute left-2.5 top-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
                    showAdvancedFilters || activeFiltersCount > 0
                      ? 'bg-[#545D4B] text-white border-[#545D4B]'
                      : 'bg-white text-[#545D4B] border-[#DDDBCF] hover:bg-[#F5F4EE]'
                  }`}
                  title="نمایش فیلترهای تکمیلی (واحد، عملیات، وضعیت، تاریخ)"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>فیلترها</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Status Quick Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                    selectedStatus === 'all'
                      ? 'bg-[#2D2C28] text-white border-[#2D2C28]'
                      : 'bg-white text-[#75746E] border-[#DDDBCF] hover:bg-[#F5F4EE]'
                  }`}
                >
                  همه ({formatNumber(items.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'انجام شده' ? 'all' : 'انجام شده')}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedStatus === 'انجام شده'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>انجام شده ({formatNumber(statusCounts.done)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'درحال انجام' ? 'all' : 'درحال انجام')}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedStatus === 'درحال انجام'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>درحال انجام ({formatNumber(statusCounts.doing)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'برای انجام' ? 'all' : 'برای انجام')}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedStatus === 'برای انجام'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>برای انجام ({formatNumber(statusCounts.todo)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'رد شده' ? 'all' : 'رد شده')}
                  className={`px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedStatus === 'رد شده'
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="w-2.5 h-2.5" />
                  <span>رد شده ({formatNumber(statusCounts.rejected)})</span>
                </button>
              </div>

              {/* Advanced Filter Collapsible Area (عین فهرست) */}
              {showAdvancedFilters && (
                <div className="pt-2 border-t border-[#E8E6DF] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs animate-in fade-in duration-150">
                  {/* Unit Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#75746E] mb-0.5">واحد سازمانی:</label>
                    <select
                      value={selectedUnit}
                      onChange={e => setSelectedUnit(e.target.value)}
                      className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-lg px-2 py-1 text-[11px] text-[#2D2C28] font-medium focus:outline-none"
                    >
                      <option value="all">همه واحدها</option>
                      {allUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operation Type Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#75746E] mb-0.5">نوع عملیات:</label>
                    <select
                      value={selectedOpType}
                      onChange={e => setSelectedOpType(e.target.value)}
                      className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-lg px-2 py-1 text-[11px] text-[#2D2C28] font-medium focus:outline-none"
                    >
                      <option value="all">همه عملیات‌ها</option>
                      <option value="جدید">جدید</option>
                      <option value="اصلاح">اصلاح</option>
                      <option value="اتوماتیک‌سازی">اتوماتیک‌سازی</option>
                    </select>
                  </div>

                  {/* Entity Type Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#75746E] mb-0.5">نوع موجودیت:</label>
                    <select
                      value={selectedEntityType}
                      onChange={e => setSelectedEntityType(e.target.value)}
                      className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-lg px-2 py-1 text-[11px] text-[#2D2C28] font-medium focus:outline-none"
                    >
                      <option value="all">همه موجودیت‌ها</option>
                      {allEntityTypes.map(et => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter Range */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#75746E] mb-0.5">فیلتر تاریخ (از / تا):</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        placeholder="از تاریخ"
                        className="w-1/2 bg-[#FAFAF7] border border-[#DDDBCF] rounded-lg px-1.5 py-1 text-[10px] font-mono text-center"
                      />
                      <input
                        type="text"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        placeholder="تا تاریخ"
                        className="w-1/2 bg-[#FAFAF7] border border-[#DDDBCF] rounded-lg px-1.5 py-1 text-[10px] font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Bar & Stats */}
              <div className="flex items-center justify-between pt-1 border-t border-[#E8E6DF] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#545D4B]" />
                    <span>انتخاب شده: <strong>{formatNumber(selectedIds.size)}</strong> مورد</span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[#75746E] text-[11px]">
                    نمایش <strong>{formatNumber(filteredItems.length)}</strong> از <strong>{formatNumber(items.length)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {/* Select visible only */}
                  <button
                    type="button"
                    onClick={handleSelectFiltered}
                    className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                    title="تیک زدن تمام مواردی که با فیلتر بالا در صفحه دیده می‌شوند"
                  >
                    تیک زدن فیلترشده‌ها
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectFiltered}
                    className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                    title="برداشتن تیک مواردی که در این فیلتر هستند"
                  >
                    برداشتن تیک
                  </button>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-2 py-0.5 rounded text-[#9C3A27] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>حذف فیلترها</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist items list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 divide-y divide-[#EFEFEA]/50">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const itemStatus = item.status || 'انجام شده';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                          : 'bg-white border-[#E2E0D8] hover:bg-[#F5F4EE]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleItem(item.id);
                        }}
                        className="mt-0.5 shrink-0 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 fill-emerald-100" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8A8880]" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-[#2D2C28] leading-snug line-clamp-2">
                            {item.processName}
                          </div>
                          {/* Status badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                            itemStatus === 'انجام شده'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : itemStatus === 'درحال انجام'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : itemStatus === 'برای انجام'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {itemStatus}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-[#75746E]">
                          <span className="bg-white/90 px-1.5 py-0.5 rounded border border-[#DDDBCF] font-semibold text-[#2D2C28]">
                            {item.orgUnit}
                          </span>
                          <span className="font-mono bg-white/90 px-1.5 py-0.5 rounded border border-[#DDDBCF]">
                            {item.executionDate}
                          </span>
                          {item.operationType && (
                            <span className="bg-white/90 px-1.5 py-0.5 rounded border border-[#DDDBCF]">
                              {item.operationType}
                            </span>
                          )}
                          {item.entityType && (
                            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                              {item.entityType}
                            </span>
                          )}
                        </div>

                        {/* Snippet of problem / solution */}
                        {(item.problemDescription || item.solutionDescription) && (
                          <div className="mt-1 text-[10px] text-[#8A8880] line-clamp-1">
                            {item.problemDescription ? `چالش: ${item.problemDescription}` : `راهکار: ${item.solutionDescription}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-[#8A8880] space-y-2">
                  <div>هیچ فرآیندی با فیلترهای انتخابی یافت نشد.</div>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#DDDBCF] text-xs font-bold text-[#545D4B] hover:bg-[#F5F4EE] cursor-pointer"
                    >
                      حذف تمام فیلترها
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Column: Formatted Text Preview & One-Click Copy (6 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col h-full overflow-hidden bg-white">
            <div className="p-3 sm:px-5 border-b border-[#E8E6DF] flex items-center justify-between shrink-0 bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#545D4B]" />
                <span className="font-bold text-xs text-[#2D2C28]">
                  پیش‌نمایش متن گزارش کار (آماده جهت ارسال)
                </span>
              </div>

              {/* Big Copy Button */}
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={selectedItemsList.length === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#545D4B] hover:bg-[#434A3C] text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>متن کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>کپی کل متن گزارش</span>
                  </>
                )}
              </button>
            </div>

            {/* Textarea Viewport with styled output */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-0 bg-white">
              <textarea
                readOnly
                value={reportText}
                rows={18}
                className="w-full h-full p-4 bg-[#FBFBFA] border border-[#DDDBCF] rounded-2xl font-sans text-xs leading-relaxed text-[#2D2C28] focus:outline-none resize-none select-all font-medium"
                dir="rtl"
                placeholder="متن گزارش آماده کپی..."
              />
            </div>

            {/* Bottom info helper */}
            <div className="p-3 sm:px-5 border-t border-[#E8E6DF] bg-[#FAF9F5] flex items-center justify-between text-[11px] text-[#75746E]">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#545D4B] shrink-0" />
                <span>فرمت متن دقیقاً برای پیام‌رسان‌ها (ایتا، بله، تلگرام، واتس‌اپ) یا اتوماسیون اداری هماهنگ شده است.</span>
              </div>
              <span className="font-mono font-bold text-[#2D2C28]">
                {formatNumber(selectedItemsList.length)} بند شماره‌گذاری‌شده
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
