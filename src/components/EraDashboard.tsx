import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { ProcessedEraItem, EraVisibilitySettings, EraColumnVisibility } from '../types';
import { MetricCard } from './MetricCard';
import { EraFormModal } from './EraFormModal';
import { ProcessPresentationModal } from './ProcessPresentationModal';
import { SlideshowView } from './SlideshowView';
import { EraSlideHoverPreview } from './EraSlideHoverPreview';
import { AiChartAnalysisModal } from './AiChartAnalysisModal';
import { JalaliDateInput } from './JalaliDateInput';
import { formatNumber, processRawEraItems, isDateInRange, parsePersianDate, getCurrentJalaliDate, getJalaliMonthsAgo, PERSIAN_MONTHS_LIST } from '../utils/parser';
import { downloadPresentationHtml } from '../utils/htmlExport';
import { api, EraServerFilterResponse } from '../services/api';
import {
  Workflow,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Sparkles,
  Layers,
  Building2,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Presentation,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Image as ImageIcon,
  Sliders,
  Check,
  Play,
  FileCode,
  ChevronDown,
  X,
  Database,
  Zap,
  Server,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { BpmnDesignerModal } from './BpmnDesignerModal';

interface EraDashboardProps {
  eraItems: ProcessedEraItem[];
  onAddEraItem: (item: Partial<ProcessedEraItem>) => void;
  onUpdateEraItem: (item: Partial<ProcessedEraItem>) => void;
  onDeleteEraItem: (id: string) => void;
  onSaveBpmn?: (itemId: string, bpmnXml: string, bpmnSvg?: string) => Promise<void> | void;
  onGoToSlideshow?: () => void;
  onToggleSlide?: (id: string) => void;
  onBatchUpdateSlideSelection?: (itemIds: string[], isSelected: boolean) => void;
  filterExecutionMode?: 'client' | 'server';
  eraVisibility?: EraVisibilitySettings;
  onToggleEraVisibility?: (key: keyof EraVisibilitySettings, val: boolean) => void;
  onToggleEraColumnVisibility?: (colKey: keyof EraColumnVisibility, val: boolean) => void;
  onSetAllEraColumnsVisibility?: (val: boolean) => void;
  onResetEraColumnsVisibility?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenGeneralAiChat?: (initialQuestion?: string) => void;
}

const ERA_COLORS = ['#545D4B', '#446347', '#8A6224', '#436465', '#9C3A27', '#6B5A4E', '#736B48', '#7A786C'];

export const EraDashboard: React.FC<EraDashboardProps> = ({
  eraItems,
  onAddEraItem,
  onUpdateEraItem,
  onDeleteEraItem,
  onSaveBpmn,
  onGoToSlideshow,
  onToggleSlide,
  onBatchUpdateSlideSelection,
  filterExecutionMode = 'server',
  eraVisibility = { showHeader: false, showMetrics: false, showEntityChips: false, autoScrollToTable: false, slideBeforeAfterUnderImage: true },
  onToggleEraVisibility,
  onToggleEraColumnVisibility,
  onSetAllEraColumnsVisibility,
  onResetEraColumnsVisibility,
  onOpenSettingsModal,
  onOpenGeneralAiChat
}) => {
  const isColVisible = (colKey: keyof EraColumnVisibility) => {
    if (!eraVisibility?.columnVisibility) return true;
    return eraVisibility.columnVisibility[colKey] !== false;
  };

  const visibleColCount = useMemo(() => {
    const allKeys: (keyof EraColumnVisibility)[] = [
      'index',
      'processName',
      'entityType',
      'orgUnit',
      'executionDate',
      'operationType',
      'status',
      'description',
      'bpmn',
      'slideFullscreen',
      'slideToggle',
      'actions'
    ];
    return allKeys.filter(k => isColVisible(k)).length;
  }, [eraVisibility?.columnVisibility]);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedOpType, setSelectedOpType] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState<boolean>(false);
  const [isChartDateFilterOpen, setIsChartDateFilterOpen] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const dateFilterRef = useRef<HTMLTableHeaderCellElement>(null);
  const chartDateFilterRef = useRef<HTMLDivElement>(null);
  const curJalali = useMemo(() => getCurrentJalaliDate(), []);
  const [chartGroupBy, setChartGroupBy] = useState<'operation' | 'entity'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('era_chart_group_by') as any) || 'operation';
    }
    return 'operation';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [slideFilter, setSlideFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProcessedEraItem | null>(null);
  const [presentationItem, setPresentationItem] = useState<ProcessedEraItem | null>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [viewingFullscreenSlideItem, setViewingFullscreenSlideItem] = useState<ProcessedEraItem | null>(null);
  const [isAiChartModalOpen, setIsAiChartModalOpen] = useState<boolean>(false);
  const [activeBpmnItem, setActiveBpmnItem] = useState<ProcessedEraItem | null>(null);
  const [isBpmnModalOpen, setIsBpmnModalOpen] = useState<boolean>(false);
  const [bpmnFilter, setBpmnFilter] = useState<'all' | 'with-bpmn' | 'without-bpmn'>('all');

  // Slide Hover Popup Preview Settings (Controlled via Settings Modal) & Hover State
  const isSlideHoverPreviewEnabled = eraVisibility?.slideHoverPreview ?? false;
  const [hoveredSlideItem, setHoveredSlideItem] = useState<ProcessedEraItem | null>(null);
  const hoverOpenTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSlideButtonMouseEnter = (item: ProcessedEraItem) => {
    if (!isSlideHoverPreviewEnabled) return;
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
    }
    // Small debounce (120ms) so accidentally passing mouse over button doesn't abruptly pop up
    hoverOpenTimerRef.current = setTimeout(() => {
      setHoveredSlideItem(item);
    }, 120);
  };

  const handleSlideButtonMouseLeave = () => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  };

  // Close date popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Do NOT close if clicking inside Jalali datepicker popup elements
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

      if (isJdpElement) {
        return;
      }

      if (dateFilterRef.current && !dateFilterRef.current.contains(target)) {
        setIsDateFilterOpen(false);
      }
      if (chartDateFilterRef.current && !chartDateFilterRef.current.contains(target)) {
        setIsChartDateFilterOpen(false);
      }
    }
    if (isDateFilterOpen || isChartDateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDateFilterOpen, isChartDateFilterOpen]);

  // Smooth scroll helper to navigate user smoothly down to the data table when filtering from charts
  const scrollToTable = () => {
    if (!eraVisibility?.autoScrollToTable) {
      return;
    }
    setTimeout(() => {
      const tableEl = document.getElementById('era-data-table-section');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleChartGroupByChange = (mode: 'operation' | 'entity') => {
    setChartGroupBy(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('era_chart_group_by', mode);
    }
  };

  // --- Server-Side Query & Pagination State ---
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverItems, setServerItems] = useState<ProcessedEraItem[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverPage, setServerPage] = useState<number>(1);
  const [serverPageSize, setServerPageSize] = useState<number>(15);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverExecutionTimeMs, setServerExecutionTimeMs] = useState<number>(0);
  const [serverStats, setServerStats] = useState<any>(null);
  const [serverTriggerCounter, setServerTriggerCounter] = useState<number>(0);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setServerPage(1);
  }, [selectedUnit, selectedOpType, selectedEntityType, slideFilter, debouncedSearchQuery, startDate, endDate, serverPageSize]);

  // Fetch from server when in server mode
  useEffect(() => {
    if (filterExecutionMode !== 'server') return;

    let isMounted = true;
    const fetchServerFilteredData = async () => {
      setServerLoading(true);
      try {
        const response: EraServerFilterResponse = await api.getEraFiltered({
          unit: selectedUnit,
          opType: selectedOpType,
          entityType: selectedEntityType,
          status: selectedStatus,
          search: debouncedSearchQuery,
          startDate: startDate,
          endDate: endDate,
          slideFilter: slideFilter,
          page: serverPage,
          pageSize: serverPageSize
        });

        if (isMounted && response && Array.isArray(response.data)) {
          setServerItems(processRawEraItems(response.data));
          setServerTotal(response.total ?? response.data.length);
          setServerTotalPages(response.totalPages ?? 1);
          setServerExecutionTimeMs(response.executionTimeMs ?? 0);
          setServerStats(response.stats ?? null);
        }
      } catch (err) {
        console.warn('Server-side ERA filtering failed, fallbacking to client state:', err);
      } finally {
        if (isMounted) {
          setServerLoading(false);
        }
      }
    };

    fetchServerFilteredData();

    return () => {
      isMounted = false;
    };
  }, [
    filterExecutionMode,
    selectedUnit,
    selectedOpType,
    selectedEntityType,
    selectedStatus,
    slideFilter,
    debouncedSearchQuery,
    startDate,
    endDate,
    serverPage,
    serverPageSize,
    serverTriggerCounter
  ]);

  // Trigger server refetch when raw era items change in parent
  useEffect(() => {
    if (filterExecutionMode === 'server') {
      setServerTriggerCounter(c => c + 1);
    }
  }, [eraItems.length, filterExecutionMode]);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  const handleExportHtml = (mode: 'selected' | 'all') => {
    setIsExportMenuOpen(false);
    if (eraItems.length === 0) {
      alert('هیچ فرآیندی در سامانه ERA ثبت نشده است.');
      return;
    }
    const slideItems = eraItems.filter(it => it.isSelectedForSlide);
    if (mode === 'selected' && slideItems.length === 0) {
      alert('هیچ اسلایدی فعال یا انتخاب نشده است. می‌توانید گزینه «همه اسلایدها» را انتخاب نمایید.');
      return;
    }
    try {
      downloadPresentationHtml(eraItems, mode);
    } catch (err: any) {
      console.error('Failed to export HTML:', err);
      alert(err?.message || 'خطا در ایجاد فایل HTML ارائه');
    }
  };

  const handleOpenPresentation = (item: ProcessedEraItem) => {
    setPresentationItem(item);
    setIsPresentationOpen(true);
  };

  // Distinct unit list
  const allUnits = useMemo(() => {
    const units = Array.from(new Set(eraItems.map(item => item.orgUnit).filter(Boolean)));
    return units.sort();
  }, [eraItems]);

  // Unit process counts map
  const unitCountsMap = useMemo(() => {
    const map: Record<string, number> = { all: eraItems.length };
    eraItems.forEach(item => {
      if (item.orgUnit) {
        map[item.orgUnit] = (map[item.orgUnit] || 0) + 1;
      }
    });
    return map;
  }, [eraItems]);

  // Distinct process names
  const allProcesses = useMemo(() => {
    const proc = Array.from(new Set(eraItems.map(item => item.processName).filter(Boolean)));
    return proc.sort();
  }, [eraItems]);

  // Distinct years available in dataset
  const allYears = useMemo(() => {
    const years = new Set<string>();
    eraItems.forEach(it => {
      if (it.year) years.add(it.year);
      else if (it.executionDate) {
        const p = parsePersianDate(it.executionDate);
        if (p.year) years.add(p.year);
      }
    });
    return Array.from(years).filter(Boolean).sort().reverse();
  }, [eraItems]);

  // Filtered ERA items (Filters apply to charts, cards and table lists)
  const filteredItems = useMemo(() => {
    const norm = (s?: string | null) => (s || '').replace(/\u200C/g, ' ').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();

    return eraItems.filter(item => {
      if (selectedUnit !== 'all') {
        const uQuery = norm(selectedUnit);
        const itemUnit = norm(item.orgUnit);
        if (itemUnit !== uQuery && !itemUnit.includes(uQuery) && !uQuery.includes(itemUnit)) {
          return false;
        }
      }
      if (selectedOpType !== 'all') {
        const opQuery = norm(selectedOpType);
        const itemOp = norm(item.operationType);
        if (opQuery === 'اتوماتیک سازی' || opQuery === 'اتوماتیک‌سازی' || opQuery === 'اتوماتیک') {
          if (!itemOp.includes('اتوماتیک') && !itemOp.includes('اتوماسیون')) return false;
        } else if (itemOp !== opQuery) {
          return false;
        }
      }
      if (selectedEntityType !== 'all' && norm(item.entityType || 'فرآیند') !== norm(selectedEntityType)) {
        return false;
      }
      if (selectedStatus !== 'all') {
        const itemStatus = item.status || 'انجام شده';
        if (itemStatus !== selectedStatus) {
          return false;
        }
      }
      if (slideFilter === 'selected' && !item.isSelectedForSlide) {
        return false;
      }
      if (slideFilter === 'unselected' && item.isSelectedForSlide) {
        return false;
      }
      if (startDate || endDate) {
        if (!isDateInRange(item.executionDate, startDate, endDate)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = norm(searchQuery);
        const mName = norm(item.processName).includes(q);
        const mUnit = norm(item.orgUnit).includes(q);
        const mDesc = norm(item.description).includes(q);
        const mDate = item.executionDate.includes(q);
        const mEntity = norm(item.entityType || '').includes(q);
        const mOp = norm(item.operationType || '').includes(q);
        const mStatus = norm(item.status || 'انجام شده').includes(q);
        const mProblem = norm(item.problemDescription || '').includes(q);
        const mSolution = norm(item.solutionDescription || '').includes(q);
        const mAchStr = Array.isArray(item.achievements) ? item.achievements.join(' ') : (item.achievements || '');
        const mAch = norm(mAchStr).includes(q);
        if (!mName && !mUnit && !mDesc && !mDate && !mEntity && !mOp && !mStatus && !mProblem && !mSolution && !mAch) return false;
      }
      if (bpmnFilter === 'with-bpmn' && !item.hasBpmn && !item.bpmnXml) {
        return false;
      }
      if (bpmnFilter === 'without-bpmn' && (item.hasBpmn || item.bpmnXml)) {
        return false;
      }
      return true;
    });
  }, [eraItems, selectedUnit, selectedOpType, selectedEntityType, selectedStatus, slideFilter, startDate, endDate, searchQuery, bpmnFilter]);

  // BPMN counts for filter options
  const withBpmnCount = useMemo(() => {
    return eraItems.filter(item => Boolean(item.hasBpmn || item.bpmnXml)).length;
  }, [eraItems]);

  const withoutBpmnCount = useMemo(() => {
    return eraItems.filter(item => !item.hasBpmn && !item.bpmnXml).length;
  }, [eraItems]);

  // Status counts for filter options
  const todoCount = useMemo(() => {
    return eraItems.filter(item => (item.status || 'انجام شده') === 'برای انجام').length;
  }, [eraItems]);

  const inProgressCount = useMemo(() => {
    return eraItems.filter(item => (item.status || 'انجام شده') === 'درحال انجام').length;
  }, [eraItems]);

  const doneCount = useMemo(() => {
    return eraItems.filter(item => (item.status || 'انجام شده') === 'انجام شده').length;
  }, [eraItems]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return [
      selectedUnit !== 'all',
      selectedOpType !== 'all',
      selectedEntityType !== 'all',
      selectedStatus !== 'all',
      slideFilter !== 'all',
      bpmnFilter !== 'all',
      searchQuery.trim().length > 0,
      Boolean(startDate || endDate)
    ].filter(Boolean).length;
  }, [selectedUnit, selectedOpType, selectedEntityType, selectedStatus, slideFilter, bpmnFilter, searchQuery, startDate, endDate]);

  const handleResetAllFilters = () => {
    setSelectedUnit('all');
    setSelectedOpType('all');
    setSelectedEntityType('all');
    setSelectedStatus('all');
    setSlideFilter('all');
    setBpmnFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setTempStartDate('');
    setTempEndDate('');
    setIsDateFilterOpen(false);
  };

  // Count items with slide toggle enabled
  const slideSelectedCount = useMemo(() => {
    return eraItems.filter(it => it.isSelectedForSlide).length;
  }, [eraItems]);

  // Custom rotated tick for Era BarChart XAxis to cleanly place unit names comfortably below bars & support click-to-filter
  const renderRotatedEraUnitTick = (props: any) => {
    const { x, y, payload } = props;
    const rawVal = String(payload?.value || '');
    const displayText = rawVal;
    const isSelected = selectedUnit === rawVal;

    return (
      <g
        transform={`translate(${x},${y + 10}) rotate(-45)`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedUnit(prev => (prev === rawVal ? 'all' : rawVal));
          scrollToTable();
        }}
        className="cursor-pointer group"
      >
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="start"
          fill={isSelected ? '#1D4ED8' : '#4A4842'}
          fontSize={isSelected ? 12 : 11}
          fontWeight={isSelected ? 800 : 600}
          className="select-none transition-colors group-hover:fill-blue-600"
        >
          <title>{`کلیک برای فیلتر واحد سازمانی: ${rawVal}`}</title>
          {displayText} {isSelected ? '●' : ''}
        </text>
      </g>
    );
  };

  // High-contrast Custom Tooltip for Era Pie Chart (prevents collision with donut hole text)
  const CustomEraPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const val = Number(data.value || 0);
      const total = totalItems || 1;
      const pct = Math.round((val / total) * 100);
      const name = String(data.name || '');
      const color = data.payload?.color || (chartGroupBy === 'entity' ? '#0284C7' : '#545D4B');

      return (
        <div className="bg-[#0F172A] text-white border border-[#334155] shadow-2xl rounded-2xl p-3 text-right font-sans text-xs min-w-[200px] pointer-events-none select-none z-50">
          <div className="flex items-center justify-between gap-2 border-b border-[#334155] pb-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/80"
                style={{ backgroundColor: color }}
              />
              <span className="font-black text-white text-xs truncate">
                {name}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black border shrink-0 bg-slate-800 text-slate-200 border-slate-600">
              {pct}%
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
              <span className="text-[#94A3B8] text-[11px]">تعداد ثبت‌شده:</span>
              <span className="font-black text-white text-xs">
                {formatNumber(val)} مورد
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#1E293B] px-2.5 py-1.5 rounded-xl border border-[#334155]">
              <span className="text-[#94A3B8] text-[11px]">سهم از کل:</span>
              <span className="font-black text-xs text-amber-300">
                {pct}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Toggle single slide item strictly by item.id
  const handleToggleSlide = (item: ProcessedEraItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !item.isSelectedForSlide;

    // Optimistically update serverItems if in server mode so UI switch responds immediately
    if (filterExecutionMode === 'server') {
      setServerItems(prev => prev.map(si => (si.id === item.id || (si as any)._dbId === item.id) ? { ...si, isSelectedForSlide: nextVal } : si));
    }

    if (onToggleSlide) {
      onToggleSlide(item.id);
    } else {
      onUpdateEraItem({
        id: item.id,
        isSelectedForSlide: nextVal
      });
    }
  };

  // Select all / deselect all for slide
  const handleSelectAllForSlide = (enableAll: boolean) => {
    const currentList = filterExecutionMode === 'server' ? serverItems : filteredItems;
    const ids = currentList.map(it => it.id);

    if (filterExecutionMode === 'server') {
      setServerItems(prev => prev.map(si => ({ ...si, isSelectedForSlide: enableAll })));
    }

    if (onBatchUpdateSlideSelection) {
      onBatchUpdateSlideSelection(ids, enableAll);
    } else {
      currentList.forEach(it => {
        onUpdateEraItem({
          id: it.id,
          isSelectedForSlide: enableAll
        });
      });
    }
  };

  // Quick status update directly from table row
  const handleQuickStatusChange = async (item: ProcessedEraItem, newStatus: 'برای انجام' | 'درحال انجام' | 'انجام شده', e?: React.MouseEvent | React.ChangeEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    
    if (filterExecutionMode === 'server') {
      setServerItems(prev => prev.map(si => (si.id === item.id || (si as any)._dbId === item.id) ? { ...si, status: newStatus } : si));
    }

    onUpdateEraItem({
      id: item.id,
      status: newStatus
    });

    try {
      localStorage.setItem(`era_status_${item.id}`, newStatus);
      await api.updateEraStatus(item.id, newStatus);
    } catch (err) {
      console.warn('Could not update status via REST API:', err);
    }
  };

  // Metrics computation (reacts directly to active filters)
  const totalItems = filteredItems.length;
  const newFormsCount = filteredItems.filter(i => i.operationType === 'جدید').length;
  const modifiedFormsCount = filteredItems.filter(i => i.operationType === 'اصلاح').length;
  const automationFormsCount = filteredItems.filter(i => i.operationType === 'اتوماتیک‌سازی').length;
  
  const formsEntityCount = filteredItems.filter(i => (i.entityType || 'فرآیند') === 'فرم').length;
  const processesEntityCount = filteredItems.filter(i => (i.entityType || 'فرآیند') === 'فرآیند').length;
  const reportsEntityCount = filteredItems.filter(i => (i.entityType || 'فرآیند') === 'گزارش').length;

  const uniqueUnitsCount = new Set(filteredItems.map(i => i.orgUnit).filter(Boolean)).size;
  const itemsWithImagesCount = filteredItems.filter(i => {
    return (
      (i.formImages && i.formImages.length > 0) ||
      i.formImageUrl ||
      (typeof window !== 'undefined' && (localStorage.getItem(`era_form_img_${i.id}`) || localStorage.getItem(`era_form_imgs_${i.id}`)))
    );
  }).length;

  // Items for Bar Chart (Filtered by opType, entityType, slideFilter, dateRange, searchQuery - but NOT by selectedUnit so all unit columns remain clickable and switchable)
  const itemsForBarChart = useMemo(() => {
    const norm = (s?: string | null) => (s || '').replace(/\u200C/g, ' ').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();

    return eraItems.filter(item => {
      if (selectedOpType !== 'all') {
        const opQuery = norm(selectedOpType);
        const itemOp = norm(item.operationType);
        if (opQuery === 'اتوماتیک سازی' || opQuery === 'اتوماتیک‌سازی' || opQuery === 'اتوماتیک') {
          if (!itemOp.includes('اتوماتیک') && !itemOp.includes('اتوماسیون')) return false;
        } else if (itemOp !== opQuery) {
          return false;
        }
      }
      if (selectedEntityType !== 'all' && norm(item.entityType || 'فرآیند') !== norm(selectedEntityType)) {
        return false;
      }
      if (slideFilter === 'selected' && !item.isSelectedForSlide) {
        return false;
      }
      if (slideFilter === 'unselected' && item.isSelectedForSlide) {
        return false;
      }
      if (startDate || endDate) {
        if (!isDateInRange(item.executionDate, startDate, endDate)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = norm(searchQuery);
        const mName = norm(item.processName).includes(q);
        const mUnit = norm(item.orgUnit).includes(q);
        const mDesc = norm(item.description).includes(q);
        const mDate = item.executionDate.includes(q);
        const mEntity = norm(item.entityType || '').includes(q);
        const mOp = norm(item.operationType || '').includes(q);
        const mProblem = norm(item.problemDescription || '').includes(q);
        const mSolution = norm(item.solutionDescription || '').includes(q);
        const mAchStr = Array.isArray(item.achievements) ? item.achievements.join(' ') : (item.achievements || '');
        const mAch = norm(mAchStr).includes(q);
        if (!mName && !mUnit && !mDesc && !mDate && !mEntity && !mOp && !mProblem && !mSolution && !mAch) return false;
      }
      return true;
    });
  }, [eraItems, selectedOpType, selectedEntityType, slideFilter, startDate, endDate, searchQuery]);

  // Chart data: by unit (dynamically filtered and grouped by operation or entity type)
  const unitDistributionData: Array<Record<string, any>> = useMemo(() => {
    if (chartGroupBy === 'entity') {
      const counts: { [unit: string]: { processCount: number; formCount: number; reportCount: number; total: number } } = {};
      itemsForBarChart.forEach(item => {
        const u = item.orgUnit || 'نامشخص';
        if (!counts[u]) counts[u] = { processCount: 0, formCount: 0, reportCount: 0, total: 0 };
        const ent = item.entityType || 'فرآیند';
        if (ent === 'فرم') counts[u].formCount++;
        else if (ent === 'گزارش') counts[u].reportCount++;
        else counts[u].processCount++;
        counts[u].total++;
      });

      return Object.entries(counts)
        .map(([name, data]) => ({
          name,
          total: data.total,
          فرآیند: data.processCount,
          فرم: data.formCount,
          گزارش: data.reportCount
        }))
        .sort((a, b) => b.total - a.total);
    } else {
      const counts: { [unit: string]: { newCount: number; modCount: number; autoCount: number; total: number } } = {};
      itemsForBarChart.forEach(item => {
        const u = item.orgUnit || 'نامشخص';
        if (!counts[u]) counts[u] = { newCount: 0, modCount: 0, autoCount: 0, total: 0 };
        if (item.operationType === 'جدید') counts[u].newCount++;
        else if (item.operationType === 'اتوماتیک‌سازی') counts[u].autoCount++;
        else counts[u].modCount++;
        counts[u].total++;
      });

      return Object.entries(counts)
        .map(([name, data]) => ({
          name,
          total: data.total,
          جدید: data.newCount,
          اصلاح: data.modCount,
          اتوماتیک‌سازی: data.autoCount
        }))
        .sort((a, b) => b.total - a.total);
    }
  }, [itemsForBarChart, chartGroupBy]);

  // Chart data: dynamically filtered for Pie Chart based on chartGroupBy
  const chartPieData = useMemo(() => {
    if (chartGroupBy === 'entity') {
      return [
        { name: 'فرآیند', value: processesEntityCount, color: '#0284C7' },
        { name: 'فرم', value: formsEntityCount, color: '#16A34A' },
        { name: 'گزارش', value: reportsEntityCount, color: '#D97706' }
      ].filter(d => d.value > 0);
    }
    return [
      { name: 'جدید (فرم جدید)', value: newFormsCount, color: '#446347' },
      { name: 'اصلاح (بهبود فرآیند)', value: modifiedFormsCount, color: '#7C3E1D' },
      { name: 'اتوماتیک‌سازی هوشمند', value: automationFormsCount, color: '#2563EB' }
    ].filter(d => d.value > 0);
  }, [chartGroupBy, processesEntityCount, formsEntityCount, reportsEntityCount, newFormsCount, modifiedFormsCount, automationFormsCount]);

  const handleOpenEdit = (item: ProcessedEraItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions Bar (Box 1) */}
      {(eraVisibility?.showHeader ?? false) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAF7] p-5 rounded-3xl border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#545D4B] text-white shadow-sm">
              <Workflow className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#2D2C28] tracking-tight">
                مدیریت و پایش فرآیندهای الکترونیکی (ERA)
              </h2>
              <p className="text-xs text-[#75746E] font-medium">
                سامانه پایش فرم‌ها، فرآیندها، گزارش‌ها و ارائه اسلایدی به مدیریت ارشد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Jump to Slideshow View */}
            {onGoToSlideshow && (
              <button
                onClick={onGoToSlideshow}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
              >
                <Presentation className="h-4 w-4 text-blue-200" />
                <span>پخش نمایش اسلایدی ({formatNumber(slideSelectedCount)})</span>
              </button>
            )}

            {/* Download Standalone HTML Presentation Button & Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={eraItems.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="دانلود فایل HTML مستقل ارائه (انتخاب همه اسلایدها یا اسلایدهای فعال)"
              >
                <FileCode className="h-4 w-4 text-cyan-200" />
                <span>دانلود HTML ارائه</span>
                <ChevronDown className={`h-3.5 w-3.5 text-cyan-100 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#DDDBCF] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-[#F4F3EE]">
                    <p className="text-xs font-black text-[#2D2C28]">انتخاب دامنه خروجی HTML</p>
                    <p className="text-[11px] text-[#75746E]">فرمت مستقل، خودکفا و قابل اجرا آفلاین</p>
                  </div>

                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => handleExportHtml('selected')}
                      disabled={slideSelectedCount === 0}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F3EE] transition text-right cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D2C28]">اسلایدهای فعال</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {formatNumber(slideSelectedCount)} اسلاید
                          </span>
                        </div>
                        <p className="text-[11px] text-[#75746E] mt-0.5 leading-relaxed">
                          فقط فرآیندهایی که سوییچ اسلاید آن‌ها روشن است
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExportHtml('all')}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F3EE] transition text-right cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100 shrink-0 mt-0.5">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D2C28]">همه اسلایدها</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {formatNumber(eraItems.length)} فرآیند
                          </span>
                        </div>
                        <p className="text-[11px] text-[#75746E] mt-0.5 leading-relaxed">
                          تمامی فرآیندهای ثبت‌شده در سامانه
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Row (4 Cards) (Box 2) */}
      {(eraVisibility?.showMetrics ?? false) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="کل اقدامات ثبت شده"
            value={totalItems}
            icon={Workflow}
            colorScheme="indigo"
            subtitle="مجموع تغییرات و فرم‌های مکانیزه ERA"
          />
          <MetricCard
            title="فرم‌های جدید ایجاد شده"
            value={newFormsCount}
            icon={Sparkles}
            colorScheme="emerald"
            subtitle="مکانیزه‌سازی کامل فرآیند و حذف کاغذ"
          />
          <MetricCard
            title="اصلاحات و بهبود گردش‌کار"
            value={modifiedFormsCount}
            icon={Layers}
            colorScheme="brown"
            subtitle="تغییر دسترسی، قالب چاپ و رفع مغایرت"
          />
          <MetricCard
            title="اتوماتیک‌سازی هوشمند"
            value={automationFormsCount}
            icon={CheckCircle2}
            colorScheme="blue"
            subtitle="پردازش خودکار و حذف عملیات دستی"
          />
        </div>
      )}

      {/* Entity Type Summary Chips (Box 3) */}
      {(eraVisibility?.showEntityChips ?? false) && (
        <div className="flex items-center justify-between gap-3 bg-[#FAFAF7] px-4 py-3 rounded-2xl border border-[#E2E0D8] text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#545D4B]" />
            <span className="font-bold text-[#2D2C28]">ترکیب نوع موجودیت‌ها:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedEntityType(selectedEntityType === 'فرآیند' ? 'all' : 'فرآیند')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                selectedEntityType === 'فرآیند'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span>فرآیندها:</span>
              <span className="font-mono">{formatNumber(processesEntityCount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntityType(selectedEntityType === 'فرم' ? 'all' : 'فرم')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                selectedEntityType === 'فرم'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>فرم‌ها:</span>
              <span className="font-mono">{formatNumber(formsEntityCount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntityType(selectedEntityType === 'گزارش' ? 'all' : 'گزارش')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                selectedEntityType === 'گزارش'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>گزارش‌ها (کاوشگر):</span>
              <span className="font-mono">{formatNumber(reportsEntityCount)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#FAFAF7] rounded-2xl p-3.5 sm:p-4 border border-[#E2E0D8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 w-full min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#8A8880]" />
            <input
              type="text"
              placeholder="جستجو در نام فرآیند، واحد، تاریخ، شرح یا دستاوردها..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl pr-9 pl-8 py-2 text-xs text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-[#8A8880] hover:text-[#2D2C28]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F0] px-2.5 py-1.5 rounded-xl border border-[#DDDBCF] max-w-full">
            <Building2 className="h-3.5 w-3.5 text-[#75746E] shrink-0" />
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs text-[#2D2C28] font-bold focus:outline-none cursor-pointer max-w-[170px] sm:max-w-none truncate"
            >
              <option value="all">تمام واحدها ({allUnits.length})</option>
              {allUnits.map(unit => (
                <option key={unit} value={unit}>
                  {unit} ({unitCountsMap[unit] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F0] px-2.5 py-1.5 rounded-xl border border-[#DDDBCF] max-w-full">
            <Tag className="h-3.5 w-3.5 text-[#75746E] shrink-0" />
            <select
              value={selectedEntityType}
              onChange={e => setSelectedEntityType(e.target.value)}
              className="bg-transparent text-xs text-[#2D2C28] font-bold focus:outline-none cursor-pointer truncate"
            >
              <option value="all">تمام موجودیت‌ها</option>
              <option value="فرآیند">فرآیند ({processesEntityCount})</option>
              <option value="فرم">فرم ({formsEntityCount})</option>
              <option value="گزارش">گزارش ({reportsEntityCount})</option>
            </select>
          </div>

          {/* Operation Type Filter */}
          <div className="flex items-center gap-1.5 bg-[#F5F5F0] px-2.5 py-1.5 rounded-xl border border-[#DDDBCF] max-w-full">
            <Filter className="h-3.5 w-3.5 text-[#75746E] shrink-0" />
            <select
              value={selectedOpType}
              onChange={e => setSelectedOpType(e.target.value)}
              className="bg-transparent text-xs text-[#2D2C28] font-bold focus:outline-none cursor-pointer truncate"
            >
              <option value="all">تمام عملیات‌ها</option>
              <option value="جدید">جدید / ایجاد فرم ({newFormsCount})</option>
              <option value="اصلاح">اصلاح / بهبود ({modifiedFormsCount})</option>
              <option value="اتوماتیک‌سازی">اتوماتیک‌سازی ({automationFormsCount})</option>
            </select>
          </div>

          {/* Active Date Filter Chip */}
          {(startDate || endDate) && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold shadow-2xs max-w-full">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                تاریخ: {startDate ? startDate : 'ابتدا'} تا {endDate ? endDate : 'انتها'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setTempStartDate('');
                  setTempEndDate('');
                }}
                className="hover:bg-emerald-200 p-0.5 rounded text-emerald-700 transition cursor-pointer shrink-0"
                title="حذف فیلتر محدوده تاریخ"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#9C3A27] hover:text-[#8A2E1D] bg-[#FAECE8] hover:bg-[#F5D7D0] font-bold rounded-xl border border-[#F2D1CA] transition cursor-pointer"
              title="پاکسازی تمام فیلترها"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>پاک کردن فیلترها ({activeFiltersCount})</span>
            </button>
          )}
          <button
            onClick={() => handleSelectAllForSlide(true)}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer"
            title="فعال‌سازی سوییچ اسلاید برای تمام رکوردهای فیلتر شده"
          >
            انتخاب همه برای اسلاید
          </button>
          <button
            onClick={() => handleSelectAllForSlide(false)}
            className="text-[11px] font-bold text-[#75746E] hover:text-[#2D2C28] bg-[#EFEFEA] px-2.5 py-1.5 rounded-lg border border-[#DDDBCF] transition cursor-pointer"
            title="غیرفعال‌سازی سوییچ اسلاید"
          >
            لغو انتخاب‌ها
          </button>
        </div>
      </div>

      {/* Visual Charts Overview, Controls & Date Filter */}
      <div className="space-y-4">
        {/* Chart Controls & Date Filter Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 bg-[#FAFAF7] p-4 rounded-3xl border border-[#E2E0D8] shadow-xs">
          {/* Grouping Mode Switch */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D2C28]">
              <SlidersHorizontal className="h-4 w-4 text-[#545D4B]" />
              <span>مبنای نمودارها:</span>
            </div>

            <div className="flex items-center flex-wrap bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF] gap-1 self-start sm:self-auto max-w-full">
              <button
                type="button"
                onClick={() => handleChartGroupByChange('operation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartGroupBy === 'operation'
                    ? 'bg-white text-[#2D2C28] shadow-xs border border-[#DDDBCF]'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <Filter className="h-3.5 w-3.5 text-[#545D4B]" />
                <span>نوع عملیات <span className="hidden sm:inline">(جدید / اصلاح / اتوماتیک)</span></span>
              </button>
              <button
                type="button"
                onClick={() => handleChartGroupByChange('entity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartGroupBy === 'entity'
                    ? 'bg-white text-[#2D2C28] shadow-xs border border-[#DDDBCF]'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <Tag className="h-3.5 w-3.5 text-[#0284C7]" />
                <span>نوع موجودیت <span className="hidden sm:inline">(فرآیند / فرم / گزارش)</span></span>
              </button>
            </div>
          </div>

          {/* Date Filter & Presets for Charts */}
          <div className="flex items-center gap-2 flex-wrap relative" ref={chartDateFilterRef}>
            {/* Quick Period Presets */}
            <div className="flex items-center gap-1 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  const s = getJalaliMonthsAgo(1);
                  const e = curJalali.str;
                  setStartDate(s);
                  setEndDate(e);
                  setTempStartDate(s);
                  setTempEndDate(e);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  startDate === getJalaliMonthsAgo(1) && endDate === curJalali.str
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
                }`}
                title="فیلتر اقدامات ۱ ماه گذشته تا امروز"
              >
                ماه اخیر
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = getJalaliMonthsAgo(3);
                  const e = curJalali.str;
                  setStartDate(s);
                  setEndDate(e);
                  setTempStartDate(s);
                  setTempEndDate(e);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  startDate === getJalaliMonthsAgo(3) && endDate === curJalali.str
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
                }`}
                title="فیلتر اقدامات ۳ ماه گذشته تا امروز (فصل اخیر)"
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
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  startDate === getJalaliMonthsAgo(6) && endDate === curJalali.str
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-white/70'
                }`}
                title="فیلتر اقدامات ۶ ماه گذشته تا امروز (نیم‌سال اخیر)"
              >
                ۶ ماه اخیر
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

              {/* Chart Date Range Popover */}
              {isChartDateFilterOpen && (
                <div className="absolute z-50 top-full mt-2 left-0 sm:left-auto sm:right-0 w-[calc(100vw-2.5rem)] max-w-xs sm:max-w-sm sm:w-80 bg-white rounded-3xl p-4 shadow-2xl border border-[#DDDBCF] text-right space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
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
                    <label className="text-[10px] font-bold text-[#75746E] block flex items-center gap-1">
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
                          setIsChartDateFilterOpen(false);
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
                          setIsChartDateFilterOpen(false);
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
                          setIsChartDateFilterOpen(false);
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
                              setIsChartDateFilterOpen(false);
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
                            setIsChartDateFilterOpen(false);
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
                            setIsChartDateFilterOpen(false);
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
                        setIsChartDateFilterOpen(false);
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
                          setIsChartDateFilterOpen(false);
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

            {/* Quick Clear Filter Button */}
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setTempStartDate('');
                  setTempEndDate('');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] border border-[#F2D1CA] transition cursor-pointer"
                title="پاکسازی فیلتر تاریخ"
              >
                <X className="h-3.5 w-3.5" />
                <span>حذف فیلتر</span>
              </button>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Units Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-[#FAFAF7] rounded-3xl p-5 border border-[#E2E0D8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#545D4B]" />
                <div>
                  <h3 className="text-xs font-bold text-[#2D2C28]">
                    توزیع فرآیندها به تفکیک واحدهای سازمانی {chartGroupBy === 'entity' ? '(بر اساس موجودیت)' : '(بر اساس نوع اقدام)'}
                  </h3>
                  <p className="text-[10px] text-[#75746E]">
                    💡 روی هر ستون یا نام واحد کلیک کنید تا جدول و نمودار دایره‌ای روی آن واحد فیلتر شوند
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* AI Analysis of Bar Chart & Effective Actions Button (نمایش فقط در صورت فعال‌سازی در تنظیمات سامانه) */}
                {eraVisibility?.showAiChartAnalysis && (
                  <button
                    type="button"
                    onClick={() => setIsAiChartModalOpen(true)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-[#2C3B2D] via-[#446347] to-[#545D4B] hover:from-[#233024] hover:to-[#364438] px-3 py-1.5 rounded-xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer border border-[#6B7561]/40"
                    title="تحلیل هوشمند توزیع فرآیندها، اتوماتیک‌سازی‌ها و خلاصه موثرترین کارهای انجام‌شده با هوش مصنوعی"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>تحلیل هوش مصنوعی از موثرترین کارها</span>
                  </button>
                )}

                {selectedUnit !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedUnit('all')}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 transition cursor-pointer"
                    title="کلیک برای نمایش مجدد تمام واحدها"
                  >
                    <span>واحد: {selectedUnit}</span>
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-[11px] text-[#75746E] font-mono">
                    {allUnits.length} واحد
                  </span>
                )}
              </div>
            </div>

            <div className="h-80 sm:h-96 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={unitDistributionData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 95 }}
                  className="cursor-pointer"
                  onClick={(state: any) => {
                    const unitName = state?.activeLabel || state?.activePayload?.[0]?.payload?.name || state?.payload?.name;
                    if (unitName && typeof unitName === 'string') {
                      setSelectedUnit(prev => (prev === unitName ? 'all' : unitName));
                      scrollToTable();
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E6DF" vertical={false} />
                  <XAxis
                    dataKey="name"
                    height={95}
                    interval={0}
                    tick={renderRotatedEraUnitTick}
                    tickLine={{ stroke: '#DDDBCF' }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    width={34}
                    tick={{ fontSize: 10, fill: '#5A5852' }}
                    tickLine={{ stroke: '#DDDBCF' }}
                    stroke="#CBD5E1"
                    axisLine={{ stroke: '#DDDBCF' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAFAF7',
                      borderColor: '#DDDBCF',
                      borderRadius: '12px',
                      fontSize: '11px',
                      direction: 'rtl'
                    }}
                    cursor={{ fill: '#E2E8F0', opacity: 0.4 }}
                  />
                  {chartGroupBy === 'entity' ? (
                    <>
                      <Bar
                        dataKey="فرآیند"
                        stackId="a"
                        fill="#0284C7"
                        radius={[0, 0, 0, 0]}
                        name="فرآیند"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                      <Bar
                        dataKey="فرم"
                        stackId="a"
                        fill="#16A34A"
                        radius={[0, 0, 0, 0]}
                        name="فرم"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                      <Bar
                        dataKey="گزارش"
                        stackId="a"
                        fill="#D97706"
                        radius={[4, 4, 0, 0]}
                        name="گزارش"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="جدید"
                        stackId="a"
                        fill="#446347"
                        radius={[0, 0, 0, 0]}
                        name="فرم جدید"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                      <Bar
                        dataKey="اصلاح"
                        stackId="a"
                        fill="#7C3E1D"
                        radius={[0, 0, 0, 0]}
                        name="اصلاح فرآیند"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                      <Bar
                        dataKey="اتوماتیک‌سازی"
                        stackId="a"
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                        name="اتوماتیک‌سازی"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={(entry: any) => {
                          const u = entry?.name || entry?.payload?.name;
                          if (u && typeof u === 'string') {
                            setSelectedUnit(prev => (prev === u ? 'all' : u));
                            scrollToTable();
                          }
                        }}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart (Breakdown by Entity Type or Operation Type) */}
          <div className="bg-[#FAFAF7] rounded-3xl p-5 border border-[#E2E0D8] shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#545D4B]" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2D2C28]">
                      {chartGroupBy === 'entity'
                        ? `ترکیب موجودیت‌ها ${selectedUnit !== 'all' ? `(واحد ${selectedUnit})` : ''}`
                        : `ترکیب اقدامات ${selectedUnit !== 'all' ? `(واحد ${selectedUnit})` : ''}`}
                    </h3>
                    <p className="text-[10px] text-[#75746E]">
                      {chartGroupBy === 'entity' ? 'فرآیند، فرم و گزارش' : 'جدید، اصلاح و اتوماتیک‌سازی'}
                    </p>
                  </div>
                </div>
                {chartGroupBy === 'entity' && selectedEntityType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedEntityType('all')}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200 transition cursor-pointer"
                    title="حذف فیلتر نوع موجودیت"
                  >
                    <span>{selectedEntityType}</span>
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
                {chartGroupBy === 'operation' && selectedOpType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedOpType('all')}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition cursor-pointer"
                    title="حذف فیلتر نوع عملیات"
                  >
                    <span>{selectedOpType}</span>
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>

              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      className="cursor-pointer"
                      onClick={(entry: any) => {
                        if (entry && entry.name) {
                          if (chartGroupBy === 'entity') {
                            let target = 'all';
                            if (entry.name.includes('فرآیند')) target = 'فرآیند';
                            else if (entry.name.includes('فرم')) target = 'فرم';
                            else if (entry.name.includes('گزارش')) target = 'گزارش';
                            setSelectedEntityType(prev => (prev === target ? 'all' : target));
                          } else {
                            let target = 'all';
                            if (entry.name.includes('جدید')) target = 'جدید';
                            else if (entry.name.includes('اصلاح')) target = 'اصلاح';
                            else if (entry.name.includes('اتوماتیک')) target = 'اتوماتیک‌سازی';
                            setSelectedOpType(prev => (prev === target ? 'all' : target));
                          }
                          scrollToTable();
                        }
                      }}
                    >
                      {chartPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-85 transition-opacity" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomEraPieTooltip />}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                      offset={14}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-[#2D2C28]">{formatNumber(totalItems)}</span>
                  <span className="text-[10px] text-[#75746E]">
                    {selectedUnit !== 'all' ? 'این واحد' : 'کل فرآیندها'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Legend */}
            {chartGroupBy === 'entity' ? (
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#E8E6DF] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntityType(prev => prev === 'فرآیند' ? 'all' : 'فرآیند');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedEntityType === 'فرآیند' ? 'bg-sky-100 ring-1 ring-sky-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#0284C7] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">فرآیند:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(processesEntityCount)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntityType(prev => prev === 'فرم' ? 'all' : 'فرم');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedEntityType === 'فرم' ? 'bg-emerald-100 ring-1 ring-emerald-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#16A34A] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">فرم:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(formsEntityCount)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntityType(prev => prev === 'گزارش' ? 'all' : 'گزارش');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedEntityType === 'گزارش' ? 'bg-amber-100 ring-1 ring-amber-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#D97706] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">گزارش:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(reportsEntityCount)}</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#E8E6DF] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpType(prev => prev === 'جدید' ? 'all' : 'جدید');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedOpType === 'جدید' ? 'bg-emerald-100 ring-1 ring-emerald-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#446347] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">جدید:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(newFormsCount)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpType(prev => prev === 'اصلاح' ? 'all' : 'اصلاح');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedOpType === 'اصلاح' ? 'bg-amber-100 ring-1 ring-amber-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#7C3E1D] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">اصلاح:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(modifiedFormsCount)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpType(prev => prev === 'اتوماتیک‌سازی' ? 'all' : 'اتوماتیک‌سازی');
                    scrollToTable();
                  }}
                  className={`flex items-center gap-1.5 p-1 rounded-lg text-right transition cursor-pointer ${selectedOpType === 'اتوماتیک‌سازی' ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-[#EFEFEA]'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-md bg-[#2563EB] shrink-0" />
                  <div>
                    <span className="text-[#75746E] block text-[10px]">اتوماتیک:</span>
                    <span className="font-bold text-[#2D2C28] text-[11px]">{formatNumber(automationFormsCount)}</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERA Data Table with Slide Presentation Toggle Switch */}
      <div id="era-data-table-section" className="bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#2D2C28]">
                جدول جامع اقدامات
              </h3>
              {activeFiltersCount > 0 && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <SlidersHorizontal className="h-2.5 w-2.5" />
                  {activeFiltersCount} فیلتر فعال
                </span>
              )}
            </div>
            <p className="text-xs text-[#75746E] mt-0.5">
              فیلتر هر ستون دقیقاً در ردیف بالای همان ستون قرار گرفته است • سوییچ «نمایش اسلایدی» را برای ارائه در تب اسلایدها فعال کنید
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Status Filter Tabs */}
            <div className="flex items-center bg-[#EBEBE6] p-0.5 rounded-xl border border-[#DDDBCF] text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white text-[#2D2C28] shadow-xs'
                    : 'text-[#615F59] hover:text-[#2D2C28]'
                }`}
              >
                همه ({formatNumber(eraItems.length)})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus(prev => prev === 'برای انجام' ? 'all' : 'برای انجام')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'برای انجام'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[#615F59] hover:text-amber-700'
                }`}
                title="فیلتر وضعیت: برای انجام"
              >
                <Clock className="w-3 h-3" />
                <span>برای انجام ({formatNumber(todoCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus(prev => prev === 'درحال انجام' ? 'all' : 'درحال انجام')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'درحال انجام'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[#615F59] hover:text-blue-700'
                }`}
                title="فیلتر وضعیت: درحال انجام"
              >
                <TrendingUp className="w-3 h-3" />
                <span>درحال انجام ({formatNumber(inProgressCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus(prev => prev === 'انجام شده' ? 'all' : 'انجام شده')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'انجام شده'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#615F59] hover:text-emerald-700'
                }`}
                title="فیلتر وضعیت: انجام شده"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>انجام شده ({formatNumber(doneCount)})</span>
              </button>
            </div>

            {/* دکمه ثبت فرآیند جدید - رو به روی نوشته جدول جامع اقدامات */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#545D4B] hover:bg-[#434A3C] text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>ثبت فرآیند جدید</span>
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="flex items-center gap-1 text-xs text-[#9C3A27] hover:text-[#8A2E1D] font-bold px-2.5 py-1 rounded-xl bg-[#FAECE8] border border-[#E8B4A8] transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>حذف تمام فیلترها</span>
              </button>
            )}
            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="flex items-center gap-1 text-xs text-[#545D4B] hover:text-[#2D2C28] font-bold px-2.5 py-1.5 rounded-xl bg-white border border-[#DDDBCF] hover:bg-[#EFEFEA] transition cursor-pointer shadow-2xs"
                title="مدیریت نمایش/عدم نمایش ستون‌های جدول فرآیندها"
              >
                <Sliders className="h-3.5 w-3.5 text-[#545D4B]" />
                <span>تنظیم ستون‌ها</span>
              </button>
            )}
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              {formatNumber(slideSelectedCount)} اسلاید آماده ارائه
            </span>
            <span className="text-xs font-bold text-[#2D2C28] bg-[#EFEFEA] px-3 py-1 rounded-xl border border-[#DDDBCF]">
              نمایش {formatNumber(filterExecutionMode === 'server' ? serverTotal : filteredItems.length)} مورد
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-2xl border border-[#DDDBCF] relative w-full shadow-2xs bg-white">
          {serverLoading && filterExecutionMode === 'server' && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10">
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-[#CBD5E1] flex items-center gap-2 text-xs font-bold text-[#1E293B]">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>در حال اجرای کوئری در پایگاه داده SQLite...</span>
              </div>
            </div>
          )}

          <table className="w-full text-xs text-right border-collapse table-auto">
            <thead>
              {/* Row 1: Column Titles */}
              <tr className="bg-[#EBEBE6] text-[#2D2C28] font-bold border-b border-[#DDDBCF]">
                {isColVisible('index') && (
                  <th className="py-2.5 px-2 w-10 min-w-[38px] text-center text-[11px]">#</th>
                )}
                {isColVisible('processName') && (
                  <th className="py-2.5 px-3 min-w-[190px] text-right text-xs">نام فرآیند / موجودیت</th>
                )}
                {isColVisible('entityType') && (
                  <th className="py-2.5 px-2 min-w-[70px] text-center text-xs">نوع</th>
                )}
                {isColVisible('orgUnit') && (
                  <th className="py-2.5 px-3 min-w-[130px] text-right text-xs">واحد سازمانی</th>
                )}
                {isColVisible('executionDate') && (
                  <th className="py-2.5 px-2 min-w-[110px] text-center text-xs">
                    <div className="flex items-center justify-center gap-1">
                      <span>تاریخ انجام</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTempStartDate(startDate);
                          setTempEndDate(endDate);
                          setIsDateFilterOpen(prev => !prev);
                        }}
                        className={`p-0.5 rounded transition cursor-pointer ${
                          startDate || endDate
                            ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 ring-1 ring-emerald-400'
                            : 'text-[#8A8880] hover:text-[#2D2C28] hover:bg-[#DDDBCF]'
                        }`}
                        title="فیلتر محدوده زمانی تاریخ"
                      >
                        <Calendar className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                )}
                {isColVisible('operationType') && (
                  <th className="py-2.5 px-2 min-w-[95px] text-center text-xs">نوع اقدام</th>
                )}
                {isColVisible('status') && (
                  <th className="py-2.5 px-2 min-w-[115px] text-center text-xs">وضعیت</th>
                )}
                {isColVisible('description') && (
                  <th className="py-2.5 px-3 min-w-[200px] text-right text-xs">توضیحات و شرح</th>
                )}
                {isColVisible('bpmn') && (
                  <th className="py-2.5 px-2 min-w-[115px] text-center text-xs">
                    <div className="flex items-center justify-center gap-1" title="طراحی و مدل‌سازی فرآیند با bpmn.js استاندارد BPMN 2.0">
                      <Workflow className="h-3.5 w-3.5 text-[#545D4B]" />
                      <span>دیاگرام BPMN</span>
                    </div>
                  </th>
                )}
                {isColVisible('slideFullscreen') && (
                  <th className="py-2.5 px-2 min-w-[110px] text-center text-xs">نمایش اسلاید</th>
                )}
                {isColVisible('slideToggle') && (
                  <th className="py-2.5 px-2 min-w-[95px] text-center text-xs">اسلایدشو</th>
                )}
                {isColVisible('actions') && (
                  <th className="py-2.5 px-2 min-w-[65px] text-center text-xs">عملیات</th>
                )}
              </tr>

              {/* Row 2: Per-column Filter Inputs Aligned Directly Above/Below Each Column Header */}
              <tr className="bg-[#F5F5F0] border-b border-[#DDDBCF] text-xs">
                {/* 1. # Index */}
                {isColVisible('index') && (
                  <th className="p-1 text-center font-normal">
                    <div className="flex items-center justify-center" title="فیلترهای اختصاصی هر ستون">
                      <SlidersHorizontal className="h-3 w-3 text-[#8A8880]" />
                    </div>
                  </th>
                )}

                {/* 2. Process Name Filter (Search) */}
                {isColVisible('processName') && (
                  <th className="p-1 font-normal">
                    <div className="relative">
                      <Search className="absolute right-1.5 top-1.5 h-3 w-3 text-[#8A8880]" />
                      <input
                        type="text"
                        placeholder="جستجو..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-[#DDDBCF] rounded-lg pr-5 pl-5 py-0.5 text-[11px] text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute left-1 top-1 text-[#8A8880] hover:text-[#2D2C28]"
                          title="پاک کردن جستجو"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </th>
                )}

                {/* 3. Entity Type Filter */}
                {isColVisible('entityType') && (
                  <th className="p-1 font-normal">
                    <select
                      value={selectedEntityType}
                      onChange={e => setSelectedEntityType(e.target.value)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                    >
                      <option value="all">همه</option>
                      <option value="فرآیند">فرآیند ({processesEntityCount})</option>
                      <option value="فرم">فرم ({formsEntityCount})</option>
                      <option value="گزارش">گزارش ({reportsEntityCount})</option>
                    </select>
                  </th>
                )}

                {/* 4. Org Unit Filter */}
                {isColVisible('orgUnit') && (
                  <th className="p-1 font-normal">
                    <select
                      value={selectedUnit}
                      onChange={e => setSelectedUnit(e.target.value)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                    >
                      <option value="all">همه واحدها</option>
                      {allUnits.map(unit => (
                        <option key={unit} value={unit}>
                          {unit} ({unitCountsMap[unit] || 0})
                        </option>
                      ))}
                    </select>
                  </th>
                )}

                {/* 5. Date Range Filter Trigger & Popover */}
                {isColVisible('executionDate') && (
                  <th className="p-1 font-normal text-center relative" ref={dateFilterRef}>
                  {startDate || endDate ? (
                    <div className="inline-flex items-center justify-between gap-0.5 w-full bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg px-1 py-0.5 text-[9px] font-bold shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setTempStartDate(startDate);
                          setTempEndDate(endDate);
                          setIsDateFilterOpen(prev => !prev);
                        }}
                        className="truncate text-right hover:underline flex items-center gap-0.5 cursor-pointer flex-1"
                        title={`از: ${startDate || 'ابتدا'} تا: ${endDate || 'انتها'}`}
                      >
                        <Calendar className="h-2 w-2 shrink-0 text-emerald-600" />
                        <span className="truncate">
                          {startDate ? startDate.slice(5) : '...'} - {endDate ? endDate.slice(5) : '...'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartDate('');
                          setEndDate('');
                          setTempStartDate('');
                          setTempEndDate('');
                        }}
                        className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded hover:bg-emerald-200 transition cursor-pointer shrink-0"
                        title="حذف فیلتر تاریخ"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempStartDate(startDate);
                        setTempEndDate(endDate);
                        setIsDateFilterOpen(prev => !prev);
                      }}
                      className="w-full bg-white border border-[#DDDBCF] hover:border-[#545D4B] rounded-lg px-1 py-0.5 text-[10px] text-[#75746E] hover:text-[#2D2C28] flex items-center justify-center gap-0.5 transition cursor-pointer font-medium"
                      title="فیلتر تاریخ"
                    >
                      <Calendar className="h-2.5 w-2.5 text-[#8A8880]" />
                      <span>تاریخ</span>
                    </button>
                  )}

                  {/* Date Range Popover */}
                  {isDateFilterOpen && (
                    <div className="absolute z-50 top-full mt-1.5 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-80 bg-white rounded-3xl p-4 shadow-2xl border border-[#DDDBCF] text-right space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D2C28]">
                          <CalendarRange className="h-4 w-4 text-[#545D4B]" />
                          <span>فیلتر تاریخ و ماه‌های آماده</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDateFilterOpen(false)}
                          className="text-[#8A8880] hover:text-[#2D2C28] p-1 rounded-lg hover:bg-[#F5F5F0] transition cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Section 1: Recent Period Presets */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#75746E] block flex items-center gap-1">
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
                              setIsDateFilterOpen(false);
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
                              setIsDateFilterOpen(false);
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
                              setIsDateFilterOpen(false);
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
                                  setIsDateFilterOpen(false);
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

                      {/* Input 1: From Date */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#2D2C28] flex items-center justify-between">
                          <span>از تاریخ:</span>
                          <span className="text-[9px] text-[#8A8880] font-normal">کلیک کنید یا تایپ کنید</span>
                        </label>
                        <JalaliDateInput
                          value={tempStartDate}
                          onChange={setTempStartDate}
                          onEnter={() => {
                            setStartDate(tempStartDate.trim());
                            setEndDate(tempEndDate.trim());
                            setIsDateFilterOpen(false);
                          }}
                          placeholder="۱۴۰X/MM/DD"
                          inputClassName="bg-[#FAFAF7] focus:bg-white text-xs"
                        />
                      </div>

                      {/* Input 2: To Date */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#2D2C28] flex items-center justify-between">
                          <span>تا تاریخ:</span>
                          <span className="text-[9px] text-[#8A8880] font-normal">کلیک کنید یا تایپ کنید</span>
                        </label>
                        <JalaliDateInput
                          value={tempEndDate}
                          onChange={setTempEndDate}
                          onEnter={() => {
                            setStartDate(tempStartDate.trim());
                            setEndDate(tempEndDate.trim());
                            setIsDateFilterOpen(false);
                          }}
                          placeholder="۱۴۰X/MM/DD"
                          inputClassName="bg-[#FAFAF7] focus:bg-white text-xs"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#E8E6DF]">
                        <button
                          type="button"
                          onClick={() => {
                            setStartDate(tempStartDate.trim());
                            setEndDate(tempEndDate.trim());
                            setIsDateFilterOpen(false);
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
                              setIsDateFilterOpen(false);
                            }}
                            className="bg-[#FAECE8] hover:bg-[#F5D8D0] text-[#9C3A27] py-1.5 px-3 rounded-xl text-xs font-bold border border-[#F2D1CA] transition cursor-pointer"
                          >
                            پاک کردن
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsDateFilterOpen(false)}
                          className="bg-[#EFEFEA] hover:bg-[#E5E5DF] text-[#75746E] py-1.5 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          بستن
                        </button>
                      </div>
                    </div>
                  )}
                </th>
                )}

                {/* 6. Operation Type Filter */}
                {isColVisible('operationType') && (
                  <th className="p-1 font-normal">
                    <select
                      value={selectedOpType}
                      onChange={e => setSelectedOpType(e.target.value)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                    >
                      <option value="all">همه</option>
                      <option value="جدید">جدید ({newFormsCount})</option>
                      <option value="اصلاح">اصلاح ({modifiedFormsCount})</option>
                      <option value="اتوماتیک‌سازی">اتوماتیک‌سازی ({automationFormsCount})</option>
                    </select>
                  </th>
                )}

                {/* 7. Status Filter */}
                {isColVisible('status') && (
                  <th className="p-1 font-normal">
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                      title="فیلتر وضعیت فرآیند"
                    >
                      <option value="all">همه وضعیت‌ها</option>
                      <option value="برای انجام">برای انجام ({todoCount})</option>
                      <option value="درحال انجام">درحال انجام ({inProgressCount})</option>
                      <option value="انجام شده">انجام شده ({doneCount})</option>
                    </select>
                  </th>
                )}

                {/* 8. Description Placeholder */}
                {isColVisible('description') && (
                  <th className="p-1 font-normal text-center text-[#8A8880] text-[10px]">
                    —
                  </th>
                )}

                {/* 9. BPMN Filter */}
                {isColVisible('bpmn') && (
                  <th className="p-1 font-normal">
                    <select
                      value={bpmnFilter}
                      onChange={e => setBpmnFilter(e.target.value as any)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                      title="فیلتر بر اساس داشتن دیاگرام BPMN"
                    >
                      <option value="all">همه</option>
                      <option value="with-bpmn">دارای BPMN ({withBpmnCount})</option>
                      <option value="without-bpmn">بدون BPMN ({withoutBpmnCount})</option>
                    </select>
                  </th>
                )}

                {/* 10. Slide Single View Column Placeholder */}
                {isColVisible('slideFullscreen') && (
                  <th className="p-1 font-normal text-center text-[#8A8880] text-[10px]">
                    —
                  </th>
                )}

                {/* 11. Slide Batch Filter */}
                {isColVisible('slideToggle') && (
                  <th className="p-1 font-normal">
                    <select
                      value={slideFilter}
                      onChange={e => setSlideFilter(e.target.value as any)}
                      className="w-full bg-white border border-[#DDDBCF] rounded-lg px-1 py-0.5 text-[10px] text-[#2D2C28] font-medium focus:outline-none focus:ring-1 focus:ring-[#545D4B] cursor-pointer"
                    >
                      <option value="all">همه</option>
                      <option value="selected">منتخب ({slideSelectedCount})</option>
                      <option value="unselected">خاموش ({eraItems.length - slideSelectedCount})</option>
                    </select>
                  </th>
                )}

                {/* 12. Reset Filter Action */}
                {isColVisible('actions') && (
                  <th className="p-1 text-center font-normal">
                    {activeFiltersCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleResetAllFilters}
                        className="inline-flex items-center justify-center gap-0.5 px-1 py-0.5 rounded-lg text-[9px] font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] transition cursor-pointer border border-[#E8B4A8]"
                        title="حذف تمام فیلترها"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>ریست</span>
                      </button>
                    ) : (
                      <span className="text-[#8A8880] text-[10px]">—</span>
                    )}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6DF]">
              {(filterExecutionMode === 'server' && bpmnFilter !== 'all' 
                ? serverItems.filter(i => bpmnFilter === 'with-bpmn' ? Boolean(i.hasBpmn || i.bpmnXml) : (!i.hasBpmn && !i.bpmnXml))
                : (filterExecutionMode === 'server' ? serverItems : filteredItems)
              ).length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount || 1} className="py-8 text-center text-[#8A8880] font-medium">
                    {serverLoading ? 'در حال جستجو و دریافت اطلاعات...' : 'موردی یافت نشد.'}
                  </td>
                </tr>
              ) : (
                (filterExecutionMode === 'server' && bpmnFilter !== 'all'
                  ? serverItems.filter(i => bpmnFilter === 'with-bpmn' ? Boolean(i.hasBpmn || i.bpmnXml) : (!i.hasBpmn && !i.bpmnXml))
                  : (filterExecutionMode === 'server' ? serverItems : filteredItems)
                ).map((item, idx) => {
                  const isNew = item.operationType === 'جدید';
                  const isAuto = item.operationType === 'اتوماتیک‌سازی' || item.operationType === 'اتوماتیک سازی';
                  const entity = item.entityType || 'فرآیند';
                  const isSelectedForSlide = !!item.isSelectedForSlide;
                  const itemStatus = item.status || 'انجام شده';
                  const hasImage = !!(
                    (item.formImages && item.formImages.length > 0) ||
                    item.formImageUrl ||
                    (typeof window !== 'undefined' && (localStorage.getItem(`era_form_img_${item.id}`) || localStorage.getItem(`era_form_imgs_${item.id}`)))
                  );
                  const rowNumber = filterExecutionMode === 'server'
                    ? (serverPage - 1) * serverPageSize + idx + 1
                    : idx + 1;

                  return (
                    <tr key={`era-row-${item.id || idx}-${idx}`} className="hover:bg-[#F5F5F0] transition-colors group">
                      {/* 1. Row Index */}
                      {isColVisible('index') && (
                        <td className="py-2.5 px-2 text-center text-[#8A8880] font-mono text-[11px]">
                          {rowNumber}
                        </td>
                      )}

                      {/* 2. Process / Entity Name */}
                      {isColVisible('processName') && (
                        <td 
                          className="py-2.5 px-3 font-bold text-[#2D2C28] text-xs cursor-pointer hover:text-[#545D4B] transition-colors"
                          onClick={() => handleOpenEdit(item)}
                          title={`مشاهده و ویرایش فرآیند: ${item.processName}`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 break-words">
                            <span className="hover:underline">{item.processName}</span>
                            {hasImage && (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPresentation(item);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-normal hover:bg-blue-100 transition cursor-pointer whitespace-nowrap"
                                title="این فرآیند دارای تصویر اسکرین‌شات پیوست است"
                              >
                                <ImageIcon className="h-2.5 w-2.5 text-blue-600" />
                                <span>تصویر پیوست</span>
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      
                      {/* 3. Entity Type Badge */}
                      {isColVisible('entityType') && (
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${
                            entity === 'فرم'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : entity === 'گزارش'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {entity}
                          </span>
                        </td>
                      )}

                      {/* 4. Org Unit */}
                      {isColVisible('orgUnit') && (
                        <td className="py-2.5 px-3">
                          <span className="bg-[#EFEFEA] text-[#2D2C28] font-semibold px-2 py-0.5 rounded-md border border-[#DDDBCF] text-[11px] block truncate" title={item.orgUnit}>
                            {item.orgUnit}
                          </span>
                        </td>
                      )}

                      {/* 5. Execution Date */}
                      {isColVisible('executionDate') && (
                        <td className="py-2.5 px-2 text-center font-mono text-[#5A5852] text-[11px] whitespace-nowrap">
                          {item.executionDate}
                        </td>
                      )}

                      {/* 6. Operation Type */}
                      {isColVisible('operationType') && (
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${
                            isAuto
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : isNew
                              ? 'bg-[#EDF2EB] text-[#2E462C] border border-[#D4DFD1]'
                              : 'bg-[#FDF6F0] text-[#7C3E1D] border border-[#E8D5C4]'
                          }`}>
                            {item.operationType}
                          </span>
                        </td>
                      )}

                      {/* 7. Status Column with quick switch dropdown */}
                      {isColVisible('status') && (
                        <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block text-center">
                            <select
                              value={itemStatus}
                              onChange={(e) => handleQuickStatusChange(item, e.target.value as any, e)}
                              className={`appearance-none px-2.5 py-0.5 pr-5 pl-2 text-[10px] font-bold rounded-full border cursor-pointer transition shadow-2xs focus:outline-none focus:ring-1 focus:ring-offset-1 text-center ${
                                itemStatus === 'برای انجام'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 focus:ring-amber-500'
                                  : itemStatus === 'درحال انجام'
                                  ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 focus:ring-blue-500'
                                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 focus:ring-emerald-500'
                              }`}
                              title="تغییر سریع وضعیت فرآیند (برای انجام / درحال انجام / انجام شده)"
                            >
                              <option value="برای انجام">برای انجام</option>
                              <option value="درحال انجام">درحال انجام</option>
                              <option value="انجام شده">انجام شده</option>
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          </div>
                        </td>
                      )}

                      {/* 8. Truncated Description Column with ellipsis, click opens full details */}
                      {isColVisible('description') && (
                        <td className="py-2.5 px-3 text-[#5A5852] font-medium text-[11px] max-w-[260px]">
                          <div
                            className="cursor-pointer hover:text-[#2D2C28] hover:bg-[#EFEFEA]/70 px-1.5 py-0.5 rounded transition-all"
                            onClick={() => handleOpenEdit(item)}
                            title={`کلیک برای مشاهده متن کامل توضیحات:\n${item.description || 'بدون توضیحات'}`}
                          >
                            {item.description ? (
                              <span className="line-clamp-1 block truncate">
                                {item.description.length > 48 ? `${item.description.slice(0, 48)}...` : item.description}
                              </span>
                            ) : (
                              <span className="text-[#8A8880] italic text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 9. BPMN Designer Column */}
                      {isColVisible('bpmn') && (
                        <td className="py-2.5 px-2 text-center">
                          {item.bpmnXml || item.hasBpmn ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBpmnItem(item);
                                setIsBpmnModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 hover:border-emerald-600 text-[10px] sm:text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group/bpmnbtn whitespace-nowrap"
                              title={`این فرآیند دارای دیاگرام BPMN است. کلیک جهت مشاهده یا ویرایش در bpmn.js`}
                            >
                              <Workflow className="h-3 w-3 text-emerald-600 group-hover/bpmnbtn:text-white transition-transform group-hover/bpmnbtn:scale-110" />
                              <span>ویرایش BPMN</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover/bpmnbtn:bg-white" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBpmnItem(item);
                                setIsBpmnModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#545D4B]/5 hover:bg-[#545D4B] text-[#545D4B] hover:text-white border border-[#545D4B]/20 hover:border-[#545D4B] text-[10px] font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group/bpmnbtn whitespace-nowrap"
                              title={`طراحی دیاگرام استاندارد BPMN 2.0 برای فرآیند "${item.processName}" با ابزار bpmn.js`}
                            >
                              <Workflow className="h-2.5 w-2.5 text-[#545D4B] group-hover/bpmnbtn:text-white" />
                              <span>+ طراحی BPMN</span>
                            </button>
                          )}
                        </td>
                      )}

                      {/* 10. Show Slide in Fullscreen */}
                      {isColVisible('slideFullscreen') && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setHoveredSlideItem(null);
                              setViewingFullscreenSlideItem(item);
                            }}
                            onMouseEnter={() => handleSlideButtonMouseEnter(item)}
                            onMouseLeave={handleSlideButtonMouseLeave}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#545D4B]/10 hover:bg-[#545D4B] text-[#545D4B] hover:text-white border border-[#545D4B]/25 hover:border-[#545D4B] text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group/slidebtn whitespace-nowrap"
                            title={isSlideHoverPreviewEnabled ? `هاور ماوس: پیش‌نمایش سریع (۸۰٪ صفحه) | کلیک: نمایش تمام‌صفحه فرآیند "${item.processName}"` : `نمایش اسلاید تمام‌صفحه فرآیند "${item.processName}"`}
                          >
                            <Presentation className="h-3 w-3 group-hover/slidebtn:scale-110 transition-transform text-[#545D4B] group-hover/slidebtn:text-white" />
                            <span>نمایش اسلاید</span>
                          </button>
                        </td>
                      )}

                      {/* 11. SWITCH: Slide Presentation Switch Toggle */}
                      {isColVisible('slideToggle') && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isSelectedForSlide}
                              onClick={(e) => {
                                handleToggleSlide(item, e);
                              }}
                              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                isSelectedForSlide ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                              title={isSelectedForSlide ? 'اسلاید فعال است' : 'اسلاید خاموش است'}
                            >
                              <span className="sr-only">سوییچ نمایش اسلایدی</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isSelectedForSlide ? '-translate-x-3.5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold min-w-[28px] text-right ${isSelectedForSlide ? 'text-blue-700' : 'text-[#8A8880]'}`}>
                              {isSelectedForSlide ? 'فعال' : 'خاموش'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 12. Edit & Delete Actions */}
                      {isColVisible('actions') && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded-md text-[#8A8880] hover:text-[#545D4B] hover:bg-[#EFEFEA] transition cursor-pointer"
                              title="ویرایش کامل مشخصات فرآیند"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`آیا از حذف فرآیند "${item.processName}" اطمینان دارید؟`)) {
                                  onDeleteEraItem(item.id);
                                  if (filterExecutionMode === 'server') {
                                    setServerTriggerCounter(c => c + 1);
                                  }
                                }
                              }}
                              className="p-1 rounded-md text-[#8A8880] hover:text-[#9C3A27] hover:bg-[#FAECE8] transition cursor-pointer"
                              title="حذف فرآیند"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Toolbar (when in server mode) */}
        {filterExecutionMode === 'server' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#5A5852] border-t border-[#E8E6DF]">
            <div className="flex items-center gap-2">
              <span>تعداد در هر صفحه:</span>
              <select
                value={serverPageSize}
                onChange={e => setServerPageSize(Number(e.target.value))}
                className="bg-white border border-[#DDDBCF] rounded-lg px-2 py-1 text-xs text-[#2D2C28] font-bold focus:outline-none focus:ring-2 focus:ring-[#545D4B]"
              >
                <option value={10}>۱۰ مورد</option>
                <option value={15}>۱۵ مورد</option>
                <option value={25}>۲۵ مورد</option>
                <option value={50}>۵۰ مورد</option>
                <option value={100}>۱۰۰ مورد</option>
              </select>
              <span className="text-[#8A8880] mr-2">
                (صفحه {formatNumber(serverPage)} از {formatNumber(serverTotalPages || 1)} - مجموع {formatNumber(serverTotal)} رکورد)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={serverPage <= 1 || serverLoading}
                onClick={() => setServerPage(1)}
                className="p-1.5 rounded-lg border border-[#DDDBCF] bg-white text-[#2D2C28] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="صفحه اول"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={serverPage <= 1 || serverLoading}
                onClick={() => setServerPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDDBCF] bg-white text-[#2D2C28] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                title="صفحه قبلی"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <span>قبلی</span>
              </button>

              <span className="px-3 py-1 rounded-lg bg-[#545D4B] text-white font-bold text-xs">
                {serverPage}
              </span>

              <button
                type="button"
                disabled={serverPage >= serverTotalPages || serverLoading}
                onClick={() => setServerPage(p => Math.min(serverTotalPages, p + 1))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDDBCF] bg-white text-[#2D2C28] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                title="صفحه بعدی"
              >
                <span>بعدی</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={serverPage >= serverTotalPages || serverLoading}
                onClick={() => setServerPage(serverTotalPages)}
                className="p-1.5 rounded-lg border border-[#DDDBCF] bg-white text-[#2D2C28] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="صفحه آخر"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Process Presentation Modal for Managers & Image Management */}
      <ProcessPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        item={presentationItem}
        allItems={filterExecutionMode === 'server' ? serverItems : filteredItems}
        onSelectItem={(newItem) => setPresentationItem(newItem)}
        onUpdateItem={(item) => {
          onUpdateEraItem(item);
          if (filterExecutionMode === 'server') {
            setServerTriggerCounter(c => c + 1);
          }
        }}
      />

      {/* Manual Entry & Edit Modal */}
      <EraFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(itemData) => {
          if (editingItem) {
            onUpdateEraItem({ ...editingItem, ...itemData });
          } else {
            onAddEraItem(itemData);
          }
          if (filterExecutionMode === 'server') {
            setServerTriggerCounter(c => c + 1);
          }
        }}
        initialItem={editingItem}
        existingUnits={allUnits}
        existingProcesses={allProcesses}
        onOpenBpmnDesigner={(item) => {
          setIsModalOpen(false);
          setActiveBpmnItem(item);
          setIsBpmnModalOpen(true);
        }}
      />

      {/* BPMN 2.0 Process Modeler & Designer Modal */}
      {isBpmnModalOpen && activeBpmnItem && (
        <BpmnDesignerModal
          isOpen={isBpmnModalOpen}
          onClose={() => {
            setIsBpmnModalOpen(false);
            setActiveBpmnItem(null);
          }}
          item={activeBpmnItem}
          onSaveBpmn={async (itemId, bpmnXml, bpmnSvg) => {
            if (onSaveBpmn) {
              await onSaveBpmn(itemId, bpmnXml, bpmnSvg);
            } else {
              onUpdateEraItem({
                id: itemId,
                bpmnXml,
                bpmnSvg,
                hasBpmn: true
              });
            }
            setActiveBpmnItem(prev => prev ? { ...prev, bpmnXml, bpmnSvg, hasBpmn: true } : null);
            if (filterExecutionMode === 'server') {
              setServerTriggerCounter(c => c + 1);
            }
          }}
        />
      )}

      {/* Fullscreen Single Process Slide Presentation (Exact Slide from Slideshow View) */}
      {viewingFullscreenSlideItem && (
        <SlideshowView
          key={`slide-modal-${viewingFullscreenSlideItem.id}`}
          items={filterExecutionMode === 'server' ? serverItems : (filteredItems.length > 0 ? filteredItems : eraItems)}
          initialItemId={viewingFullscreenSlideItem.id}
          isModal={true}
          onToggleSlideItem={onToggleSlide}
          onOpenEdit={(item) => {
            setViewingFullscreenSlideItem(null);
            handleOpenEdit(item);
          }}
          onOpenBpmnDesigner={(item) => {
            setViewingFullscreenSlideItem(null);
            setActiveBpmnItem(item);
            setIsBpmnModalOpen(true);
          }}
          onClose={() => setViewingFullscreenSlideItem(null)}
          slideBeforeAfterUnderImage={eraVisibility?.slideBeforeAfterUnderImage ?? true}
          onToggleBeforeAfterPosition={onToggleEraVisibility ? (val) => onToggleEraVisibility('slideBeforeAfterUnderImage', val) : undefined}
        />
      )}

      {/* Slide Hover Preview Modal (80% screen, warm cream slide theme) */}
      <AnimatePresence>
        {isSlideHoverPreviewEnabled && hoveredSlideItem && !viewingFullscreenSlideItem && (
          <EraSlideHoverPreview
            key={hoveredSlideItem.id || 'slide-hover-preview'}
            item={hoveredSlideItem}
            slideBeforeAfterUnderImage={eraVisibility?.slideBeforeAfterUnderImage ?? true}
            onOpenFullscreen={() => {
              const target = hoveredSlideItem;
              setHoveredSlideItem(null);
              setViewingFullscreenSlideItem(target);
            }}
            onClose={() => setHoveredSlideItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Gemini AI Bar Chart & Effective Actions Analysis Modal */}
      <AiChartAnalysisModal
        isOpen={isAiChartModalOpen}
        onClose={() => setIsAiChartModalOpen(false)}
        chartType="era"
        chartData={unitDistributionData}
        appliedFilters={{
          unit: selectedUnit,
          opType: selectedOpType,
          entityType: selectedEntityType,
          startDate,
          endDate,
          slideFilter,
          searchQuery: debouncedSearchQuery
        }}
        metrics={{
          totalItems: filteredItems.length,
          newCount: newFormsCount,
          fixCount: modifiedFormsCount,
          autoCount: automationFormsCount,
          uniqueUnits: allUnits.length
        }}
        onOpenGeneralAiChat={onOpenGeneralAiChat}
      />
    </div>
  );
};
