import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ProcessedLetter,
  UnitMonthlyStat,
  LetterActionType,
  CauseRule,
  ExclusionRule,
  EraVisibilitySettings,
  LetterQueryParams,
  LettersServerFilterResponse
} from '../types';
import { api } from '../services/api';
import { MetricCard } from './MetricCard';
import { MonthlyMatrixTable } from './MonthlyMatrixTable';
import { LetterDetailModal } from './LetterDetailModal';
import { AiChartAnalysisModal } from './AiChartAnalysisModal';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { JalaliDateInput } from './JalaliDateInput';
import {
  PERSIAN_MONTH_NAMES,
  PERSIAN_MONTHS_LIST,
  formatNumber,
  isDateInRange,
  parsePersianDate,
  getCurrentJalaliDate,
  getJalaliMonthsAgo,
  resolveLetterCreatorAndUnit,
  normalizePersianText
} from '../utils/parser';
import {
  Mail,
  Trash2,
  Edit3,
  Building2,
  Filter,
  Search,
  RotateCcw,
  Download,
  Eye,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Layers,
  Settings2,
  Settings,
  AlertCircle,
  X,
  FilterX,
  ShieldAlert,
  Columns2,
  LayoutGrid,
  Maximize2,
  ArrowUpRight,
  Activity,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Database,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

interface RemoveEditDashboardProps {
  letters: ProcessedLetter[];
  unitStats: UnitMonthlyStat[];
  allMonths: string[];
  grandTotalDeletes: number;
  grandTotalEdits: number;
  grandTotalLetters: number;
  grandTotalUniqueLetters: number;
  rules?: CauseRule[];
  exclusionRules?: ExclusionRule[];
  unitCauseVisibility?: Record<string, boolean>;
  onToggleUnitCauseVisibility?: (unit: string, isVisible: boolean) => void;
  onOpenSettingsModal?: () => void;
  eraVisibility?: EraVisibilitySettings;
  filterExecutionMode?: 'client' | 'server';
}

const PIE_COLORS = [
  '#545D4B', // sage olive
  '#8A6224', // warm ochre
  '#9C3A27', // terracotta
  '#436465', // muted teal pine
  '#6B5A4E', // walnut earth
  '#736B48', // khaki moss
  '#3E5B52', // deep forest
  '#8C533E', // burnt sienna
  '#636654', // sage earth
  '#7A786C'  // warm pebble slate
];

export const RemoveEditDashboard: React.FC<RemoveEditDashboardProps> = ({
  letters,
  unitStats,
  allMonths,
  grandTotalDeletes,
  grandTotalEdits,
  grandTotalLetters,
  grandTotalUniqueLetters,
  rules = [],
  exclusionRules = [],
  unitCauseVisibility = {},
  onToggleUnitCauseVisibility,
  onOpenSettingsModal,
  eraVisibility,
  filterExecutionMode = 'server'
}) => {
  // Filters
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedCause, setSelectedCause] = useState<string>('all');
  const [showExcludedOnly, setShowExcludedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<ProcessedLetter | null>(null);
  const [isAiChartModalOpen, setIsAiChartModalOpen] = useState<boolean>(false);

  // Server-side SQLite Database Query State
  const [serverLetters, setServerLetters] = useState<ProcessedLetter[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverExecutionTimeMs, setServerExecutionTimeMs] = useState<number>(0);
  const [serverStats, setServerStats] = useState<any>(null);
  const [serverTriggerCounter, setServerTriggerCounter] = useState<number>(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchQuery);

  // Date range filtering (Jalali)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [isChartDateFilterOpen, setIsChartDateFilterOpen] = useState<boolean>(false);
  const chartDateFilterRef = useRef<HTMLDivElement>(null);

  // Pagination for detailed list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnits, selectedMonth, selectedActionType, selectedCause, showExcludedOnly, startDate, endDate, debouncedSearchQuery]);

  // Fetch from SQLite database server endpoint when in server mode
  useEffect(() => {
    if (filterExecutionMode !== 'server') return;

    let isMounted = true;
    const fetchServerData = async () => {
      setServerLoading(true);
      try {
        const response: LettersServerFilterResponse = await api.getLettersFiltered({
          units: selectedUnits.length > 0 ? selectedUnits : undefined,
          month: selectedMonth !== 'all' ? selectedMonth : undefined,
          actionType: selectedActionType !== 'all' ? selectedActionType : undefined,
          cause: selectedCause !== 'all' ? selectedCause : undefined,
          showExcludedOnly: showExcludedOnly ? true : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedSearchQuery || undefined,
          page: currentPage,
          pageSize: pageSize
        });

        if (isMounted && response && Array.isArray(response.data)) {
          setServerLetters(response.data);
          setServerTotal(response.total ?? response.data.length);
          setServerTotalPages(response.totalPages ?? 1);
          setServerExecutionTimeMs(response.executionTimeMs ?? 0);
          setServerStats(response.stats ?? null);
        }
      } catch (err) {
        console.warn('Server-side letters filtering failed, fallbacking to in-memory state:', err);
      } finally {
        if (isMounted) {
          setServerLoading(false);
        }
      }
    };

    fetchServerData();

    return () => {
      isMounted = false;
    };
  }, [
    filterExecutionMode,
    selectedUnits,
    selectedMonth,
    selectedActionType,
    selectedCause,
    showExcludedOnly,
    startDate,
    endDate,
    debouncedSearchQuery,
    currentPage,
    pageSize,
    serverTriggerCounter,
    rules
  ]);

  // Trigger server refetch when raw letters change in parent or rules change
  useEffect(() => {
    if (filterExecutionMode === 'server') {
      setServerTriggerCounter(c => c + 1);
    }
  }, [letters.length, rules, filterExecutionMode]);

  const curJalali = useMemo(() => getCurrentJalaliDate(), []);

  // Distinct years available in letters dataset
  const allYears = useMemo(() => {
    const years = new Set<string>();
    letters.forEach(it => {
      if (it.year) years.add(it.year);
      else if (it.dateStr) {
        const p = parsePersianDate(it.dateStr);
        if (p.year) years.add(p.year);
      }
    });
    return Array.from(years).filter(Boolean).sort().reverse();
  }, [letters]);

  // Click outside listener for date filter popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const isJdpElement = Boolean(
        target.closest('jdp-container') ||
        target.closest('.jdp-container') ||
        target.closest('jdp-overlay') ||
        target.closest('.jdp-overlay') ||
        target.closest('[data-jdp]') ||
        target.closest('[data-jdp-min-date]') ||
        target.closest('[data-jdp-max-date]') ||
        (target.tagName && target.tagName.toLowerCase().startsWith('jdp-')) ||
        (typeof target.className === 'string' && target.className.includes('jdp'))
      );

      if (isJdpElement) return;

      if (chartDateFilterRef.current && !chartDateFilterRef.current.contains(target)) {
        setIsChartDateFilterOpen(false);
      }
    }
    if (isChartDateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChartDateFilterOpen]);

  // Smooth scroll helper to navigate to letters table
  const scrollToTable = () => {
    setTimeout(() => {
      const tableEl = document.getElementById('letters-data-table-section');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return [
      selectedUnits.length > 0,
      selectedMonth !== 'all',
      selectedActionType !== 'all',
      selectedCause !== 'all',
      Boolean(startDate || endDate),
      showExcludedOnly,
      searchQuery.trim().length > 0
    ].filter(Boolean).length;
  }, [selectedUnits, selectedMonth, selectedActionType, selectedCause, startDate, endDate, showExcludedOnly, searchQuery]);

  // Chart view mode: 'both' (2-column side-by-side), 'pie' (full width Pie chart), 'bar' (full width Bar chart)
  const [chartViewMode, setChartViewMode] = useState<'both' | 'pie' | 'bar'>('both');

  // Determine if Cause column should be shown in the table for current filter (only for selected units)
  const isCauseColumnVisible = useMemo(() => {
    if (selectedUnits.length === 1) {
      const u = selectedUnits[0];
      const hasRuleForUnit = rules.some(r => r.isActive !== false && r.targetUnit && normalizePersianText(r.targetUnit) === normalizePersianText(u));
      if (hasRuleForUnit) return true;
      if (unitCauseVisibility[u] !== undefined) {
        return unitCauseVisibility[u] === true;
      }
      return true;
    }
    if (selectedUnits.length > 1) {
      return selectedUnits.some(u => {
        const hasRuleForUnit = rules.some(r => r.isActive !== false && r.targetUnit && normalizePersianText(r.targetUnit) === normalizePersianText(u));
        return hasRuleForUnit || unitCauseVisibility[u] !== false;
      });
    }
    // For 'all' units view: show if explicitly enabled for 'all' or if any rule exists or not explicitly disabled
    return true;
  }, [selectedUnits, unitCauseVisibility, rules]);

  // Excluded letters count in dataset
  const excludedLettersCount = useMemo(() => {
    return letters.filter(l => l.isExcluded).length;
  }, [letters]);

  // Distinct units list for dropdown (from non-excluded letters)
  const allUnits = useMemo(() => {
    const units = Array.from(new Set(letters.filter(l => !l.isExcluded).map(l => l.orgUnit).filter(Boolean)));
    return units.sort((a, b) => a.localeCompare(b, 'fa'));
  }, [letters]);

  // Unit letter counts for searchable dropdown
  const unitCountsMap = useMemo(() => {
    const map: Record<string, number> = { all: letters.filter(l => !l.isExcluded).length };
    letters.filter(l => !l.isExcluded).forEach(l => {
      if (l.orgUnit) {
        map[l.orgUnit] = (map[l.orgUnit] || 0) + 1;
      }
    });
    return map;
  }, [letters]);

  // Distinct causes list (including causes from active defined rules + causes present in letters)
  const allCauses = useMemo(() => {
    const causesSet = new Set<string>();

    // 1. Add all causes from active rules
    rules.filter(r => r.isActive !== false).forEach(r => {
      if (r.cause && r.cause.trim()) {
        causesSet.add(r.cause.trim());
      }
    });

    // 2. Add all causes present in current letters dataset
    letters.filter(l => !l.isExcluded).forEach(l => {
      if (l.cause && l.cause.trim() && l.cause !== 'نامشخص') {
        causesSet.add(l.cause.trim());
      }
    });

    // 3. Always ensure 'نامشخص' is included if any letter has no cause
    const hasUnclassified = letters.some(l => !l.isExcluded && (!l.cause || l.cause === 'نامشخص'));
    if (hasUnclassified) {
      causesSet.add('نامشخص');
    }

    const causes = Array.from(causesSet);
    return causes.sort((a, b) => (a === 'بانکی' ? -1 : b === 'بانکی' ? 1 : a.localeCompare(b, 'fa')));
  }, [letters, rules]);

  // Custom rotated tick for BarChart XAxis to cleanly place labels comfortably below the chart bars
  const renderRotatedUnitTick = (props: any) => {
    const { x, y, payload } = props;
    const rawVal = String(payload?.value || '');
    // const displayText = rawVal.length > 22 ? `${rawVal.slice(0, 20)}...` : rawVal;
    const displayText = rawVal;

    return (
      <g transform={`translate(${x},${y + 10}) rotate(-45)`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="start"
          fill="#4A4842"
          fontSize={11}
          fontWeight={600}
          className="cursor-default select-none"
        >
          <title>{rawVal}</title>
          {displayText}
        </text>
      </g>
    );
  };

  // High-contrast Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const unitColor = payload[0].color || payload[0].fill || data.color || '#2563EB';

      // Mode A: Single Unit filtered (2-Color Action Breakdown: Red for Delete, Green for Edit)
      if (selectedUnits.length === 1 && (data.actionType === 'حذف' || data.actionType === 'ویرایش')) {
        const isDelete = data.actionType === 'حذف';
        return (
          <div className="bg-[#0F172A] text-white border border-[#334155] shadow-2xl rounded-2xl p-3.5 text-right font-sans text-xs min-w-[210px] max-w-[260px] pointer-events-none select-none z-50">
            <div className="flex items-center justify-between gap-2 border-b border-[#334155] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/80 shadow-xs"
                  style={{ backgroundColor: isDelete ? '#EF4444' : '#22C55E' }}
                />
                <span className="font-black text-white text-xs">
                  درخواست‌های {data.name}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${
                isDelete ? 'bg-[#7F1D1D] text-[#FCA5A5] border-[#991B1B]' : 'bg-[#14532D] text-[#86EFAC] border-[#166534]'
              }`}>
                {data.percentage}%
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
                <span className="text-[#94A3B8] text-[11px]">واحد:</span>
                <span className="font-bold text-white max-w-[130px] truncate text-[11px]">{selectedUnits[0]}</span>
              </div>

              <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
                <span className="text-[#94A3B8] text-[11px]">تعداد نامه‌ها:</span>
                <span className="font-black text-white text-xs">
                  {formatNumber(data.count)} نامه
                </span>
              </div>

              <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
                <span className="text-[#94A3B8] text-[11px]">سهم از این واحد:</span>
                <span className={`font-black text-xs ${isDelete ? 'text-[#F87171]' : 'text-[#4ADE80]'}`}>
                  {data.percentage}%
                </span>
              </div>
            </div>
          </div>
        );
      }

      // Mode B: All units overview
      return (
        <div className="bg-[#0F172A] text-white border border-[#334155] shadow-2xl rounded-2xl p-3 text-right font-sans text-xs min-w-[210px] max-w-[260px] pointer-events-none select-none z-50">
          <div className="flex items-center justify-between gap-2 border-b border-[#334155] pb-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/80 shadow-xs"
                style={{ backgroundColor: unitColor }}
              />
              <span className="font-black text-white text-xs truncate">
                {data.name}
              </span>
            </div>
            {data.percentage !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#1E3A8A] text-[#93C5FD] border border-[#2563EB] shrink-0">
                {data.percentage}%
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
              <span className="text-[#94A3B8] text-[11px]">کل مکاتبات:</span>
              <span className="font-black text-white text-xs">
                {formatNumber(data.count || data.value)} نامه
              </span>
            </div>

            {(data.deletes !== undefined || data.edits !== undefined) && (
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {data.deletes !== undefined && (
                  <div className="px-2 py-1 rounded-lg bg-[#7F1D1D]/70 text-[#FCA5A5] font-black border border-[#991B1B] flex justify-between items-center text-[10px]">
                    <span>حذف:</span>
                    <span>{formatNumber(data.deletes)}</span>
                  </div>
                )}
                {data.edits !== undefined && (
                  <div className="px-2 py-1 rounded-lg bg-[#14532D]/70 text-[#86EFAC] font-black border border-[#166534] flex justify-between items-center text-[10px]">
                    <span>ویرایش:</span>
                    <span>{formatNumber(data.edits)}</span>
                  </div>
                )}
              </div>
            )}

            {data.bankCount > 0 && (
              <div className="text-[10px] text-[#93C5FD] font-bold bg-[#1E3A8A]/50 px-2.5 py-1 rounded-lg border border-[#2563EB] flex justify-between items-center">
                <span>عامل بانکی:</span>
                <span>{formatNumber(data.bankCount)} مورد</span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-1.5 border-t border-[#334155] text-[10px] text-[#94A3B8] text-center font-bold">
            👆 برای فیلتر جدول کلیک کنید
          </div>
        </div>
      );
    }
    return null;
  };

  // High-contrast Custom Tooltip for Bar Chart (supports both unit comparison and single-unit monthly trend)
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const itemData = payload[0]?.payload;
      const isMonthlyMode = Boolean(itemData?.monthLabel);
      const titleLabel = isMonthlyMode ? `${itemData.monthLabel} (${itemData.month})` : (label || itemData?.unit);
      const deletes = itemData?.deletes ?? 0;
      const edits = itemData?.edits ?? 0;
      const total = itemData?.total ?? (deletes + edits);
      const deleteRate = itemData?.deleteRate ?? (total > 0 ? ((deletes / total) * 100).toFixed(1) : '0');

      return (
        <div className="bg-[#0F172A] text-white border border-[#334155] shadow-2xl rounded-2xl p-3 text-right font-sans text-xs min-w-[210px] max-w-[260px] pointer-events-none select-none z-50">
          <div className="border-b border-[#334155] pb-1.5 mb-2">
            <p className="text-[10px] font-bold text-[#94A3B8] mb-0.5">
              {isMonthlyMode
                ? selectedUnits.length === 1
                  ? `واحد ${selectedUnits[0]} - دوره:`
                  : selectedUnits.length > 1
                  ? `${selectedUnits.length} واحد منتخب - دوره:`
                  : 'دوره زمانی:'
                : 'واحد سازمانی:'}
            </p>
            <p className="font-black text-white text-xs truncate">{titleLabel}</p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1 rounded-xl border border-[#334155]">
              <span className="text-[#94A3B8] text-[11px]">مجموع:</span>
              <span className="font-black text-white text-xs">
                {formatNumber(total)} نامه
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="bg-[#7F1D1D]/70 border border-[#991B1B] rounded-xl p-1.5 text-center">
                <span className="text-[10px] font-bold text-[#FCA5A5] block mb-0.5">حذف</span>
                <span className="text-xs font-black text-white">{formatNumber(deletes)}</span>
              </div>
              <div className="bg-[#14532D]/70 border border-[#166534] rounded-xl p-1.5 text-center">
                <span className="text-[10px] font-bold text-[#86EFAC] block mb-0.5">ویرایش</span>
                <span className="text-xs font-black text-white">{formatNumber(edits)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#78350F]/50 px-2.5 py-1 rounded-xl border border-[#B45309] text-[10px]">
              <span className="font-bold text-[#FDE68A]">نرخ حذف:</span>
              <span className="font-black text-white text-xs">{deleteRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Accounting & Banking Specialized Analytics
  const accountingAnalytics = useMemo(() => {
    const accountingLetters = letters.filter(l => !l.isExcluded && l.orgUnit === 'حسابداری مالی');
    const bankLetters = accountingLetters.filter(l => l.cause === 'بانکی');
    const otherLetters = accountingLetters.filter(l => l.cause !== 'بانکی');
    const bankRatio = accountingLetters.length > 0
      ? ((bankLetters.length / accountingLetters.length) * 100).toFixed(1)
      : '0';

    return {
      totalAccounting: accountingLetters.length,
      bankLettersCount: bankLetters.length,
      otherLettersCount: otherLetters.length,
      bankRatio,
      hasBankLetters: bankLetters.length > 0
    };
  }, [letters]);

  // Filtered letters based on active filters
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      // Excluded letters toggle: by default, hide excluded letters from active statistics
      if (showExcludedOnly) {
        if (!letter.isExcluded) return false;
      } else {
        if (letter.isExcluded) return false;
      }

      // Unit filter (Multi-select)
      if (selectedUnits.length > 0 && !selectedUnits.includes(letter.orgUnit)) {
        return false;
      }
      // Month filter (applied when no explicit date range is active, or if matching)
      if (selectedMonth !== 'all' && (!startDate && !endDate) && letter.month !== selectedMonth) {
        return false;
      }
      // Type filter (حذف / ویرایش)
      if (selectedActionType !== 'all' && letter.actionType !== selectedActionType) {
        return false;
      }
      // Cause filter (بانکی / نامشخص / ...)
      if (selectedCause !== 'all' && (letter.cause || 'نامشخص') !== selectedCause) {
        return false;
      }
      // Date range filter (Jalali)
      if (startDate || endDate) {
        if (!isDateInRange(letter.dateStr, startDate, endDate)) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchSubject = letter.subject.toLowerCase().includes(query);
        const matchOriginal = letter.originalSubject.toLowerCase().includes(query);
        const matchCreator = letter.creatorRaw.toLowerCase().includes(query);
        const matchUnit = letter.orgUnit.toLowerCase().includes(query);
        const matchCause = (letter.cause || '').toLowerCase().includes(query);
        const matchId = String(letter.letterId ?? letter.id).includes(query);
        const matchReg = letter.registrationNumber ? letter.registrationNumber.includes(query) : false;

        if (!matchSubject && !matchOriginal && !matchCreator && !matchUnit && !matchCause && !matchId && !matchReg) {
          return false;
        }
      }
      return true;
    });
  }, [letters, selectedUnits, selectedMonth, selectedActionType, selectedCause, startDate, endDate, searchQuery, showExcludedOnly]);

  // Filtered metrics
  const filteredMetrics = useMemo(() => {
    if (filterExecutionMode === 'server' && serverStats) {
      return {
        total: serverStats.total ?? 0,
        uniqueTotal: serverStats.uniqueTotal ?? serverStats.total ?? 0,
        deletes: serverStats.deletes ?? 0,
        edits: serverStats.edits ?? 0,
        bankCount: serverStats.bankCount ?? 0,
        activeUnits: serverStats.activeUnits ?? 0,
        topUnit: serverStats.topUnit ?? 'نامشخص',
        topCount: serverStats.topCount ?? 0,
        causesDistribution: Array.isArray(serverStats.causesDistribution) ? serverStats.causesDistribution : []
      };
    }

    let deletes = 0;
    let edits = 0;
    let bankCount = 0;
    const uniqueKeys = new Set<string>();
    const unitCountMap = new Map<string, number>();
    const causeCountMap = new Map<string, number>();

    filteredLetters.forEach(l => {
      const uKey = l.id || l.registrationNumber || l.normalizedSubjectKey;
      uniqueKeys.add(uKey);
      if (l.actionType === 'حذف') deletes++;
      else edits++;

      if (l.cause === 'بانکی') bankCount++;

      unitCountMap.set(l.orgUnit, (unitCountMap.get(l.orgUnit) || 0) + 1);
      causeCountMap.set(l.cause || 'نامشخص', (causeCountMap.get(l.cause || 'نامشخص') || 0) + 1);
    });

    let topUnit = 'نامشخص';
    let topCount = 0;
    unitCountMap.forEach((count, u) => {
      if (count > topCount) {
        topCount = count;
        topUnit = u;
      }
    });

    return {
      total: filteredLetters.length,
      uniqueTotal: uniqueKeys.size,
      deletes,
      edits,
      bankCount,
      activeUnits: unitCountMap.size,
      topUnit,
      topCount,
      causesDistribution: Array.from(causeCountMap.entries()).map(([cause, count]) => ({
        cause,
        count,
        percent: filteredLetters.length > 0 ? Number(((count / filteredLetters.length) * 100).toFixed(1)) : 0
      }))
    };
  }, [filterExecutionMode, serverStats, filteredLetters]);

  // Selected Unit Specific Breakdown Rates (Red for Deletes, Green for Edits)
  const selectedUnitStats = useMemo(() => {
    if (selectedUnits.length === 0) return null;

    const total = filteredMetrics.total;
    const deletes = filteredMetrics.deletes;
    const edits = filteredMetrics.edits;
    const deleteRate = total > 0 ? Number(((deletes / total) * 100).toFixed(1)) : 0;
    const editRate = total > 0 ? Number(((edits / total) * 100).toFixed(1)) : 0;
    const activeTotalLetters = letters.filter(l => !l.isExcluded).length;
    const orgShare = activeTotalLetters > 0 ? Number(((total / activeTotalLetters) * 100).toFixed(1)) : 0;

    const unitName = selectedUnits.length === 1
      ? selectedUnits[0]
      : `${selectedUnits.length} واحد منتخب`;

    return {
      unitName,
      total,
      deletes,
      edits,
      deleteRate,
      editRate,
      bankCount: filteredMetrics.bankCount,
      orgShare
    };
  }, [selectedUnits, filteredMetrics, letters]);

  // Chart 1 Data: Unit percentage distribution for Pie Chart (when all units or multiple units)
  const unitPieData = useMemo(() => {
    const counts: { [unit: string]: number } = {};
    filteredLetters.forEach(l => {
      counts[l.orgUnit] = (counts[l.orgUnit] || 0) + 1;
    });

    const total = filteredLetters.length || 1;
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length > 8) {
      const top7 = sorted.slice(0, 7);
      const others = sorted.slice(7);
      const othersCount = others.reduce((acc, curr) => acc + curr.count, 0);
      return [
        ...top7,
        {
          name: 'سایر واحدها',
          count: othersCount,
          percentage: Number(((othersCount / total) * 100).toFixed(1))
        }
      ];
    }
    return sorted;
  }, [filteredLetters]);

  // Single Unit Action Breakdown for Pie Chart when 1 unit is filtered (Red for Delete, Green for Edit)
  const singleUnitActionPieData = useMemo(() => {
    if (selectedUnits.length !== 1 || !selectedUnitStats) return [];
    const deletes = selectedUnitStats.deletes;
    const edits = selectedUnitStats.edits;
    const deleteRate = selectedUnitStats.deleteRate;
    const editRate = selectedUnitStats.editRate;

    const result = [];
    if (deletes > 0) {
      result.push({
        name: 'حذف',
        actionType: 'حذف',
        unitName: selectedUnits[0],
        count: deletes,
        percentage: deleteRate,
        color: '#DC2626', // Red
        fill: '#DC2626'
      });
    }
    if (edits > 0) {
      result.push({
        name: 'ویرایش',
        actionType: 'ویرایش',
        unitName: selectedUnits[0],
        count: edits,
        percentage: editRate,
        color: '#16A34A', // Green
        fill: '#16A34A'
      });
    }
    return result;
  }, [selectedUnits, selectedUnitStats]);

  // Active Pie Chart Data (either all units, multiple selected units, or single unit with 2-color Deletes/Edits)
  const activePieData = useMemo(() => {
    if (selectedUnits.length === 1 && singleUnitActionPieData.length > 0) {
      return singleUnitActionPieData;
    }
    return unitPieData;
  }, [selectedUnits, singleUnitActionPieData, unitPieData]);

  // Render direct percentage and action name on pie chart slices for single-unit mode
  const renderActionPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    if (selectedUnits.length !== 1) return null;

    const item = singleUnitActionPieData[index];
    if (!item || item.percentage < 8) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-black text-[11px] select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
      >
        {`${item.percentage}%`}
      </text>
    );
  };

  // Chart 2 Data: Deletions vs Edits per Unit for Bar Chart (Top 10 for split view)
  const unitBarData = useMemo(() => {
    const map: { [unit: string]: { unit: string; deletes: number; edits: number; total: number; bankCount: number; deleteRate: number } } = {};
    filteredLetters.forEach(l => {
      if (!map[l.orgUnit]) {
        map[l.orgUnit] = { unit: l.orgUnit, deletes: 0, edits: 0, total: 0, bankCount: 0, deleteRate: 0 };
      }
      if (l.actionType === 'حذف') {
        map[l.orgUnit].deletes++;
      } else {
        map[l.orgUnit].edits++;
      }
      if (l.cause === 'بانکی') {
        map[l.orgUnit].bankCount++;
      }
      map[l.orgUnit].total++;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        deleteRate: item.total > 0 ? Number(((item.deletes / item.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLetters]);

  // Extended Pie Data: All Units breakdown (for full-width mode)
  const allUnitsPieData = useMemo(() => {
    const counts: { [unit: string]: { count: number; deletes: number; edits: number; bankCount: number } } = {};
    filteredLetters.forEach(l => {
      if (!counts[l.orgUnit]) {
        counts[l.orgUnit] = { count: 0, deletes: 0, edits: 0, bankCount: 0 };
      }
      counts[l.orgUnit].count++;
      if (l.actionType === 'حذف') counts[l.orgUnit].deletes++;
      else counts[l.orgUnit].edits++;
      if (l.cause === 'بانکی') counts[l.orgUnit].bankCount++;
    });

    const total = filteredLetters.length || 1;
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        deletes: data.deletes,
        edits: data.edits,
        bankCount: data.bankCount,
        percentage: Number(((data.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLetters]);

  // Chart 3 Data: Monthly Trend
  const monthlyTrendData = useMemo(() => {
    const monthMap: { [m: string]: { month: string; monthLabel: string; deletes: number; edits: number; total: number } } = {};
    
    // If date range is active, only show months that exist in filteredLetters, otherwise show allMonths
    const targetMonths = (startDate || endDate)
      ? Array.from(new Set(filteredLetters.map(l => l.month))).filter(Boolean).sort()
      : allMonths;

    targetMonths.forEach(m => {
      const [y, mm] = m.split('/');
      monthMap[m] = {
        month: m,
        monthLabel: `${PERSIAN_MONTH_NAMES[mm] || mm} ${y}`,
        deletes: 0,
        edits: 0,
        total: 0
      };
    });

    filteredLetters.forEach(l => {
      if (!monthMap[l.month]) {
        const [y, mm] = l.month ? l.month.split('/') : ['', ''];
        monthMap[l.month] = {
          month: l.month,
          monthLabel: `${PERSIAN_MONTH_NAMES[mm] || mm} ${y}`,
          deletes: 0,
          edits: 0,
          total: 0
        };
      }
      if (l.actionType === 'حذف') {
        monthMap[l.month].deletes++;
      } else {
        monthMap[l.month].edits++;
      }
      monthMap[l.month].total++;
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLetters, allMonths, startDate, endDate]);

  // Paginated letters list (client vs server database mode adaptive)
  const clientTotalPages = Math.ceil(filteredLetters.length / pageSize) || 1;
  const paginatedLetters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLetters.slice(start, start + pageSize);
  }, [filteredLetters, currentPage]);

  const effectiveTotalLetters = filterExecutionMode === 'server' ? serverTotal : filteredLetters.length;
  const effectiveTotalPages = filterExecutionMode === 'server' ? serverTotalPages : clientTotalPages;
  const displayedLetters = filterExecutionMode === 'server' ? serverLetters : paginatedLetters;

  const handleResetFilters = () => {
    setSelectedUnits([]);
    setSelectedMonth('all');
    setSelectedActionType('all');
    setSelectedCause('all');
    setShowExcludedOnly(false);
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setTempStartDate('');
    setTempEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="stat-total-letters"
          title={
            selectedUnits.length > 0
              ? selectedUnits.length === 1
                ? `مکاتبات واحد ${selectedUnits[0]}`
                : `مکاتبات ${selectedUnits.length} واحد منتخب`
              : 'مجموع کل نامه‌ها (یکتا بر اساس شماره ثبت)'
          }
          value={filteredMetrics.total}
          icon={Mail}
          colorScheme="indigo"
          badgeText={
            selectedUnits.length > 0
              ? selectedUnits.length === 1
                ? `واحد: ${selectedUnits[0]}`
                : `${selectedUnits.length} واحد منتخب`
              : 'شماره ثبت یکتا'
          }
          secondaryValue={{
            label: selectedUnits.length > 0 ? 'سهم از سازمان' : 'مجموع کل یکتا',
            value: selectedUnitStats ? `${selectedUnitStats.orgShare}%` : filteredMetrics.total
          }}
        />

        <MetricCard
          id="stat-deletes"
          title={
            selectedUnits.length > 0
              ? selectedUnits.length === 1
                ? `حذف‌های واحد ${selectedUnits[0]}`
                : `حذف‌های ${selectedUnits.length} واحد منتخب`
              : 'تعداد کل حذف‌ها'
          }
          value={filteredMetrics.deletes}
          icon={Trash2}
          colorScheme="rose"
          badgeText={selectedUnitStats ? `حذف: ${selectedUnitStats.deleteRate}%` : 'نوع: حذف'}
          secondaryValue={{
            label: selectedUnits.length > 0 ? 'نرخ حذف واحد' : 'درصد از کل',
            value: selectedUnitStats ? selectedUnitStats.deleteRate : (filteredMetrics.total > 0 ? Math.round((filteredMetrics.deletes / filteredMetrics.total) * 100) : 0)
          }}
        />

        <MetricCard
          id="stat-edits"
          title={
            selectedUnits.length > 0
              ? selectedUnits.length === 1
                ? `ویرایش‌های واحد ${selectedUnits[0]}`
                : `ویرایش‌های ${selectedUnits.length} واحد منتخب`
              : 'تعداد کل ویرایش‌ها'
          }
          value={filteredMetrics.edits}
          icon={Edit3}
          colorScheme="emerald"
          badgeText={selectedUnitStats ? `ویرایش: ${selectedUnitStats.editRate}%` : 'نوع: ویرایش'}
          secondaryValue={{
            label: selectedUnits.length > 0 ? 'نرخ ویرایش واحد' : 'درصد از کل',
            value: selectedUnitStats ? selectedUnitStats.editRate : (filteredMetrics.total > 0 ? Math.round((filteredMetrics.edits / filteredMetrics.total) * 100) : 0)
          }}
        />

        <MetricCard
          id="stat-units"
          title="واحدهای سازمانی درگیر"
          value={filteredMetrics.activeUnits}
          icon={Building2}
          colorScheme="amber"
          badgeText="واحدهای فعال"
          secondaryValue={{
            label: 'بیشترین درخواست',
            value: `${filteredMetrics.topUnit} (${formatNumber(filteredMetrics.topCount)})`
          }}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FAFAF7] rounded-3xl p-5 border border-[#E2E0D8] shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b border-[#E8E6DF] pb-3 mb-4">
          <div className="flex items-center gap-2 text-[#2D2C28] font-bold text-sm">
            <SlidersHorizontal className="h-4 w-4 text-[#545D4B]" />
            <span>فیلتر و جستجوی پیشرفته</span>
            {showExcludedOnly && (
              <span className="bg-[#FAECE8] text-[#9C3A27] text-xs font-bold px-2 py-0.5 rounded-full border border-[#F2D1CA]">
                در حال نمایش نامه‌های مستثنی شده (تست)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenSettingsModal && (
              <button
                onClick={onOpenSettingsModal}
                className="flex items-center gap-1.5 text-xs text-[#2D2C28] hover:bg-[#EAE8DE] font-bold px-2.5 py-1.5 rounded-lg bg-[#EFEFEA] border border-[#DDDBCF] transition cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-[#545D4B]" />
                <span>تنظیمات قوانین ({formatNumber(rules.length + exclusionRules.length)})</span>
              </button>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs text-[#9C3A27] hover:text-[#8A2E1D] font-bold px-2.5 py-1.5 rounded-lg bg-[#FAECE8] hover:bg-[#F5D7D0] border border-[#F2D1CA] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>پاک کردن فیلترها ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Unit Filter (Multi-select) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              واحد سازمانی (امکان انتخاب چندگانه):
            </label>
            <MultiSelectDropdown
              id="filter-org-units-multi"
              options={allUnits}
              selectedValues={selectedUnits}
              onChange={vals => {
                setSelectedUnits(vals);
                setCurrentPage(1);
              }}
              placeholder="انتخاب یا جستجوی واحدها..."
              allLabel="همه واحدهای سازمانی"
              showCounts={true}
              countsMap={unitCountsMap}
              compact={true}
            />
          </div>

          {/* Cause Filter (عامل) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              عامل (منشأ درخواست):
            </label>
            <select
              value={selectedCause}
              onChange={e => {
                setSelectedCause(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl px-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white transition font-bold"
            >
              <option value="all">همه عامل‌ها ({allCauses.length} عامل)</option>
              {allCauses.map(c => (
                <option key={c} value={c}>
                  عامل: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              ماه / دوره زمانی:
            </label>
            <select
              value={selectedMonth}
              onChange={e => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl px-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition font-medium"
            >
              <option value="all">همه ماه‌های سال</option>
              {allMonths.map(m => {
                const [y, mm] = m.split('/');
                return (
                  <option key={m} value={m}>
                    {PERSIAN_MONTH_NAMES[mm] || mm} {y} ({m})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Letter Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              نوع نامه:
            </label>
            <select
              value={selectedActionType}
              onChange={e => {
                setSelectedActionType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl px-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition font-medium"
            >
              <option value="all">همه انواع (حذف و ویرایش)</option>
              <option value="حذف">فقط نامه‌های حذف</option>
              <option value="ویرایش">فقط نامه‌های ویرایش</option>
            </select>
          </div>

          {/* Date Filter Trigger in Filter Panel */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              فیلتر تاریخ (شمسی):
            </label>
            <button
              type="button"
              onClick={() => {
                setTempStartDate(startDate);
                setTempEndDate(endDate);
                setIsChartDateFilterOpen(true);
                const chartSection = document.getElementById('charts-analytics-header');
                if (chartSection) {
                  chartSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border font-bold transition cursor-pointer ${
                startDate || endDate
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                  : 'bg-[#F5F5F0] text-[#2D2C28] border-[#DDDBCF] hover:bg-[#EFEFEA]'
              }`}
            >
              <span className="truncate">
                {startDate || endDate
                  ? `${startDate ? startDate.slice(5) : '...'} تا ${endDate ? endDate.slice(5) : '...'}`
                  : 'انتخاب بازه تاریخ / ماه‌ها...'}
              </span>
              <CalendarRange className={`h-4 w-4 shrink-0 mr-1 ${startDate || endDate ? 'text-emerald-700' : 'text-[#545D4B]'}`} />
            </button>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-[#75746E] mb-1">
              جستجو در متن / عامل / شناسه:
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#8A8880] pointer-events-none" />
              <input
                type="text"
                placeholder="موضوع، بانک، کد..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl pr-9 pl-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs pt-3 border-t border-[#E8E6DF]">
          <div className="flex items-center gap-2 text-[#75746E] flex-wrap">
            <span>نتایج یافت شده:</span>
            <span className="font-bold text-[#2D2C28] bg-[#EFEFEA] px-2 py-0.5 rounded-md border border-[#DDDBCF]">
              {formatNumber(filteredLetters.length)} نامه
            </span>
            <span>(شامل {formatNumber(filteredMetrics.uniqueTotal)} نامه یکتا)</span>

            {/* Date Range Active Badge */}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg font-bold text-[11px]">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-700" />
                <span>بازه تاریخی: {startDate || '...'} تا {endDate || '...'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setTempStartDate('');
                    setTempEndDate('');
                  }}
                  className="hover:text-red-600 p-0.5 rounded cursor-pointer"
                  title="حذف فیلتر تاریخ"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* If Unit is filtered, show quick 2-color breakdown pill in summary */}
            {selectedUnitStats && (
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[11px] font-extrabold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  حذف: {selectedUnitStats.deleteRate}% ({formatNumber(selectedUnitStats.deletes)})
                </span>
                <span className="text-[11px] font-extrabold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  ویرایش: {selectedUnitStats.editRate}% ({formatNumber(selectedUnitStats.edits)})
                </span>
              </div>
            )}

            {/* Quick Cause Badges Breakdown */}
            <div className="flex items-center gap-1.5 mr-2">
              {filteredMetrics.causesDistribution.map(cd => (
                <button
                  type="button"
                  key={cd.cause}
                  onClick={() => setSelectedCause(selectedCause === cd.cause ? 'all' : cd.cause)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition border cursor-pointer ${
                    selectedCause === cd.cause
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white text-[#2D2C28] border-[#DDDBCF] hover:bg-[#EFEFEA]'
                  }`}
                >
                  {cd.cause}: {formatNumber(cd.count)} ({cd.percent}%)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Header & Switcher Toolbar */}
      <div id="charts-analytics-header" className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#FAFAF7] p-4 rounded-3xl border border-[#E2E0D8] shadow-2xs">
        {/* Left Side: Title & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF]">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#2D2C28]">
                تحلیل بصری و نمودارهای آماری
              </h4>
              <p className="text-[10px] text-[#75746E]">
                {chartViewMode === 'both' && 'حالت دو ستونه: سهم واحدها در کنار مقایسه تفکیکی حذف و ویرایش'}
                {chartViewMode === 'pie' && 'حالت تمام‌عرض دایره‌ای: تحلیل جامع سهم تمامی واحدهای سازمانی با آمار تفصیلی'}
                {chartViewMode === 'bar' && 'حالت تمام‌عرض ستونی: بررسی عمیق و مقایسه دقیق حذف/ویرایش تمامی واحدها'}
              </p>
            </div>
          </div>

          {/* Small View Mode Switcher Buttons */}
          <div className="flex items-center gap-1 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF]">
            <button
              type="button"
              onClick={() => setChartViewMode('both')}
              title="نمایش همزمان ۲ ستونه (دایره‌ای و میله‌ای کنار هم)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartViewMode === 'both'
                  ? 'bg-white text-[#2D2C28] shadow-xs border border-[#DDDBCF]'
                  : 'text-[#75746E] hover:text-[#2D2C28] hover:bg-white/50'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5 text-[#545D4B]" />
              <span>۲ ستونه</span>
            </button>

            <button
              type="button"
              onClick={() => setChartViewMode('pie')}
              title="نمایش تمام‌عرض نمودار دایره‌ای با جزئیات کامل واحدها"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartViewMode === 'pie'
                  ? 'bg-white text-[#1E40AF] shadow-xs border border-[#BFDBFE]'
                  : 'text-[#75746E] hover:text-[#1E40AF] hover:bg-white/50'
              }`}
            >
              <PieIcon className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>فقط دایره‌ای</span>
            </button>

            <button
              type="button"
              onClick={() => setChartViewMode('bar')}
              title="نمایش تمام‌عرض نمودار میله‌ای با جزئیات کامل واحدها"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartViewMode === 'bar'
                  ? 'bg-white text-[#9C3A27] shadow-xs border border-[#F2D1CA]'
                  : 'text-[#75746E] hover:text-[#9C3A27] hover:bg-white/50'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#9C3A27]" />
              <span>فقط میله‌ای</span>
            </button>
          </div>
        </div>

        {/* Right Side: Date Filter & Presets for Charts (Matching EraDashboard) */}
        <div className="flex items-center gap-2 flex-wrap relative" ref={chartDateFilterRef}>
          {/* Quick Period Presets */}
          <div className="flex items-center gap-1 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF] text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                const s = getJalaliMonthsAgo(3);
                const e = curJalali.str;
                setStartDate(s);
                setEndDate(e);
                setTempStartDate(s);
                setTempEndDate(e);
                setSelectedMonth('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                startDate === getJalaliMonthsAgo(3) && endDate === curJalali.str
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
              }`}
              title="فیلتر نامه‌های ۳ ماه گذشته تا امروز (فصل اخیر)"
            >
              ۳ ماه اخیر
            </button>

            <button
              type="button"
              onClick={() => {
                const s = getJalaliMonthsAgo(6);
                const e = curJalali.str;
                setStartDate(s);
                setEndDate(e);
                setTempStartDate(s);
                setTempEndDate(e);
                setSelectedMonth('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                startDate === getJalaliMonthsAgo(6) && endDate === curJalali.str
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
              }`}
              title="فیلتر نامه‌های ۶ ماه گذشته تا امروز (نیم‌سال اخیر)"
            >
              ۶ ماه اخیر
            </button>

            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTempStartDate('');
                setTempEndDate('');
                setSelectedMonth('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                !startDate && !endDate && selectedMonth === 'all'
                  ? 'bg-[#545D4B] text-white shadow-xs'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
              }`}
              title="نمایش تمامی ماه‌ها بدون محدودیت تاریخ"
            >
              همه ماه‌ها
            </button>
          </div>

          {/* Date Filter Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempStartDate(startDate);
                setTempEndDate(endDate);
                setIsChartDateFilterOpen(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer border ${
                startDate || endDate
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-[#2D2C28] border-[#DDDBCF] hover:border-[#545D4B]'
              }`}
              title="فیلتر تاریخ و ماه‌های سال برای نمودارها و جدول"
            >
              <CalendarRange className={`h-3.5 w-3.5 ${startDate || endDate ? 'text-emerald-700' : 'text-[#545D4B]'}`} />
              <span>
                {startDate || endDate
                  ? `بازه: ${startDate ? startDate.slice(5) : '...'} تا ${endDate ? endDate.slice(5) : '...'}`
                  : 'فیلتر تاریخ / انتخاب ماه'}
              </span>
            </button>

            {/* Date Filter Popover */}
            {isChartDateFilterOpen && (
              <div className="absolute z-50 top-full mt-2 left-0 sm:left-auto sm:right-0 w-80 bg-white rounded-3xl p-4 shadow-2xl border border-[#DDDBCF] text-right space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D2C28]">
                    <CalendarRange className="h-4 w-4 text-[#545D4B]" />
                    <span>فیلتر تاریخ و ماه‌های آماده</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChartDateFilterOpen(false)}
                    className="text-[#8A8880] hover:text-[#2D2C28] p-1 rounded-lg hover:bg-[#F5F5F0] transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Section 1: Recent Period Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#75746E] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#545D4B]" />
                    <span>دوره‌های زمانی اخیر و پرکاربرد:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const s = getJalaliMonthsAgo(1);
                        const e = curJalali.str;
                        setTempStartDate(s);
                        setTempEndDate(e);
                        setStartDate(s);
                        setEndDate(e);
                        setSelectedMonth('all');
                        setIsChartDateFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition cursor-pointer text-center ${
                        startDate === getJalaliMonthsAgo(1) && endDate === curJalali.str
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-[#F5F5F0] text-[#2D2C28] border-[#DDDBCF] hover:bg-[#EAEAE5]'
                      }`}
                    >
                      ماه اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const s = getJalaliMonthsAgo(3);
                        const e = curJalali.str;
                        setTempStartDate(s);
                        setTempEndDate(e);
                        setStartDate(s);
                        setEndDate(e);
                        setSelectedMonth('all');
                        setIsChartDateFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition cursor-pointer text-center ${
                        startDate === getJalaliMonthsAgo(3) && endDate === curJalali.str
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-[#F5F5F0] text-[#2D2C28] border-[#DDDBCF] hover:bg-[#EAEAE5]'
                      }`}
                    >
                      ۳ ماه اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const s = getJalaliMonthsAgo(6);
                        const e = curJalali.str;
                        setTempStartDate(s);
                        setTempEndDate(e);
                        setStartDate(s);
                        setEndDate(e);
                        setSelectedMonth('all');
                        setIsChartDateFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-xl border transition cursor-pointer text-center ${
                        startDate === getJalaliMonthsAgo(6) && endDate === curJalali.str
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-[#F5F5F0] text-[#2D2C28] border-[#DDDBCF] hover:bg-[#EAEAE5]'
                      }`}
                    >
                      ۶ ماه اخیر
                    </button>
                  </div>
                </div>

                {/* Section 2: Persian Months Grid */}
                <div className="space-y-2 pt-1 border-t border-[#E8E6DF]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#75746E] flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-[#545D4B]" />
                      <span>ماه‌های آماده سال:</span>
                    </label>
                    {allYears.length > 1 ? (
                      <div className="flex items-center gap-1">
                        {allYears.map(yr => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setFilterYear(yr)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                              (filterYear || allYears[0] || String(curJalali.year)) === yr
                                ? 'bg-[#545D4B] text-white'
                                : 'bg-[#EAEAE5] text-[#545D4B] hover:bg-[#DDDBCF]'
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-[#545D4B]">
                        سال {filterYear || allYears[0] || String(curJalali.year)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {PERSIAN_MONTHS_LIST.map((mItem) => {
                      const targetYear = filterYear || allYears[0] || String(curJalali.year);
                      const mStart = `${targetYear}/${mItem.num}/01`;
                      const mEnd = `${targetYear}/${mItem.num}/${String(mItem.days).padStart(2, '0')}`;
                      const isSelected = startDate === mStart && endDate === mEnd;

                      return (
                        <button
                          key={mItem.name}
                          type="button"
                          onClick={() => {
                            setTempStartDate(mStart);
                            setTempEndDate(mEnd);
                            setStartDate(mStart);
                            setEndDate(mEnd);
                            setSelectedMonth('all');
                            setIsChartDateFilterOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`px-1 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer text-center ${
                            isSelected
                              ? 'bg-[#545D4B] text-white border-[#545D4B] shadow-2xs'
                              : 'bg-[#F9F9F6] text-[#54534F] border-[#E8E6DF] hover:bg-[#EAEAE5] hover:text-[#2D2C28]'
                          }`}
                        >
                          {mItem.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Custom Date Range Form */}
                <div className="space-y-2 pt-1 border-t border-[#E8E6DF]">
                  <label className="text-[10px] font-bold text-[#75746E] block">
                    یا تعیین بازه تاریخی دستی:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#2D2C28]">از تاریخ:</span>
                      <JalaliDateInput
                        value={tempStartDate}
                        onChange={setTempStartDate}
                        onEnter={() => {
                          setStartDate(tempStartDate.trim());
                          setEndDate(tempEndDate.trim());
                          setSelectedMonth('all');
                          setIsChartDateFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        placeholder="۱۴۰X/MM/DD"
                        inputClassName="bg-[#FAFAF7] focus:bg-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#2D2C28]">تا تاریخ:</span>
                      <JalaliDateInput
                        value={tempEndDate}
                        onChange={setTempEndDate}
                        onEnter={() => {
                          setStartDate(tempStartDate.trim());
                          setEndDate(tempEndDate.trim());
                          setSelectedMonth('all');
                          setIsChartDateFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        placeholder="۱۴۰X/MM/DD"
                        inputClassName="bg-[#FAFAF7] focus:bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E8E6DF]">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(tempStartDate.trim());
                      setEndDate(tempEndDate.trim());
                      setSelectedMonth('all');
                      setIsChartDateFilterOpen(false);
                      setCurrentPage(1);
                    }}
                    className="flex-1 bg-[#545D4B] hover:bg-[#434A3C] text-white py-1.5 px-3 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    اعمال فیلتر
                  </button>
                  {(startDate || endDate || tempStartDate || tempEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempStartDate('');
                        setTempEndDate('');
                        setStartDate('');
                        setEndDate('');
                        setSelectedMonth('all');
                        setIsChartDateFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className="bg-[#FAECE8] hover:bg-[#F5D8D0] text-[#9C3A27] py-1.5 px-3 rounded-xl text-xs font-bold border border-[#F2D1CA] transition cursor-pointer"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear Date Filter Button */}
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTempStartDate('');
                setTempEndDate('');
                setSelectedMonth('all');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] px-2.5 py-1.5 rounded-xl border border-[#F2D1CA] transition cursor-pointer"
              title="حذف فیلتر تاریخ و نمایش کلیه بازه‌های زمانی"
            >
              <X className="h-3.5 w-3.5" />
              <span>حذف فیلتر تاریخ</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Charts Grid / Full Width Displays */}
      {chartViewMode === 'both' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pie Chart: Percentage of Letters per Organizational Unit OR 2-Color Delete/Edit Breakdown for Selected Unit */}
          <div className="lg:col-span-5 bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${
                  selectedUnits.length > 0
                    ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                    : 'bg-[#EFEFEA] text-[#545D4B] border-[#DDDBCF]'
                }`}>
                  <PieIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D2C28]">
                    {selectedUnits.length === 1
                      ? `تفکیک حذف و ویرایش: ${selectedUnits[0]}`
                      : selectedUnits.length > 1
                      ? `سهم ${selectedUnits.length} واحد منتخب از مکاتبات`
                      : 'سهم واحدهای سازمانی از کل نامه‌ها'}
                  </h3>
                  <p className="text-[11px] text-[#75746E]">
                    {selectedUnits.length === 1
                      ? 'نسبت درصد حذف (قرمز) و ویرایش (سبز) روی دایره'
                      : selectedUnits.length > 1
                      ? 'درصد و سهم هر یک از واحدهای انتخاب‌شده'
                      : 'درصد ارسالی نامه‌ها به تفکیک واحد'}
                  </p>
                </div>
              </div>

              {/* Quick Reset Filter Button on the Pie Chart Card Header */}
              {selectedUnits.length > 0 ? (
                <button
                  onClick={() => {
                    setSelectedUnits([]);
                    setCurrentPage(1);
                  }}
                  title="پاک کردن فیلتر واحدها و نمایش تمامی واحدها"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] rounded-xl border border-[#F2D1CA] transition cursor-pointer shadow-2xs active:scale-95 animate-in fade-in"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="max-w-[130px] truncate">
                    {selectedUnits.length === 1 ? selectedUnits[0] : `${selectedUnits.length} واحد`}
                  </span>
                  <span className="text-[#9C3A27] bg-white/80 p-0.5 rounded-full">
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ) : (
                <span className="text-[11px] font-medium text-[#75746E] bg-[#EFEFEA] px-2.5 py-1 rounded-lg border border-[#DDDBCF]">
                  تمام واحدها
                </span>
              )}
            </div>

            {/* Donut Chart with Direct Slice Labels & Center Details */}
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={selectedUnits.length === 1 ? 4 : 3}
                    dataKey="count"
                    nameKey="name"
                    label={renderActionPieLabel}
                    labelLine={false}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      const target = entry?.name || entry?.payload?.name;
                      if (selectedUnits.length === 1) {
                        const act = (target === 'حذف' || entry?.actionType === 'حذف' || target?.includes?.('حذف')) ? 'حذف' : 'ویرایش';
                        setSelectedActionType(prev => (prev === act ? 'all' : act));
                        setCurrentPage(1);
                        scrollToTable();
                      } else if (target && target !== 'سایر واحدها') {
                        setSelectedUnits(prev =>
                          prev.includes(target) ? prev.filter(u => u !== target) : [...prev, target]
                        );
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    }}
                  >
                    {activePieData.map((entry, index) => {
                      if (selectedUnits.length === 1) {
                        const isDelete = entry.name === 'حذف' || entry.actionType === 'حذف';
                        return (
                          <Cell
                            key={`action-cell-${index}`}
                            fill={isDelete ? '#DC2626' : '#16A34A'}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        );
                      }
                      const isSelected = selectedUnits.includes(entry.name);
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke={isSelected ? '#2D2C28' : '#FFFFFF'}
                          strokeWidth={isSelected ? 3 : 1}
                          opacity={selectedUnits.length === 0 || isSelected ? 1 : 0.45}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={<CustomPieTooltip />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                    offset={18}
                    isAnimationActive={false}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Ring Hole Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {selectedUnits.length === 1 ? (
                  <>
                    <span className="text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE] mb-0.5">
                      واحد انتخاب‌شده
                    </span>
                    <span className="text-xs font-black text-[#0F172A] max-w-[120px] truncate" title={selectedUnits[0]}>
                      {selectedUnits[0]}
                    </span>
                    <span className="text-xs font-black text-[#475569] mt-0.5">
                      {formatNumber(filteredLetters.length)} نامه
                    </span>
                    <span className="text-[9px] font-extrabold text-[#991B1B] mt-0.5">
                      قرمز: حذف | سبز: ویرایش
                    </span>
                  </>
                ) : selectedUnits.length > 1 ? (
                  <>
                    <span className="text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE] mb-0.5">
                      {selectedUnits.length} واحد فیلترشده
                    </span>
                    <span className="text-xs font-black text-[#0F172A] max-w-[120px] truncate">
                      {formatNumber(filteredLetters.length)} نامه
                    </span>
                    <span className="text-[10px] text-[#545D4B] font-bold">مجموع انتخابی</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-[#75746E] font-medium">مجموع کل</span>
                    <span className="text-base font-black text-[#2D2C28]">{formatNumber(filteredLetters.length)}</span>
                    <span className="text-[10px] text-[#545D4B] font-bold">نامه ثبتی</span>
                  </>
                )}
              </div>
            </div>

            {/* Subtitle & Reset helper above legend */}
            <div className="flex items-center justify-between px-1 text-[11px] text-[#75746E] mt-1 mb-1.5 border-t border-[#E8E6DF] pt-2">
              <span>
                {selectedUnits.length === 1
                  ? 'تفکیک ۲ رنگ بر روی دایره مختص این واحد:'
                  : selectedUnits.length > 1
                  ? `واحدهای انتخاب‌شده (${selectedUnits.length} واحد):`
                  : 'برای فیلتر روی هر واحد کلیک کنید:'}
              </span>
              {selectedUnits.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedUnits([]);
                    setCurrentPage(1);
                  }}
                  className="text-[#9C3A27] hover:text-[#8A2E1D] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>نمایش تمام واحدها</span>
                </button>
              )}
            </div>

            {/* Dynamic Legend: 2-Color Action Breakdown when 1 unit is filtered vs Multi/All Units List */}
            {selectedUnits.length === 1 && selectedUnitStats ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Red: Delete */}
                  <div
                    onClick={() => {
                      setSelectedActionType(prev => (prev === 'حذف' ? 'all' : 'حذف'));
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border-2 text-[#991B1B] cursor-pointer transition ${
                      selectedActionType === 'حذف'
                        ? 'bg-[#FEF2F2] border-[#DC2626] ring-2 ring-[#DC2626]/30'
                        : 'bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] border-[#FECACA]'
                    }`}
                    title="کلیک برای فیلتر جدول فقط روی نامه‌های حذف"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-3 h-3 rounded-full bg-[#DC2626] ring-2 ring-white shrink-0" />
                      <span className="font-black truncate">حذف (قرمز)</span>
                    </div>
                    <span className="text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-[#FECACA] shrink-0">
                      {selectedUnitStats.deleteRate}% ({formatNumber(selectedUnitStats.deletes)})
                    </span>
                  </div>

                  {/* Green: Edit */}
                  <div
                    onClick={() => {
                      setSelectedActionType(prev => (prev === 'ویرایش' ? 'all' : 'ویرایش'));
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border-2 text-[#166534] cursor-pointer transition ${
                      selectedActionType === 'ویرایش'
                        ? 'bg-[#F0FDF4] border-[#16A34A] ring-2 ring-[#16A34A]/30'
                        : 'bg-[#F0FDF4]/60 hover:bg-[#F0FDF4] border-[#BBF7D0]'
                    }`}
                    title="کلیک برای فیلتر جدول فقط روی نامه‌های ویرایش"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-3 h-3 rounded-full bg-[#16A34A] ring-2 ring-white shrink-0" />
                      <span className="font-black truncate">ویرایش (سبز)</span>
                    </div>
                    <span className="text-xs font-black bg-white px-2 py-0.5 rounded-lg border border-[#BBF7D0] shrink-0">
                      {selectedUnitStats.editRate}% ({formatNumber(selectedUnitStats.edits)})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedUnits([]);
                    setCurrentPage(1);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-bold text-[#475569] hover:text-[#0F172A] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>بازگشت به دایره تمام واحدهای سازمانی</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1 text-xs">
                {unitPieData.map((item, idx) => {
                  const isSelected = selectedUnits.includes(item.name);
                  return (
                    <div
                      key={item.name}
                      onClick={() => {
                        if (item.name === 'سایر واحدها') {
                          setSelectedUnits([]);
                        } else {
                          setSelectedUnits(prev =>
                            prev.includes(item.name) ? prev.filter(u => u !== item.name) : [...prev, item.name]
                          );
                        }
                        setCurrentPage(1);
                        scrollToTable();
                      }}
                      title={isSelected ? 'کلیک مجدد برای حذف از فیلتر' : `اضافه به فیلتر (${item.name})`}
                      className={`flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-[#545D4B] text-white shadow-2xs font-bold ring-2 ring-[#545D4B]/40'
                          : 'hover:bg-[#EFEFEA] text-[#2D2C28] border border-transparent hover:border-[#DDDBCF]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'ring-2 ring-white' : ''}`}
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#EBEBE6] text-[#2D2C28] border border-[#DDDBCF]'
                        }`}>
                          {item.percentage}%
                        </span>
                        {isSelected && (
                          <X className="h-3 w-3 text-white/80 hover:text-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bar Chart: Deletions vs Edits per Organizational Unit or Monthly Trend for Selected Unit */}
          <div className="lg:col-span-7 bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#EDF2EB] text-[#446347] border border-[#D4DFD1]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2D2C28]">
                    {selectedUnits.length === 1
                      ? `روند ماهانه نامه‌های حذف و ویرایش: ${selectedUnits[0]}`
                      : selectedUnits.length > 1
                      ? `مقایسه نامه‌های حذف و ویرایش: ${selectedUnits.length} واحد منتخب`
                      : 'مقایسه نامه‌های حذف و ویرایش بر اساس واحد'}
                  </h3>
                  <p className="text-[11px] text-[#75746E]">
                    {selectedUnits.length === 1
                      ? `تفکیک ماهانه درخواست‌ها برای واحد ${selectedUnits[0]} به تفکیک حذف و اصلاح`
                      : selectedUnits.length > 1
                      ? `تفکیک حذف و ویرایش برای ${selectedUnits.length} واحد انتخاب‌شده`
                      : '۱۰ واحد سازمانی پردرخواست به تفکیک نوع عملیات'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
                {/* AI Analysis of Bar Chart & Cause Breakdown (نمایش فقط در صورت فعال‌سازی در تنظیمات سامانه) */}
                {eraVisibility?.showAiChartAnalysis && (
                  <button
                    type="button"
                    onClick={() => setIsAiChartModalOpen(true)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-[#2C3B2D] via-[#446347] to-[#545D4B] hover:from-[#233024] hover:to-[#364438] px-3 py-1.5 rounded-xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer border border-[#6B7561]/40"
                    title="تحلیل هوشمند آماری و ریشه‌یابی نامه‌های حذف و ویرایش بر اساس نمودار میله‌ای با هوش مصنوعی"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>تحلیل هوش مصنوعی نمودار</span>
                  </button>
                )}

                <span className="flex items-center gap-1 text-[#9C3A27]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9C3A27]" />
                  حذف ({formatNumber(filteredMetrics.deletes)})
                </span>
                <span className="flex items-center gap-1 text-[#545D4B]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#545D4B]" />
                  ویرایش ({formatNumber(filteredMetrics.edits)})
                </span>
              </div>
            </div>

            <div className="h-[420px] sm:h-[440px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(selectedUnits.length === 1 ? monthlyTrendData : unitBarData.slice(0, 10)) as any[]}
                  margin={{ top: 15, right: 15, left: 10, bottom: 95 }}
                  className="cursor-pointer"
                  onClick={(state: any) => {
                    if (selectedUnits.length === 1) {
                      const item = state?.activePayload?.[0]?.payload || state?.payload;
                      const monthVal = item?.month;
                      if (monthVal && typeof monthVal === 'string') {
                        setSelectedMonth(prev => (prev === monthVal ? 'all' : monthVal));
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    } else {
                      const unitName = state?.activeLabel || state?.activePayload?.[0]?.payload?.unit || state?.payload?.unit;
                      if (unitName && typeof unitName === 'string') {
                        setSelectedUnits(prev =>
                          prev.includes(unitName) ? prev.filter(u => u !== unitName) : [unitName]
                        );
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6DF" />
                  <XAxis
                    dataKey={selectedUnits.length === 1 ? 'monthLabel' : 'unit'}
                    height={95}
                    interval={0}
                    tick={renderRotatedUnitTick}
                    tickLine={{ stroke: '#DDDBCF' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    width={36}
                    tick={{ fill: '#75746E', fontSize: 11 }}
                    tickLine={{ stroke: '#DDDBCF' }}
                    stroke="#CBD5E1"
                    axisLine={{ stroke: '#DDDBCF' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomBarTooltip />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                    offset={18}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="deletes"
                    name="deletes"
                    fill="#9C3A27"
                    radius={[6, 6, 0, 0]}
                    barSize={selectedUnits.length === 1 ? 18 : 16}
                    className="cursor-pointer transition-opacity hover:opacity-85"
                    onClick={(entry: any) => {
                      if (selectedUnits.length === 1) {
                        const m = entry?.month || entry?.payload?.month;
                        if (m && typeof m === 'string') {
                          setSelectedMonth(prev => (prev === m ? 'all' : m));
                          setCurrentPage(1);
                          scrollToTable();
                        }
                      } else {
                        const u = entry?.unit || entry?.payload?.unit;
                        if (u && typeof u === 'string') {
                          setSelectedUnits(prev =>
                            prev.includes(u) ? prev.filter(x => x !== u) : [u]
                          );
                          setCurrentPage(1);
                          scrollToTable();
                        }
                      }
                    }}
                  />
                  <Bar
                    dataKey="edits"
                    name="edits"
                    fill="#545D4B"
                    radius={[6, 6, 0, 0]}
                    barSize={selectedUnits.length === 1 ? 18 : 16}
                    className="cursor-pointer transition-opacity hover:opacity-85"
                    onClick={(entry: any) => {
                      if (selectedUnits.length === 1) {
                        const m = entry?.month || entry?.payload?.month;
                        if (m && typeof m === 'string') {
                          setSelectedMonth(prev => (prev === m ? 'all' : m));
                          setCurrentPage(1);
                          scrollToTable();
                        }
                      } else {
                        const u = entry?.unit || entry?.payload?.unit;
                        if (u && typeof u === 'string') {
                          setSelectedUnits(prev =>
                            prev.includes(u) ? prev.filter(x => x !== u) : [u]
                          );
                          setCurrentPage(1);
                          scrollToTable();
                        }
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Full-Width Mode 1: Comprehensive Pie Chart View with Granular Breakdown */}
      {chartViewMode === 'pie' && (
        <div className="bg-[#FAFAF7] rounded-3xl p-6 sm:p-8 border border-[#E2E0D8] shadow-xs space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl border bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]">
                <PieIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D2C28] flex items-center gap-2">
                  <span>
                    {selectedUnits.length === 1
                      ? `تحلیل تمام‌عرض تفکیک عملیات: ${selectedUnits[0]}`
                      : selectedUnits.length > 1
                      ? `تحلیل تمام‌عرض سهم ${selectedUnits.length} واحد منتخب`
                      : 'تحلیل تمام‌عرض سهم واحدهای سازمانی'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                    {selectedUnits.length === 1
                      ? 'تفکیک حذف / ویرایش روی دایره'
                      : selectedUnits.length > 1
                      ? `${selectedUnits.length} واحد منتخب`
                      : `${allUnitsPieData.length} واحد سازمانی`}
                  </span>
                </h3>
                <p className="text-xs text-[#75746E]">
                  {selectedUnits.length === 1
                    ? 'نمایش نسبت حذف (قرمز) و ویرایش (سبز) روی دایره و درصد هر کدام'
                    : selectedUnits.length > 1
                    ? 'نمایش توزیع درصد و حجم کل نامه‌ها برای واحدهای انتخاب‌شده'
                    : 'نمایش توزیع درصد و حجم کل نامه‌ها، تفکیک حذف و ویرایش و منشأ بانکی برای هر واحد'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedUnits.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedUnits([]);
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] rounded-xl border border-[#F2D1CA] transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>بازنشانی فیلتر واحدها ({selectedUnits.length === 1 ? selectedUnits[0] : `${selectedUnits.length} واحد`})</span>
                </button>
              )}
              <span className="text-xs font-bold text-[#2D2C28] bg-[#EFEFEA] px-3 py-1.5 rounded-xl border border-[#DDDBCF]">
                مجموع نامه‌ها: {formatNumber(filteredLetters.length)} عدد
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Expanded Center Ring Pie Chart */}
            <div className="lg:col-span-6 h-80 sm:h-96 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={selectedUnits.length === 1 && singleUnitActionPieData.length > 0 ? singleUnitActionPieData : allUnitsPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={135}
                    paddingAngle={selectedUnits.length === 1 ? 4 : 2}
                    dataKey="count"
                    nameKey="name"
                    label={renderActionPieLabel}
                    labelLine={false}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      const target = entry?.name || entry?.payload?.name;
                      if (selectedUnits.length === 1) {
                        const act = (target === 'حذف' || entry?.actionType === 'حذف' || target?.includes?.('حذف')) ? 'حذف' : 'ویرایش';
                        setSelectedActionType(prev => (prev === act ? 'all' : act));
                        setCurrentPage(1);
                        scrollToTable();
                      } else if (target) {
                        setSelectedUnits(prev =>
                          prev.includes(target) ? prev.filter(u => u !== target) : [...prev, target]
                        );
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    }}
                  >
                    {(selectedUnits.length === 1 && singleUnitActionPieData.length > 0 ? singleUnitActionPieData : allUnitsPieData).map((entry: any, index) => {
                      if (selectedUnits.length === 1) {
                        const isDelete = entry.name === 'حذف' || entry.actionType === 'حذف';
                        return (
                          <Cell
                            key={`full-action-cell-${index}`}
                            fill={isDelete ? '#DC2626' : '#16A34A'}
                            stroke="#FFFFFF"
                            strokeWidth={2.5}
                          />
                        );
                      }
                      const isSelected = selectedUnits.includes(entry.name);
                      return (
                        <Cell
                          key={`full-pie-cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke={isSelected ? '#1E40AF' : '#FFFFFF'}
                          strokeWidth={isSelected ? 4 : 1.5}
                          opacity={selectedUnits.length === 0 || isSelected ? 1 : 0.4}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={<CustomPieTooltip />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                    offset={18}
                    isAnimationActive={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {selectedUnits.length === 1 ? (
                  <>
                    <span className="text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] mb-1">
                      واحد فیلترشده
                    </span>
                    <span className="text-sm font-black text-[#0F172A] max-w-[180px] truncate" title={selectedUnits[0]}>
                      {selectedUnits[0]}
                    </span>
                    <span className="text-sm font-black text-[#475569] mt-0.5">
                      {formatNumber(filteredLetters.length)} نامه
                    </span>
                    <span className="text-[10px] font-extrabold text-[#991B1B] mt-1">
                      قرمز: حذف | سبز: ویرایش
                    </span>
                  </>
                ) : selectedUnits.length > 1 ? (
                  <>
                    <span className="text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] mb-1">
                      {selectedUnits.length} واحد انتخاب‌شده
                    </span>
                    <span className="text-xl font-black text-[#2D2C28]">{formatNumber(filteredLetters.length)}</span>
                    <span className="text-[10px] text-[#545D4B] font-bold">مجموع مکاتبات</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-[#75746E] font-medium">مجموع داده</span>
                    <span className="text-xl font-black text-[#2D2C28]">{formatNumber(filteredLetters.length)}</span>
                    <span className="text-[10px] text-[#545D4B] font-bold">{allUnitsPieData.length} واحد</span>
                  </>
                )}
              </div>
            </div>

            {/* Detailed Unit Distribution Table & Cards */}
            <div className="lg:col-span-6 space-y-3">
              {selectedUnits.length === 1 && selectedUnitStats ? (
                <div className="space-y-4">
                  <div
                    onClick={() => {
                      setSelectedActionType(prev => (prev === 'حذف' ? 'all' : 'حذف'));
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                      selectedActionType === 'حذف'
                        ? 'bg-[#FEF2F2] border-[#DC2626] ring-2 ring-[#DC2626]/30'
                        : 'bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] border-[#FECACA]'
                    }`}
                    title="کلیک برای فیلتر جدول فقط روی نامه‌های حذف"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#DC2626] ring-2 ring-white" />
                      <div>
                        <span className="text-sm font-black text-[#991B1B] block">نامه‌های حذف (قرمز)</span>
                        <span className="text-xs text-[#B91C1C]">درخواست‌های لغو و حذف اسناد</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-2xl font-black text-[#991B1B] block">{selectedUnitStats.deleteRate}%</span>
                      <span className="text-xs font-bold text-[#B91C1C]">{formatNumber(selectedUnitStats.deletes)} نامه</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedActionType(prev => (prev === 'ویرایش' ? 'all' : 'ویرایش'));
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                      selectedActionType === 'ویرایش'
                        ? 'bg-[#F0FDF4] border-[#16A34A] ring-2 ring-[#16A34A]/30'
                        : 'bg-[#F0FDF4]/60 hover:bg-[#F0FDF4] border-[#BBF7D0]'
                    }`}
                    title="کلیک برای فیلتر جدول فقط روی نامه‌های ویرایش"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#16A34A] ring-2 ring-white" />
                      <div>
                        <span className="text-sm font-black text-[#166534] block">نامه‌های ویرایش (سبز)</span>
                        <span className="text-xs text-[#15803D]">درخواست‌های اصلاح و تغییر اسناد</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-2xl font-black text-[#166534] block">{selectedUnitStats.editRate}%</span>
                      <span className="text-xs font-bold text-[#15803D]">{formatNumber(selectedUnitStats.edits)} نامه</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedUnits([]);
                      setCurrentPage(1);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-[#475569] hover:text-[#0F172A] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-4 h-4 text-[#64748B]" />
                    <span>بازگشت به نمایش تمامی واحدهای سازمانی</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-[#75746E] px-1 font-bold border-b border-[#E8E6DF] pb-2">
                    <span>واحد سازمانی</span>
                    <div className="flex items-center gap-6">
                      <span>تعداد (درصد)</span>
                      <span>تفکیک حذف / ویرایش</span>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {allUnitsPieData.map((item, idx) => {
                      const isSelected = selectedUnits.includes(item.name);
                      return (
                        <div
                          key={item.name}
                          onClick={() => {
                            setSelectedUnits(prev =>
                              prev.includes(item.name) ? prev.filter(u => u !== item.name) : [...prev, item.name]
                            );
                            setCurrentPage(1);
                            scrollToTable();
                          }}
                          className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#EFF6FF] border-[#BFDBFE] ring-2 ring-[#2563EB]/30'
                              : 'bg-white hover:bg-[#F7F7F2] border-[#E2E0D8]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-[#2D2C28] truncate">{item.name}</p>
                              {item.bankCount > 0 && (
                                <span className="text-[10px] font-semibold text-[#1E40AF]">
                                  {formatNumber(item.bankCount)} نامه با عامل بانکی
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-left">
                              <span className="text-xs font-bold text-[#2D2C28]">
                                {formatNumber(item.count)} نامه
                              </span>
                              <span className="text-[10px] text-[#75746E] mr-1">({item.percentage}%)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold">
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA]" title={`حذف: ${formatNumber(item.deletes)}`}>
                                <Trash2 className="h-3 w-3 shrink-0" />
                                <span>{formatNumber(item.deletes)}</span>
                              </span>
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EDF2EB] text-[#446347] border border-[#D4DFD1]" title={`ویرایش: ${formatNumber(item.edits)}`}>
                                <Edit3 className="h-3 w-3 shrink-0" />
                                <span>{formatNumber(item.edits)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Width Mode 2: Comprehensive Bar Chart View with Deletion Rates & Detailed Units */}
      {chartViewMode === 'bar' && (
        <div className="bg-[#FAFAF7] rounded-3xl p-6 sm:p-8 border border-[#E2E0D8] shadow-xs space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D2C28] flex items-center gap-2">
                  <span>
                    {selectedUnits.length === 1
                      ? `تحلیل تمام‌عرض روند ماهانه حذف و ویرایش: ${selectedUnits[0]}`
                      : selectedUnits.length > 1
                      ? `تحلیل تمام‌عرض مقایسه‌ای: ${selectedUnits.length} واحد منتخب`
                      : 'تحلیل تمام‌عرض مقایسه‌ای حذف و ویرایش بر اساس واحد'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA]">
                    {selectedUnits.length === 1
                      ? `واحد ${selectedUnits[0]}`
                      : selectedUnits.length > 1
                      ? `${selectedUnits.length} واحد منتخب`
                      : `${unitBarData.length} واحد فعال`}
                  </span>
                </h3>
                <p className="text-xs text-[#75746E]">
                  {selectedUnits.length === 1
                    ? `بررسی جزئیات آماری و روند زمانی درخواست‌ها در ماه‌های سال برای واحد ${selectedUnits[0]}`
                    : selectedUnits.length > 1
                    ? `بررسی جزئیات آماری، نرخ حذف به ویرایش برای ${selectedUnits.length} واحد انتخاب‌شده`
                    : 'بررسی جزئیات آماری، نرخ حذف به ویرایش و توزیع فراوانی مکاتبات برای تمامی واحدهای سازمانی'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#9C3A27] bg-[#FAECE8] px-3 py-1 rounded-xl border border-[#F2D1CA]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9C3A27]" />
                نامه‌های حذف ({formatNumber(filteredMetrics.deletes)})
              </span>
              <span className="flex items-center gap-1.5 text-[#545D4B] bg-[#EDF2EB] px-3 py-1 rounded-xl border border-[#D4DFD1]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#545D4B]" />
                نامه‌های ویرایش ({formatNumber(filteredMetrics.edits)})
              </span>
            </div>
          </div>

          {/* Full-width Bar Chart with ample height */}
          <div className="h-[520px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(selectedUnits.length === 1 ? monthlyTrendData : unitBarData) as any[]}
                margin={{ top: 20, right: 20, left: 10, bottom: 105 }}
                className="cursor-pointer"
                onClick={(state: any) => {
                  if (selectedUnits.length === 1) {
                    const item = state?.activePayload?.[0]?.payload || state?.payload;
                    const monthVal = item?.month;
                    if (monthVal && typeof monthVal === 'string') {
                      setSelectedMonth(prev => (prev === monthVal ? 'all' : monthVal));
                      setCurrentPage(1);
                      scrollToTable();
                    }
                  } else {
                    const unitName = state?.activeLabel || state?.activePayload?.[0]?.payload?.unit || state?.payload?.unit;
                    if (unitName && typeof unitName === 'string') {
                      setSelectedUnits(prev =>
                        prev.includes(unitName) ? prev.filter(u => u !== unitName) : [unitName]
                      );
                      setCurrentPage(1);
                      scrollToTable();
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6DF" />
                <XAxis
                  dataKey={selectedUnits.length === 1 ? 'monthLabel' : 'unit'}
                  height={105}
                  interval={0}
                  tick={renderRotatedUnitTick}
                  tickLine={{ stroke: '#DDDBCF' }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  width={36}
                  tick={{ fill: '#75746E', fontSize: 11 }}
                  tickLine={{ stroke: '#DDDBCF' }}
                  stroke="#CBD5E1"
                  axisLine={{ stroke: '#DDDBCF' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                  offset={18}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="deletes"
                  name="deletes"
                  fill="#9C3A27"
                  radius={[6, 6, 0, 0]}
                  barSize={selectedUnits.length === 1 ? 24 : 22}
                  className="cursor-pointer transition-opacity hover:opacity-85"
                  onClick={(entry: any) => {
                    if (selectedUnits.length === 1) {
                      const m = entry?.month || entry?.payload?.month;
                      if (m && typeof m === 'string') {
                        setSelectedMonth(prev => (prev === m ? 'all' : m));
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    } else {
                      const u = entry?.unit || entry?.payload?.unit;
                      if (u && typeof u === 'string') {
                        setSelectedUnits(prev =>
                          prev.includes(u) ? prev.filter(x => x !== u) : [u]
                        );
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    }
                  }}
                />
                <Bar
                  dataKey="edits"
                  name="edits"
                  fill="#545D4B"
                  radius={[6, 6, 0, 0]}
                  barSize={selectedUnits.length === 1 ? 24 : 22}
                  className="cursor-pointer transition-opacity hover:opacity-85"
                  onClick={(entry: any) => {
                    if (selectedUnits.length === 1) {
                      const m = entry?.month || entry?.payload?.month;
                      if (m && typeof m === 'string') {
                        setSelectedMonth(prev => (prev === m ? 'all' : m));
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    } else {
                      const u = entry?.unit || entry?.payload?.unit;
                      if (u && typeof u === 'string') {
                        setSelectedUnits(prev =>
                          prev.includes(u) ? prev.filter(x => x !== u) : [u]
                        );
                        setCurrentPage(1);
                        scrollToTable();
                      }
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Matrix Cards for Units */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-[#E8E6DF]">
            {unitBarData.slice(0, 6).map((item, idx) => {
              const isSelected = selectedUnits.includes(item.unit);
              return (
                <div
                  key={item.unit}
                  onClick={() => {
                    setSelectedUnits(prev =>
                      prev.includes(item.unit) ? prev.filter(u => u !== item.unit) : [...prev, item.unit]
                    );
                    setCurrentPage(1);
                    scrollToTable();
                  }}
                  className={`bg-white p-3 rounded-2xl border transition cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-[#1E40AF] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40'
                      : 'border-[#E2E0D8] hover:border-[#545D4B]'
                  }`}
                >
                  <span className="text-[10px] font-bold text-[#75746E] block mb-1">رتبه #{idx + 1}</span>
                  <p className="text-xs font-bold text-[#2D2C28] truncate mb-2">{item.unit}</p>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-[#75746E]">
                      <span>کل:</span>
                      <span className="font-bold text-[#2D2C28]">{formatNumber(item.total)}</span>
                    </div>
                    <div className="flex justify-between text-[#9C3A27]">
                      <span>حذف:</span>
                      <span className="font-bold">{formatNumber(item.deletes)}</span>
                    </div>
                    <div className="flex justify-between text-[#545D4B]">
                      <span>ویرایش:</span>
                      <span className="font-bold">{formatNumber(item.edits)}</span>
                    </div>
                    <div className="flex justify-between text-[#1E40AF] pt-1 border-t border-[#F0EFEA]">
                      <span>درصد حذف:</span>
                      <span className="font-bold">{item.deleteRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Letters List Table - Placed immediately after Pie & Bar charts for fast audit on filter */}
      <div id="letters-data-table-section" className="bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#2D2C28]">
                لیست کامل مکاتبات ثبت شده
              </h3>
              {selectedUnits.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUnits.length === 1) {
                      onToggleUnitCauseVisibility?.(selectedUnits[0], !isCauseColumnVisible);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isCauseColumnVisible
                      ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE] hover:bg-[#DBEAFE]'
                      : 'bg-[#F2F1EB] text-[#75746E] border-[#DDDBCF] hover:bg-[#EAE8DE]'
                  }`}
                  title={selectedUnits.length === 1 ? `کلیک کنید تا نمایش ستون عامل برای واحد ${selectedUnits[0]} تغییر کند` : 'وضعیت ستون عامل'}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>
                    ستون عامل ({selectedUnits.length === 1 ? selectedUnits[0] : `${selectedUnits.length} واحد`}): {isCauseColumnVisible ? 'نمایش داده می‌شود' : 'مخفی است'}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] text-[#75746E] bg-[#EFEFEA] px-2 py-0.5 rounded-lg border border-[#DDDBCF]">
                  {isCauseColumnVisible ? 'نمایش ستون عامل فعال' : 'ستون عامل مخفی'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#75746E] mt-0.5">
              مشاهده سوابق و جزئیات ارجاعات با تفکیک نوع{isCauseColumnVisible ? '، عامل' : ''}، واحد و شخص
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#75746E] font-medium">
            {filterExecutionMode === 'server' && (
              <span className="bg-[#EBF3ED] text-[#2E462C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C5D8C1] flex items-center gap-1">
                <Database className="h-3 w-3 text-[#2E462C]" />
                <span>کوئری دیتابیس</span>
                {serverExecutionTimeMs > 0 && <span className="font-mono text-[9px]">({serverExecutionTimeMs}ms)</span>}
              </span>
            )}
            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="flex items-center gap-1 text-[11px] font-bold text-[#1E40AF] hover:underline cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>تنظیمات ستون عامل</span>
              </button>
            )}
            <span>
              نمایش {formatNumber(effectiveTotalLetters > 0 ? (currentPage - 1) * pageSize + 1 : 0)} تا {formatNumber(Math.min(currentPage * pageSize, effectiveTotalLetters))} از {formatNumber(effectiveTotalLetters)} مورد
            </span>
          </div>
        </div>

        {/* Dedicated Filter Row Directly Above Letters Table */}
        <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#DDDBCF] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2 font-bold text-[#2D2C28]">
              <SlidersHorizontal className="h-4 w-4 text-[#545D4B]" />
              <span>پالایش و فیلتر ردیف‌های جدول مکاتبات</span>
              {filterExecutionMode === 'server' && (
                <span className="bg-[#EBF3ED] text-[#2E462C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C5D8C1] flex items-center gap-1">
                  <Database className="h-2.5 w-2.5" />
                  <span>موتور پایگاه داده SQLite سرور</span>
                </span>
              )}
              {activeFiltersCount > 0 && (
                <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                  {activeFiltersCount} فیلتر فعال
                </span>
              )}
              {showExcludedOnly && (
                <span className="bg-[#FAECE8] text-[#9C3A27] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#F2D1CA]">
                  فقط نامه‌های تستی و مستثنی شده
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#75746E] font-medium">
                نمایش {formatNumber(effectiveTotalLetters)} از {formatNumber(letters.length)} مکاتبه
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] text-[#9C3A27] hover:text-[#8A2E1D] font-bold px-2.5 py-1 rounded-lg hover:bg-[#FAECE8] transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>حذف تمام فیلترها</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. Search Query */}
            <div className="relative">
              <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#8A8880]" />
              <input
                type="text"
                placeholder="جستجو در موضوع، شماره، شخص..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#DDDBCF] rounded-xl pr-8 pl-7 py-1.5 text-xs text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-2 focus:ring-[#545D4B] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-[#8A8880] hover:text-[#2D2C28]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* 2. Unit Dropdown (Multi-select) */}
            <div className="relative">
              <MultiSelectDropdown
                id="table-filter-org-units-multi"
                options={allUnits}
                selectedValues={selectedUnits}
                onChange={vals => {
                  setSelectedUnits(vals);
                  setCurrentPage(1);
                }}
                placeholder="واحد سازمانی..."
                allLabel="همه واحدهای سازمانی"
                showCounts={true}
                countsMap={unitCountsMap}
                compact={true}
              />
            </div>

            {/* 3. Action Type */}
            <div className="relative">
              <select
                value={selectedActionType}
                onChange={e => setSelectedActionType(e.target.value)}
                className="w-full bg-white border border-[#DDDBCF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2C28] font-medium focus:outline-none focus:ring-2 focus:ring-[#545D4B] cursor-pointer"
              >
                <option value="all">تمام انواع (حذف و ویرایش)</option>
                <option value="حذف">فقط حذف‌ها ({formatNumber(grandTotalDeletes)})</option>
                <option value="ویرایش">فقط ویرایش‌ها ({formatNumber(grandTotalEdits)})</option>
              </select>
            </div>

            {/* 4. Cause / Origin */}
            <div className="relative">
              <select
                value={selectedCause}
                onChange={e => setSelectedCause(e.target.value)}
                className="w-full bg-white border border-[#DDDBCF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2C28] font-medium focus:outline-none focus:ring-2 focus:ring-[#545D4B] cursor-pointer"
              >
                <option value="all">تمام عوامل و منشأها</option>
                {allCauses.map(cause => (
                  <option key={cause} value={cause}>
                    عامل: {cause}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Month Selection */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-white border border-[#DDDBCF] rounded-xl px-2.5 py-1.5 text-xs text-[#2D2C28] font-medium focus:outline-none focus:ring-2 focus:ring-[#545D4B] cursor-pointer"
              >
                <option value="all">همه ماه‌ها ({allMonths.length})</option>
                {allMonths.map(month => (
                  <option key={month} value={month}>
                    ماه: {PERSIAN_MONTH_NAMES[month] || month}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#DDDBCF] relative min-h-[160px]">
          {filterExecutionMode === 'server' && serverLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 gap-2">
              <Loader2 className="h-6 w-6 text-[#545D4B] animate-spin" />
              <span className="text-xs font-bold text-[#545D4B]">در حال واکشی اطلاعات از پایگاه داده سرور...</span>
            </div>
          )}
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#EBEBE6] text-[#2D2C28] font-bold border-b border-[#DDDBCF]">
                <th className="py-3 px-3 text-center w-16">شناسه</th>
                <th className="py-3 px-3 w-28">نوع مکاتبه</th>
                {isCauseColumnVisible && (
                  <th className="py-3 px-3 w-28">عامل (منشأ)</th>
                )}
                <th className="py-3 px-3 min-w-[220px]">موضوع نامه</th>
                <th className="py-3 px-3 min-w-[140px]">واحد سازمانی</th>
                <th className="py-3 px-3 min-w-[150px]">ایجاد کننده</th>
                <th className="py-3 px-3 w-28 text-center">تاریخ</th>
                <th className="py-3 px-3 w-24 text-center">وضعیت</th>
                <th className="py-3 px-3 text-center w-20">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6DF]">
              {displayedLetters.length === 0 ? (
                <tr>
                  <td colSpan={isCauseColumnVisible ? 9 : 8} className="py-8 text-center text-[#8A8880] font-medium">
                    هیچ نامه‌ای با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                displayedLetters.map((l, index) => {
                  const isDel = l.actionType === 'حذف';
                  const isBank = l.cause === 'بانکی';
                  return (
                    <tr
                      key={`letter-row-${l.id || index}-${index}`}
                      className="hover:bg-[#F5F5F0] transition-colors group cursor-pointer"
                      onClick={() => setSelectedLetter(l)}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-[#75746E]">
                        {l.letterId ?? l.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isDel
                            ? 'bg-[#FAECE8] text-[#8A2E1D] border border-[#F2D1CA]'
                            : 'bg-[#EDF2EB] text-[#2E462C] border border-[#D4DFD1]'
                        }`}>
                          {isDel ? <Trash2 className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                          {l.actionType}
                        </span>
                      </td>
                      {/* Cause Column - Conditionally Rendered */}
                      {isCauseColumnVisible && (
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] text-white shadow-2xs"
                            style={{ backgroundColor: l.causeColor || (isBank ? '#2563EB' : '#6B7280') }}
                          >
                            {l.cause || 'نامشخص'}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-semibold text-[#2D2C28]">
                        <div className="line-clamp-1">{l.subject}</div>
                      </td>
                      {(() => {
                        const parsedCreator = resolveLetterCreatorAndUnit(l);
                        return (
                          <>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-[#2D2C28] bg-[#EFEFEA] px-2 py-0.5 rounded-md border border-[#DDDBCF]">
                                {parsedCreator.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#5A5852] truncate max-w-[160px]" title={l.creatorRaw || (parsedCreator.role ? `${parsedCreator.name} (${parsedCreator.role})` : parsedCreator.name)}>
                              {parsedCreator.name} {parsedCreator.role ? `(${parsedCreator.role})` : ''}
                            </td>
                          </>
                        );
                      })()}
                      <td className="py-2.5 px-3 text-center font-mono text-[#5A5852]">
                        {l.dateStr}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[11px] text-[#5A5852] bg-[#EFEFEA] px-2 py-0.5 rounded border border-[#DDDBCF]">
                          {l.status || 'ثبت شده'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLetter(l);
                          }}
                          className="p-1.5 rounded-lg text-[#8A8880] hover:text-[#545D4B] hover:bg-[#EFEFEA] transition"
                          title="مشاهده جزئیات"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {effectiveTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#75746E]">
              صفحه {formatNumber(currentPage)} از {formatNumber(effectiveTotalPages)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-[#DDDBCF] text-[#5A5852] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 text-xs font-semibold">
                {Array.from({ length: Math.min(5, effectiveTotalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (effectiveTotalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > effectiveTotalPages) pageNum = effectiveTotalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#545D4B] text-white font-bold shadow-xs'
                          : 'text-[#5A5852] hover:bg-[#EFEFEA]'
                      }`}
                    >
                      {formatNumber(pageNum)}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(effectiveTotalPages, p + 1))}
                disabled={currentPage === effectiveTotalPages}
                className="p-2 rounded-xl border border-[#DDDBCF] text-[#5A5852] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Trend Timeline Chart */}
      <div className="bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EBF2F2] text-[#436465] border border-[#D8E3E3]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2D2C28]">
                روند زمانی مکاتبات در ماه‌های مختلف
              </h3>
              <p className="text-[11px] text-[#75746E]">
                پایش حجم تغییرات، حذف‌ها و ویرایش‌ها در طول زمان
              </p>
            </div>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="deleteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9C3A27" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#9C3A27" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="editGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#545D4B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#545D4B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6DF" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#75746E', fontSize: 11 }} />
              <YAxis tick={{ fill: '#75746E', fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${formatNumber(value)} نامه`,
                  name === 'deletes' ? 'حذف' : 'ویرایش'
                ]}
                contentStyle={{
                  backgroundColor: '#2D2C28',
                  color: '#F5F5F0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid #44423C',
                  direction: 'rtl'
                }}
              />
              <Area type="monotone" dataKey="deletes" name="deletes" stroke="#9C3A27" strokeWidth={2.5} fillOpacity={1} fill="url(#deleteGrad)" />
              <Area type="monotone" dataKey="edits" name="edits" stroke="#545D4B" strokeWidth={2.5} fillOpacity={1} fill="url(#editGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Matrix Table Component */}
      <MonthlyMatrixTable
        unitStats={unitStats}
        allMonths={allMonths}
        grandTotalDeletes={grandTotalDeletes}
        grandTotalEdits={grandTotalEdits}
        grandTotalLetters={grandTotalLetters}
        selectedMonth={selectedMonth !== 'all' ? selectedMonth : undefined}
        onSelectUnit={u => {
          setSelectedUnits(prev =>
            prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
          );
          setCurrentPage(1);
        }}
      />

      {/* Letter Detail Modal */}
      <LetterDetailModal
        letter={selectedLetter}
        onClose={() => setSelectedLetter(null)}
      />

      {/* Gemini AI Bar Chart Analysis Modal */}
      <AiChartAnalysisModal
        isOpen={isAiChartModalOpen}
        onClose={() => setIsAiChartModalOpen(false)}
        chartType="letters"
        chartData={unitBarData}
        appliedFilters={{
          unit: selectedUnits.join(', ') || 'all',
          month: selectedMonth,
          actionType: selectedActionType,
          cause: selectedCause,
          searchQuery
        }}
        metrics={{
          totalItems: filteredLetters.length,
          deletes: filteredMetrics.deletes,
          edits: filteredMetrics.edits,
          uniqueUnits: selectedUnits.length || unitStats.length
        }}
      />
    </div>
  );
};

