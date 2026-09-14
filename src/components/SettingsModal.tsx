import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ShieldAlert,
  HelpCircle,
  Search,
  Tag,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Settings,
  Sparkles,
  Info,
  FilterX,
  FileSpreadsheet,
  Save,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Bug,
  Code,
  Download,
  Upload,
  HardDrive,
  Archive,
  RefreshCw,
  FileJson,
  Loader2,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  Key,
  KeyRound,
  ArrowDownCircle,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  ImageOff,
  Presentation,
  Workflow
} from 'lucide-react';
import { CauseRule, ExclusionRule, ProcessedLetter, EraVisibilitySettings, EraColumnVisibility, DEFAULT_ERA_COLUMN_VISIBILITY } from '../types';
import { classifyLetterCause, isLetterExcluded, formatNumber } from '../utils/parser';
import { SearchableSelect } from './SearchableSelect';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Exclusion Rules
  exclusionRules: ExclusionRule[];
  onAddExclusion: (rule: Partial<ExclusionRule>) => Promise<void>;
  onUpdateExclusion: (id: string, rule: Partial<ExclusionRule>) => Promise<void>;
  onDeleteExclusion: (id: string) => Promise<void>;
  onResetExclusions: () => Promise<void>;
  // Cause Rules
  causeRules: CauseRule[];
  onAddCauseRule: (rule: Partial<CauseRule>) => Promise<void>;
  onUpdateCauseRule: (id: string, rule: Partial<CauseRule>) => Promise<void>;
  onDeleteCauseRule: (id: string) => Promise<void>;
  onResetCauseRules: () => Promise<void>;
  // Unit Cause Visibility Settings
  unitCauseVisibility?: Record<string, boolean>;
  onToggleUnitCauseVisibility?: (unit: string, isVisible: boolean) => void;
  onSetAllUnitsCauseVisibility?: (isVisible: boolean) => void;
  onSaveAllUnitsCauseVisibility?: (config: Record<string, boolean>) => Promise<void>;
  // Data for preview & stats
  allLetters: ProcessedLetter[];
  allUnits: string[];
  totalEraCount?: number;
  initialTab?: 'exclusions' | 'causes' | 'system' | 'backup';
  // Floating AI BI Assistant Button Toggle
  showFloatingAiButton?: boolean;
  onToggleFloatingAiButton?: (show: boolean) => void;
  // AI Debug Mode Toggle
  aiDebugMode?: boolean;
  onToggleAiDebugMode?: (enabled: boolean) => void;
  // Filter Execution Mode (Client-Side In-Memory vs. Server-Side SQLite)
  filterExecutionMode?: 'client' | 'server';
  onToggleFilterExecutionMode?: (mode: 'client' | 'server') => void;
  // ERA Dashboard Visibility Settings
  eraVisibility?: EraVisibilitySettings;
  onToggleEraVisibility?: (key: keyof EraVisibilitySettings, val: boolean) => void;
  onToggleEraColumnVisibility?: (colKey: keyof EraColumnVisibility, val: boolean) => void;
  onSetAllEraColumnsVisibility?: (val: boolean) => void;
  onResetEraColumnsVisibility?: () => void;
  onOpenAiModal?: () => void;
  onDataRestored?: () => Promise<void>;
}

const PRESET_EXCLUSION_KEYWORDS = [
  'تست',
  'آزمایشی',
  'test',
  'پایلوت',
  'نمونه',
  'تمرینی',
  'پیش‌نویس',
  'خطای سیستمی'
];

const PRESET_CAUSE_COLORS = [
  { name: 'آبی نیلی (بانکی)', value: '#2563EB' },
  { name: 'سبز زمردی', value: '#16A34A' },
  { name: 'کهربایی / خردلی', value: '#D97706' },
  { name: 'زرشکی / قرمز', value: '#DC2626' },
  { name: 'بنفش سلطنتی', value: '#7C3AED' },
  { name: 'خاکستری تیره', value: '#4B5563' },
  { name: 'سبز مریم‌گلی', value: '#545D4B' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  exclusionRules,
  onAddExclusion,
  onUpdateExclusion,
  onDeleteExclusion,
  onResetExclusions,
  causeRules,
  onAddCauseRule,
  onUpdateCauseRule,
  onDeleteCauseRule,
  onResetCauseRules,
  unitCauseVisibility = {},
  onToggleUnitCauseVisibility,
  onSetAllUnitsCauseVisibility,
  onSaveAllUnitsCauseVisibility,
  allLetters,
  allUnits,
  totalEraCount = 0,
  initialTab = 'causes',
  showFloatingAiButton = false,
  onToggleFloatingAiButton,
  aiDebugMode = false,
  onToggleAiDebugMode,
  filterExecutionMode = 'server',
  onToggleFilterExecutionMode,
  eraVisibility = { showHeader: false, showMetrics: false, showEntityChips: false, autoScrollToTable: false, slideHoverPreview: false, showAiChartAnalysis: false, slideBeforeAfterUnderImage: true },
  onToggleEraVisibility,
  onToggleEraColumnVisibility,
  onSetAllEraColumnsVisibility,
  onResetEraColumnsVisibility,
  onOpenAiModal,
  onDataRestored
}) => {
  const [activeTab, setActiveTab] = useState<'exclusions' | 'causes' | 'system' | 'backup'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --- Tab Navigation Drag, Wheel & Scroll State for Desktop & Mobile ---
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState<boolean>(false);
  const isDraggingTabsRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftStartRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);
  const rtlTypeRef = useRef<'negative' | 'positive'>('negative');
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);

  // Check scroll boundaries to show/hide navigation arrows on overflow
  const updateTabScrollIndicators = () => {
    const el = tabsNavRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setCanScrollRight(false);
      setCanScrollLeft(false);
      return;
    }
    const absScroll = Math.abs(el.scrollLeft);
    if (rtlTypeRef.current === 'negative') {
      setCanScrollRight(el.scrollLeft < -4);
      setCanScrollLeft(absScroll < maxScroll - 4);
    } else {
      setCanScrollRight(el.scrollLeft > 4);
      setCanScrollLeft(el.scrollLeft < maxScroll - 4);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    try {
      const testDiv = document.createElement('div');
      testDiv.dir = 'rtl';
      testDiv.style.position = 'absolute';
      testDiv.style.top = '-9999px';
      testDiv.style.width = '4px';
      testDiv.style.height = '4px';
      testDiv.style.overflow = 'scroll';
      testDiv.innerHTML = '<div style="width: 20px; height: 1px;"></div>';
      document.body.appendChild(testDiv);
      if (testDiv.scrollLeft > 0) {
        rtlTypeRef.current = 'positive';
      } else {
        testDiv.scrollLeft = -1;
        rtlTypeRef.current = testDiv.scrollLeft < 0 ? 'negative' : 'positive';
      }
      document.body.removeChild(testDiv);
    } catch {
      rtlTypeRef.current = 'negative';
    }

    const timer = setTimeout(updateTabScrollIndicators, 120);
    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  useEffect(() => {
    const el = tabsNavRef.current;
    if (!el || !isOpen) return;

    const handleScroll = () => updateTabScrollIndicators();
    const handleResize = () => updateTabScrollIndicators();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Allow horizontal scrolling via vertical mouse wheel
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        if (rtlTypeRef.current === 'negative') {
          el.scrollLeft -= e.deltaY;
        } else {
          el.scrollLeft += e.deltaY;
        }
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    const handleGlobalMouseUp = () => {
      if (isDraggingTabsRef.current) {
        isDraggingTabsRef.current = false;
        setIsDraggingTabs(false);
        setTimeout(() => {
          hasMovedRef.current = false;
        }, 80);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isOpen]);

  const handleMouseDownTabs = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = tabsNavRef.current;
    if (!el) return;
    isDraggingTabsRef.current = true;
    setIsDraggingTabs(true);
    startXRef.current = e.pageX;
    scrollLeftStartRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handleMouseMoveTabs = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabsRef.current || !tabsNavRef.current) return;
    const deltaX = e.pageX - startXRef.current;
    if (Math.abs(deltaX) > 3) {
      hasMovedRef.current = true;
    }
    const el = tabsNavRef.current;
    if (rtlTypeRef.current === 'negative') {
      el.scrollLeft = scrollLeftStartRef.current + deltaX;
    } else {
      el.scrollLeft = scrollLeftStartRef.current - deltaX;
    }
  };

  const handleMouseUpTabs = () => {
    if (isDraggingTabsRef.current) {
      isDraggingTabsRef.current = false;
      setIsDraggingTabs(false);
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 80);
    }
  };

  const scrollTabsDirection = (dir: 'right' | 'left') => {
    const el = tabsNavRef.current;
    if (!el) return;
    const distance = 180;
    if (dir === 'right') {
      if (rtlTypeRef.current === 'negative') {
        el.scrollTo({ left: Math.min(0, el.scrollLeft + distance), behavior: 'smooth' });
      } else {
        el.scrollTo({ left: Math.max(0, el.scrollLeft - distance), behavior: 'smooth' });
      }
    } else {
      if (rtlTypeRef.current === 'negative') {
        el.scrollTo({ left: el.scrollLeft - distance, behavior: 'smooth' });
      } else {
        el.scrollTo({ left: el.scrollLeft + distance, behavior: 'smooth' });
      }
    }
  };

  const handleTabClick = (tabKey: 'exclusions' | 'causes' | 'system' | 'backup', e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setActiveTab(tabKey);
  };

  // --- Gemini API Key Configuration State ---
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKeyText, setShowApiKeyText] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<{
    hasKey: boolean;
    source: 'database' | 'env' | 'none';
    maskedKey: string | null;
    model: string;
  } | null>(null);
  const [isLoadingAiConfig, setIsLoadingAiConfig] = useState<boolean>(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState<boolean>(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState<boolean>(false);
  const [isDeletingApiKey, setIsDeletingApiKey] = useState<boolean>(false);
  const [apiKeyStatusMsg, setApiKeyStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    latency?: number;
  } | null>(null);

  const fetchAiConfig = async () => {
    setIsLoadingAiConfig(true);
    try {
      const config = await api.getAiConfig();
      setAiConfig(config);
    } catch (err: any) {
      console.warn('Failed to load AI config:', err);
    } finally {
      setIsLoadingAiConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'system') {
      fetchAiConfig();
    }
  }, [isOpen, activeTab]);

  // --- Backup & Restore State ---
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [includeClientStorage, setIncludeClientStorage] = useState<boolean>(true);
  const [backupIncludeImages, setBackupIncludeImages] = useState<boolean>(true);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string | null>(null);
  const [directDownloadFileName, setDirectDownloadFileName] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [backupError, setBackupError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState<any | null>(null);
  const [selectedBackupFileName, setSelectedBackupFileName] = useState<string | null>(null);
  const [parsedBackupSummary, setParsedBackupSummary] = useState<{
    appName: string;
    exportDate: string;
    lettersCount: number;
    eraCount: number;
    imagesCount: number;
    includeImages?: boolean;
    causeRulesCount: number;
    exclusionRulesCount: number;
    clientStorageKeysCount: number;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Exclusion Form State ---
  const [editingExclusionId, setEditingExclusionId] = useState<string | null>(null);
  const [exKeyword, setExKeyword] = useState<string>('');
  const [exTargetUnit, setExTargetUnit] = useState<string>('all');
  const [exMatchType, setExMatchType] = useState<'contains' | 'exact' | 'startsWith'>('contains');
  const [exField, setExField] = useState<'subject' | 'unit' | 'creator' | 'actionType' | 'all'>('subject');
  const [exReason, setExReason] = useState<string>('');
  const [exSearch, setExSearch] = useState<string>('');
  const [isSubmittingEx, setIsSubmittingEx] = useState<boolean>(false);

  // Live Exclusion Test simulator
  const [testExSubject, setTestExSubject] = useState<string>('حذف سند ثبت تست سیستم حسابداری');
  const [testExUnit, setTestExUnit] = useState<string>('حسابداری مالی');
  const [testExCreator, setTestExCreator] = useState<string>('');
  const [testExActionType, setTestExActionType] = useState<string>('حذف');
  const [showExcludedList, setShowExcludedList] = useState<boolean>(false);

  // --- Cause Form State ---
  const [editingCauseId, setEditingCauseId] = useState<string | null>(null);
  const [cKeyword, setCKeyword] = useState<string>('');
  const [cCause, setCCause] = useState<string>('بانکی');
  const [cTargetUnit, setCTargetUnit] = useState<string>('all');
  const [cMatchType, setCMatchType] = useState<'contains' | 'exact' | 'startsWith'>('contains');
  const [cTargetField, setCTargetField] = useState<string>('all');
  const [cCustomFieldName, setCCustomFieldName] = useState<string>('');
  const [cColor, setCColor] = useState<string>('#2563EB');
  const [cDescription, setCDescription] = useState<string>('');
  const [cSearch, setCSearch] = useState<string>('');
  const [isSubmittingC, setIsSubmittingC] = useState<boolean>(false);

  // Live Cause Test simulator
  const [testCText, setTestCText] = useState<string>('بانک از حساب شرکت برداشت نگردیده است');
  const [testCUnit, setTestCUnit] = useState<string>('حسابداری مالی');
  const [testCField, setTestCField] = useState<string>('all');

  // --- Unit Cause Visibility Dedicated State (Dropdown + List + Save) ---
  const [localVisibilityConfig, setLocalVisibilityConfig] = useState<Record<string, boolean>>({});
  const [selectedUnitToAdd, setSelectedUnitToAdd] = useState<string>('');
  const [isSavingVisibility, setIsSavingVisibility] = useState<boolean>(false);
  const [visibilitySavedFeedback, setVisibilitySavedFeedback] = useState<boolean>(false);
  const [unitFilterSearch, setUnitFilterSearch] = useState<string>('');

  // Sync with prop when modal opens or when external config changes
  useEffect(() => {
    if (isOpen) {
      setLocalVisibilityConfig(unitCauseVisibility || {});
    }
  }, [isOpen, unitCauseVisibility]);

  // Distinct all units merged from allUnits prop, raw letters, and allLetters records
  const distinctUnits = useMemo(() => {
    const set = new Set<string>();
    (allUnits || []).forEach(u => {
      if (u && typeof u === 'string' && u.trim() !== '' && u !== 'نامشخص') {
        set.add(u.trim());
      }
    });
    (allLetters || []).forEach(l => {
      if (l.orgUnit && l.orgUnit !== 'نامشخص' && l.orgUnit.trim() !== '') {
        set.add(l.orgUnit.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [allUnits, allLetters]);

  // Distinct creator names from loaded dataset
  const distinctCreators = useMemo(() => {
    const set = new Set<string>();
    (allLetters || []).forEach(l => {
      if (l.creatorName && l.creatorName.trim() !== '' && l.creatorName !== 'نامشخص') {
        set.add(l.creatorName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [allLetters]);

  // Distinct columns and attributes extracted from imported dataset & standard headers
  const availableExcelColumns = useMemo(() => {
    const colsSet = new Set<string>();
    const standardFields = [
      'یادداشت',
      'موضوع',
      'شرح',
      'واحد سازمانی',
      'گیرنده',
      'فرستنده',
      'ایجاد کننده نامه',
      'نوع مکاتبه',
      'شماره ثبت',
      'تاریخ ثبت',
      'فوریت',
      'طبقه بندی اطلاعاتی',
      'جهت مکاتبه'
    ];
    standardFields.forEach(f => colsSet.add(f));

    (allLetters || []).forEach(l => {
      if (l.raw && typeof l.raw === 'object') {
        Object.keys(l.raw).forEach(k => {
          if (k && !k.startsWith('_') && k.trim() !== '') {
            colsSet.add(k.trim());
          }
        });
      }
    });
    return Array.from(colsSet);
  }, [allLetters]);

  // Unit letter counts for context
  const unitLetterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allLetters.forEach(l => {
      if (!l.isExcluded && l.orgUnit) {
        map[l.orgUnit] = (map[l.orgUnit] || 0) + 1;
      }
    });
    return map;
  }, [allLetters]);

  // List of organizational units currently enabled/selected
  const selectedUnitsList = useMemo(() => {
    return distinctUnits.filter(u => localVisibilityConfig[u] === true);
  }, [distinctUnits, localVisibilityConfig]);

  // List of organizational units not yet added (available in dropdown)
  const unselectedUnitsList = useMemo(() => {
    return distinctUnits.filter(u => localVisibilityConfig[u] !== true);
  }, [distinctUnits, localVisibilityConfig]);

  // Filtered active units list for search box
  const filteredActiveUnits = useMemo(() => {
    if (!unitFilterSearch.trim()) return selectedUnitsList;
    return selectedUnitsList.filter(u => u.toLowerCase().includes(unitFilterSearch.trim().toLowerCase()));
  }, [selectedUnitsList, unitFilterSearch]);

  // Actions for unit cause visibility
  const handleAddUnitToVisibility = (unitName: string) => {
    if (!unitName) return;
    setLocalVisibilityConfig(prev => ({
      ...prev,
      [unitName]: true
    }));
    setSelectedUnitToAdd('');
    setVisibilitySavedFeedback(false);
  };

  const handleRemoveUnitFromVisibility = (unitName: string) => {
    setLocalVisibilityConfig(prev => ({
      ...prev,
      [unitName]: false
    }));
    setVisibilitySavedFeedback(false);
  };

  const handleAddAllUnitsToVisibility = () => {
    const next: Record<string, boolean> = { ...localVisibilityConfig, all: true };
    distinctUnits.forEach(u => {
      next[u] = true;
    });
    setLocalVisibilityConfig(next);
    setVisibilitySavedFeedback(false);
  };

  const handleClearAllUnitsVisibility = () => {
    const next: Record<string, boolean> = { all: false };
    distinctUnits.forEach(u => {
      next[u] = false;
    });
    setLocalVisibilityConfig(next);
    setVisibilitySavedFeedback(false);
  };

  const handleSaveVisibility = async () => {
    setIsSavingVisibility(true);
    try {
      if (onSaveAllUnitsCauseVisibility) {
        await onSaveAllUnitsCauseVisibility(localVisibilityConfig);
      } else if (onToggleUnitCauseVisibility) {
        Object.entries(localVisibilityConfig).forEach(([u, v]) => {
          onToggleUnitCauseVisibility(u, v);
        });
      }
      setVisibilitySavedFeedback(true);
      setTimeout(() => setVisibilitySavedFeedback(false), 4000);
    } finally {
      setIsSavingVisibility(false);
    }
  };

  // Calculate Excluded Letters from loaded dataset
  const excludedLetters = useMemo(() => {
    return allLetters.filter(l => isLetterExcluded(l, exclusionRules).isExcluded);
  }, [allLetters, exclusionRules]);

  // Live exclusion test simulation
  const liveExclusionResult = useMemo(() => {
    return isLetterExcluded({
      subject: testExSubject,
      originalSubject: testExSubject,
      orgUnit: testExUnit === 'all' ? '' : testExUnit,
      creatorName: testExCreator,
      creatorRaw: testExCreator,
      actionType: testExActionType,
      description: testExSubject
    }, exclusionRules);
  }, [testExSubject, testExUnit, testExCreator, testExActionType, exclusionRules]);

  // Live cause test simulation
  const liveCauseResult = useMemo(() => {
    const rawData: Record<string, any> = {};
    if (testCField && testCField !== 'all') {
      rawData[testCField] = testCText;
    }
    return classifyLetterCause({
      subject: testCText,
      originalSubject: testCText,
      orgUnit: testCUnit === 'all' ? '' : testCUnit,
      note: testCText,
      description: testCText,
      raw: rawData
    }, causeRules);
  }, [testCText, testCUnit, testCField, causeRules]);

  if (!isOpen) return null;

  // --- Exclusion Handlers ---
  const resetExForm = () => {
    setEditingExclusionId(null);
    setExKeyword('');
    setExTargetUnit('all');
    setExMatchType('contains');
    setExField('subject');
    setExReason('');
  };

  const handleStartEditExclusion = (rule: ExclusionRule) => {
    setEditingExclusionId(rule.id);
    setExKeyword(rule.keyword);
    setExTargetUnit(rule.targetUnit || 'all');
    setExMatchType(rule.matchType || 'contains');
    setExField(rule.field || 'subject');
    setExReason(rule.reason || '');
  };

  const handleSaveExclusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exKeyword.trim()) return;

    try {
      setIsSubmittingEx(true);
      if (editingExclusionId) {
        await onUpdateExclusion(editingExclusionId, {
          keyword: exKeyword.trim(),
          targetUnit: exTargetUnit === 'all' ? null : exTargetUnit.trim(),
          matchType: exMatchType,
          field: exField,
          reason: exReason.trim() || `عدم احتساب در آمار با کلمه «${exKeyword.trim()}»`
        });
      } else {
        await onAddExclusion({
          keyword: exKeyword.trim(),
          targetUnit: exTargetUnit === 'all' ? null : exTargetUnit.trim(),
          matchType: exMatchType,
          field: exField,
          isActive: true,
          reason: exReason.trim() || `عدم احتساب در آمار با کلمه «${exKeyword.trim()}»`
        });
      }
      resetExForm();
    } finally {
      setIsSubmittingEx(false);
    }
  };

  // --- Cause Handlers ---
  const resetCauseForm = () => {
    setEditingCauseId(null);
    setCKeyword('');
    setCCause('بانکی');
    setCTargetUnit('all');
    setCMatchType('contains');
    setCTargetField('all');
    setCCustomFieldName('');
    setCColor('#2563EB');
    setCDescription('');
  };

  const handleStartEditCause = (rule: CauseRule) => {
    setEditingCauseId(rule.id);
    setCKeyword(rule.keyword);
    setCCause(rule.cause);
    setCTargetUnit(rule.targetUnit || 'all');
    setCMatchType(rule.matchType || 'contains');
    const field = rule.targetField || 'all';
    const standardFields = ['all', 'یادداشت', 'موضوع', 'شرح', 'واحد سازمانی', 'گیرنده', 'فرستنده', 'ایجاد کننده نامه', 'نوع مکاتبه', 'شماره ثبت'];
    if (availableExcelColumns.includes(field) || standardFields.includes(field)) {
      setCTargetField(field);
      setCCustomFieldName('');
    } else {
      setCTargetField('custom');
      setCCustomFieldName(field);
    }
    setCColor(rule.color || '#2563EB');
    setCDescription(rule.description || '');
  };

  const handleSaveCause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cKeyword.trim() || !cCause.trim()) return;

    const finalField = (cTargetField === 'custom' ? cCustomFieldName.trim() : cTargetField) || 'all';

    try {
      setIsSubmittingC(true);
      if (editingCauseId) {
        await onUpdateCauseRule(editingCauseId, {
          keyword: cKeyword.trim(),
          cause: cCause.trim(),
          targetUnit: cTargetUnit === 'all' ? null : cTargetUnit.trim(),
          matchType: cMatchType,
          targetField: finalField,
          color: cColor,
          description: cDescription.trim() || null
        });
      } else {
        await onAddCauseRule({
          keyword: cKeyword.trim(),
          cause: cCause.trim(),
          targetUnit: cTargetUnit === 'all' ? null : cTargetUnit.trim(),
          matchType: cMatchType,
          targetField: finalField,
          color: cColor,
          description: cDescription.trim() || null,
          isActive: true,
          priority: 10
        });
      }
      resetCauseForm();
    } finally {
      setIsSubmittingC(false);
    }
  };

  const filteredExclusions = exclusionRules.filter(r => {
    if (!exSearch.trim()) return true;
    const q = exSearch.toLowerCase();
    return (
      r.keyword.toLowerCase().includes(q) ||
      (r.targetUnit && r.targetUnit.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    );
  });

  const filteredCauses = causeRules.filter(r => {
    if (!cSearch.trim()) return true;
    const q = cSearch.toLowerCase();
    return (
      r.keyword.toLowerCase().includes(q) ||
      r.cause.toLowerCase().includes(q) ||
      (r.targetUnit && r.targetUnit.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  // --- Backup Handlers ---
  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupError(null);
    setDirectDownloadUrl(null);
    try {
      const blob = await api.exportBackup(includeClientStorage, backupIncludeImages);
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileTypeSuffix = backupIncludeImages ? 'with_images' : 'no_images';
      const fileName = `bi_era_backup_${fileTypeSuffix}_${dateStr}.json`;
      
      setDirectDownloadUrl(url);
      setDirectDownloadFileName(fileName);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Delay cleaning up DOM & URL so browser download manager finishes without aborting
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 5000);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 180000);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 10000);
    } catch (err: any) {
      console.error('Backup export failed:', err);
      // Fallback: direct GET endpoint
      try {
        const directUrl = `/api/backup/export?includeImages=${backupIncludeImages}`;
        const fallbackLink = document.createElement('a');
        fallbackLink.href = directUrl;
        fallbackLink.setAttribute('download', `bi_era_backup_${backupIncludeImages ? 'with_images' : 'no_images'}.json`);
        fallbackLink.setAttribute('target', '_blank');
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        setTimeout(() => {
          if (fallbackLink.parentNode) document.body.removeChild(fallbackLink);
        }, 5000);
        setExportSuccess(true);
      } catch (fallbackErr: any) {
        setBackupError(err.message || 'خطا در صدور و دریافت فایل پشتیبان.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAndInspectBackupFile(file);
  };

  const handleBackupDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readAndInspectBackupFile(file);
  };

  const readAndInspectBackupFile = (file: File) => {
    setBackupError(null);
    setImportSuccessMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const payload = parsed.data || parsed;
        const letters = Array.isArray(payload.letters) ? payload.letters : [];
        const eraProcesses = Array.isArray(payload.eraProcesses) ? payload.eraProcesses : [];
        const processImages = Array.isArray(payload.processImages) ? payload.processImages : [];
        const causeRules = Array.isArray(payload.causeRules) ? payload.causeRules : [];
        const exclusionRules = Array.isArray(payload.exclusionRules) ? payload.exclusionRules : [];
        const clientStorage = payload.clientStorage || {};

        if (letters.length === 0 && eraProcesses.length === 0 && causeRules.length === 0 && exclusionRules.length === 0) {
          setBackupError('ساختار فایل پشتیبان نامعتبر است یا رکوردی در آن یافت نشد.');
          setSelectedBackupFile(null);
          setSelectedBackupFileName(null);
          setParsedBackupSummary(null);
          return;
        }

        const imagesCount = processImages.length || (parsed.metadata?.summary?.totalProcessImages || 0);
        const includeImagesFlag = parsed.metadata?.includeImages ?? (imagesCount > 0);

        setSelectedBackupFile(parsed);
        setSelectedBackupFileName(file.name);
        setParsedBackupSummary({
          appName: parsed.metadata?.appName || 'فایل پشتیبان سامانه',
          exportDate: parsed.metadata?.exportTimestamp ? new Date(parsed.metadata.exportTimestamp).toLocaleString('fa-IR') : 'نامشخص',
          lettersCount: letters.length,
          eraCount: eraProcesses.length,
          imagesCount,
          includeImages: includeImagesFlag,
          causeRulesCount: causeRules.length,
          exclusionRulesCount: exclusionRules.length,
          clientStorageKeysCount: Object.keys(clientStorage).length
        });
      } catch (err: any) {
        console.error('Parse backup file error:', err);
        setBackupError('خطا در تجزیه فایل JSON: فرمت فایل انتخابی معتبر نمی‌باشد.');
        setSelectedBackupFile(null);
        setSelectedBackupFileName(null);
        setParsedBackupSummary(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupFile) return;
    setIsRestoring(true);
    setBackupError(null);
    setImportSuccessMessage(null);
    try {
      const result = await api.restoreBackup(selectedBackupFile, restoreMode);
      setImportSuccessMessage(`بازیابی اطلاعات با موفقیت انجام شد: ${formatNumber(result.summary?.totalLetters || 0)} نامه و ${formatNumber(result.summary?.totalEra || 0)} فرآیند ERA با موفقیت بارگذاری و مستقر شدند.`);
      setSelectedBackupFile(null);
      setSelectedBackupFileName(null);
      setParsedBackupSummary(null);
      if (onDataRestored) {
        await onDataRestored();
      }
    } catch (err: any) {
      console.error('Backup restore failed:', err);
      setBackupError(err.message || 'خطا در بارگذاری و بازیابی اطلاعات در پایگاه داده.');
    } finally {
      setIsRestoring(false);
    }
  };

  // --- Gemini API Key Action Handlers ---
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyStatusMsg({
        type: 'error',
        text: 'لطفاً ابتدا کلید API جمنای را در فیلد مربوطه وارد نمایید.'
      });
      return;
    }
    setIsSavingApiKey(true);
    setApiKeyStatusMsg(null);
    try {
      const result = await api.saveApiKey(apiKeyInput.trim());
      setApiKeyStatusMsg({
        type: 'success',
        text: `${result.message} (کلید ذخیره‌شده: ${result.maskedKey})`
      });
      setApiKeyInput('');
      await fetchAiConfig();
    } catch (err: any) {
      console.error('Save API key error:', err);
      setApiKeyStatusMsg({
        type: 'error',
        text: err.message || 'خطا در ذخیره‌سازی کلید API'
      });
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleTestApiKey = async (testInputOnly: boolean = false) => {
    const keyToTest = testInputOnly || apiKeyInput.trim() ? apiKeyInput.trim() : undefined;
    setIsTestingApiKey(true);
    setApiKeyStatusMsg(null);
    try {
      const result = await api.testApiKey(keyToTest);
      setApiKeyStatusMsg({
        type: 'success',
        text: `${result.message} (ارتباط با مدل ${result.model || 'Gemini'} پایدار است)`,
        latency: result.latencyMs
      });
    } catch (err: any) {
      console.error('Test API key error:', err);
      setApiKeyStatusMsg({
        type: 'error',
        text: err.message || 'خطا در تست برقراری ارتباط با مدل Gemini'
      });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('آیا از حذف کلید API اختصاصی ذخیره‌شده در پایگاه داده اطمینان دارید؟')) return;
    setIsDeletingApiKey(true);
    setApiKeyStatusMsg(null);
    try {
      const result = await api.deleteApiKey();
      setApiKeyStatusMsg({
        type: 'info',
        text: result.message
      });
      await fetchAiConfig();
    } catch (err: any) {
      console.error('Delete API key error:', err);
      setApiKeyStatusMsg({
        type: 'error',
        text: err.message || 'خطا در حذف کلید API'
      });
    } finally {
      setIsDeletingApiKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-[#FAFAF7] w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-[#DDDBCF] shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-[#E2E0D8] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF] shrink-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-[#2D2C28] truncate">
                  تنظیمات پیشرفته و قوانین آماری سامانه
                </h2>
                {excludedLetters.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA] whitespace-nowrap">
                    {formatNumber(excludedLetters.length)} نامه مستثنی‌شده
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#75746E] truncate hidden sm:block">
                فیلتر کلمات تستی، نادیده‌گیری از محاسبات، و تنظیم موتور قوانین منشأ درخواست‌ها
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#75746E] hover:text-[#2D2C28] hover:bg-[#EFEFEA] transition cursor-pointer shrink-0 mr-1"
            title="بستن پنجره"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Header (Smooth touch swipe on mobile + Mouse drag & wheel scrolling on desktop) */}
        <div className="relative bg-[#F2F1EB] border-b border-[#E2E0D8] select-none">
          {/* Right Arrow (RTL: Scroll back to initial tabs) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollTabsDirection('right')}
              className="hidden md:flex absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-[#2D2C28] shadow-sm border border-[#DDDBCF] items-center justify-center cursor-pointer transition hover:scale-105 active:scale-95"
              title="مشاهده تب‌های قبلی"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Left Arrow (RTL: Scroll to next tabs) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTabsDirection('left')}
              className="hidden md:flex absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-[#2D2C28] shadow-sm border border-[#DDDBCF] items-center justify-center cursor-pointer transition hover:scale-105 active:scale-95"
              title="مشاهده تب‌های بعدی"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={tabsNavRef}
            onMouseDown={handleMouseDownTabs}
            onMouseMove={handleMouseMoveTabs}
            onMouseUp={handleMouseUpTabs}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap ${
              isDraggingTabs ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <button
              type="button"
              onClick={(e) => handleTabClick('exclusions', e)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap select-none ${
                isDraggingTabs ? 'cursor-grabbing' : 'cursor-pointer'
              } ${
                activeTab === 'exclusions'
                  ? 'bg-white text-[#9C3A27] shadow-xs border border-[#E2E0D8]'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#E8E6DF]'
              }`}
            >
              <FilterX className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">قوانین استثنا</span>
              <span className="hidden sm:inline">قوانین استثنا و نادیده‌گیری (کلمات تستی)</span>
              <span className={`px-1.5 sm:px-2 py-0.2 rounded-full text-[10px] ${
                activeTab === 'exclusions' ? 'bg-[#FAECE8] text-[#9C3A27]' : 'bg-[#DDDBCF] text-[#5A5852]'
              }`}>
                {formatNumber(exclusionRules.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => handleTabClick('causes', e)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap select-none ${
                isDraggingTabs ? 'cursor-grabbing' : 'cursor-pointer'
              } ${
                activeTab === 'causes'
                  ? 'bg-white text-[#1E40AF] shadow-xs border border-[#E2E0D8]'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#E8E6DF]'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">موتور قوانین عامل</span>
              <span className="hidden sm:inline">موتور قوانین تعیین عامل (منشأ درخواست)</span>
              <span className={`px-1.5 sm:px-2 py-0.2 rounded-full text-[10px] ${
                activeTab === 'causes' ? 'bg-[#EFF6FF] text-[#1E40AF]' : 'bg-[#DDDBCF] text-[#5A5852]'
              }`}>
                {formatNumber(causeRules.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => handleTabClick('system', e)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap select-none ${
                isDraggingTabs ? 'cursor-grabbing' : 'cursor-pointer'
              } ${
                activeTab === 'system'
                  ? 'bg-white text-[#1E40AF] shadow-xs border border-[#E2E0D8]'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#E8E6DF]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 text-[#2563EB] shrink-0" />
              <span className="sm:hidden">تنظیمات سیستم و AI</span>
              <span className="hidden sm:inline">تنظیمات هوش مصنوعی و سیستم</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleTabClick('backup', e)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap select-none ${
                isDraggingTabs ? 'cursor-grabbing' : 'cursor-pointer'
              } ${
                activeTab === 'backup'
                  ? 'bg-white text-[#446347] shadow-xs border border-[#E2E0D8]'
                  : 'text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#E8E6DF]'
              }`}
            >
              <Archive className="h-4 w-4 text-[#446347] shrink-0" />
              <span className="sm:hidden">پشتیبان‌گیری و بازیابی</span>
              <span className="hidden sm:inline">پشتیبان‌گیری و بازیابی (Backup & Restore)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-6 flex-1 min-w-0">
          {/* ======================================================== */}
          {/* TAB 1: EXCLUSION RULES (فیلتر کلمات تستی و استثناها)       */}
          {/* ======================================================== */}
          {activeTab === 'exclusions' && (
            <div className="space-y-6">
              {/* Informational Hero Card */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EADBCE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#F4E8DC] text-[#8A4A20] shrink-0 mt-0.5">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#4D2E14]">
                      نحوه عملکرد قوانین استثنا (Exclusion Filter):
                    </h3>
                    <p className="text-xs text-[#7A5333] mt-1 leading-relaxed">
                      هر نامه‌ای که شامل کلیدواژه‌های تعریف‌شده زیر (مانند <strong className="font-bold text-[#8A2E1D]">«تست»</strong>، <strong className="font-bold text-[#8A2E1D]">«test»</strong> یا <strong className="font-bold text-[#8A2E1D]">«آزمایشی»</strong>) باشد، به صورت خودکار از کلیه محاسبات آماری، درصدها، نمودارهای سهم، روندها و جدول ماتریسی <strong className="font-bold">کنار گذاشته می‌شود</strong> تا آمار شرکت کاملاً واقعی و بدون نویز باشد.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-4 py-2 rounded-xl bg-white border border-[#EADBCE] text-center">
                    <div className="text-[10px] text-[#7A5333] font-medium">نامه‌های مستثنی شده</div>
                    <div className="text-lg font-extrabold text-[#9C3A27]">
                      {formatNumber(excludedLetters.length)} <span className="text-xs font-normal">نامه</span>
                    </div>
                  </div>
                  {excludedLetters.length > 0 && (
                    <button
                      onClick={() => setShowExcludedList(!showExcludedList)}
                      className="px-3 py-2 text-xs font-bold bg-[#9C3A27] text-white hover:bg-[#8A2E1D] rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{showExcludedList ? 'بستن لیست' : 'مشاهده نامه‌ها'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Excluded Letters Collapsible Table */}
              {showExcludedList && excludedLetters.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#F2D1CA] p-4 shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#F2D1CA] pb-2">
                    <div className="flex items-center gap-2">
                      <FilterX className="h-4 w-4 text-[#9C3A27]" />
                      <h4 className="text-xs font-bold text-[#9C3A27]">
                        لیست نامه‌های کنار گذاشته شده از آمار ({formatNumber(excludedLetters.length)} مورد):
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowExcludedList(false)}
                      className="text-xs text-[#75746E] hover:text-[#2D2C28] underline"
                    >
                      بستن
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-[#F5E5E0] text-xs">
                    {excludedLetters.map((l, i) => (
                      <div key={l.id || `excl-${i}`} className="py-2 flex items-center justify-between gap-4">
                        <div className="truncate flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#9C3A27] bg-[#FAECE8] px-1.5 py-0.5 rounded">
                            #{formatNumber(l.letterId ?? l.id)}
                          </span>
                          <span className="font-bold text-[#2D2C28] truncate">{l.subject}</span>
                          <span className="text-[11px] text-[#75746E]">({l.orgUnit})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA]">
                            {l.exclusionReason || 'مطابق قانون استثنا'}
                          </span>
                          <span className="text-[11px] text-[#75746E]">{l.dateStr}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form to Add / Edit Exclusion Rule */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs">
                <form onSubmit={handleSaveExclusion} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FAECE8] text-[#9C3A27]">
                        {editingExclusionId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                      <h3 className="text-sm font-bold text-[#2D2C28]">
                        {editingExclusionId ? 'ویرایش قانون استثنا' : 'تعریف قانون استثنا و نادیده‌گیری جدید'}
                      </h3>
                    </div>
                    {editingExclusionId && (
                      <button
                        type="button"
                        onClick={resetExForm}
                        className="text-xs text-[#75746E] hover:text-[#2D2C28] underline"
                      >
                        انصراف از ویرایش
                      </button>
                    )}
                  </div>

                  {/* Method / Target Field Selector Tabs */}
                  <div>
                    <label className="block text-xs font-bold text-[#5A5852] mb-1.5">
                      روش فیلتر و مبنای استثنا (کجا بررسی شود؟):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <button
                        type="button"
                        onClick={() => setExField('subject')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                          exField === 'subject'
                            ? 'bg-[#9C3A27] text-white border-[#9C3A27] shadow-xs'
                            : 'bg-[#FAF9F5] text-[#5A5852] border-[#E2E0D8] hover:bg-[#F0EEE6]'
                        }`}
                      >
                        <span>موضوع نامه</span>
                        <span className={`text-[10px] font-normal ${exField === 'subject' ? 'text-white/80' : 'text-[#8A8880]'}`}>
                          کلمات تستی و آزمایشی
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExField('unit')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                          exField === 'unit'
                            ? 'bg-[#9C3A27] text-white border-[#9C3A27] shadow-xs'
                            : 'bg-[#FAF9F5] text-[#5A5852] border-[#E2E0D8] hover:bg-[#F0EEE6]'
                        }`}
                      >
                        <span>واحد سازمانی</span>
                        <span className={`text-[10px] font-normal ${exField === 'unit' ? 'text-white/80' : 'text-[#8A8880]'}`}>
                          استثنای کل نامه‌های یک واحد
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExField('creator')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                          exField === 'creator'
                            ? 'bg-[#9C3A27] text-white border-[#9C3A27] shadow-xs'
                            : 'bg-[#FAF9F5] text-[#5A5852] border-[#E2E0D8] hover:bg-[#F0EEE6]'
                        }`}
                      >
                        <span>ایجادکننده / ثبت‌کننده</span>
                        <span className={`text-[10px] font-normal ${exField === 'creator' ? 'text-white/80' : 'text-[#8A8880]'}`}>
                          استثنای نامه‌های فرد خاص
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExField('actionType')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                          exField === 'actionType'
                            ? 'bg-[#9C3A27] text-white border-[#9C3A27] shadow-xs'
                            : 'bg-[#FAF9F5] text-[#5A5852] border-[#E2E0D8] hover:bg-[#F0EEE6]'
                        }`}
                      >
                        <span>نوع عملیات نامه</span>
                        <span className={`text-[10px] font-normal ${exField === 'actionType' ? 'text-white/80' : 'text-[#8A8880]'}`}>
                          حذف، ویرایش، ابطال و...
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExField('all')}
                        className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-1 ${
                          exField === 'all'
                            ? 'bg-[#9C3A27] text-white border-[#9C3A27] shadow-xs'
                            : 'bg-[#FAF9F5] text-[#5A5852] border-[#E2E0D8] hover:bg-[#F0EEE6]'
                        }`}
                      >
                        <span>تمام فیلدها و شرح</span>
                        <span className={`text-[10px] font-normal ${exField === 'all' ? 'text-white/80' : 'text-[#8A8880]'}`}>
                          جستجوی سراسری
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contextual Quick Presets & Dropdown Helpers */}
                  {exField === 'subject' && (
                    <div>
                      <label className="block text-xs font-bold text-[#5A5852] mb-1.5">
                        پیش‌نهادهای سریع کلمات تستی و نادیده‌گیری:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_EXCLUSION_KEYWORDS.map(kw => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => setExKeyword(kw)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              exKeyword === kw
                                ? 'bg-[#9C3A27] text-white border-[#9C3A27]'
                                : 'bg-[#F5F5F0] text-[#5A5852] border-[#E2E0D8] hover:bg-[#EAE8DE]'
                            }`}
                          >
                            + {kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {exField === 'unit' && (
                    <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E2E0D8] space-y-2">
                      <label className="block text-xs font-bold text-[#2D2C28]">
                        انتخاب سریع از واحدهای سازمانی موجود در سیستم:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                        {distinctUnits.map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => {
                              setExKeyword(u);
                              setExMatchType('exact');
                              setExReason(`استثنای کامل نامه‌های واحد سازمانی «${u}»`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                              exKeyword === u
                                ? 'bg-[#9C3A27] text-white border-[#9C3A27] font-bold'
                                : 'bg-white text-[#5A5852] border-[#DDDBCF] hover:bg-[#F0EEE6]'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {exField === 'creator' && (
                    <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E2E0D8] space-y-2">
                      <label className="block text-xs font-bold text-[#2D2C28]">
                        انتخاب سریع از ثبت‌کنندگان نامه‌ها در سیستم:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                        {distinctCreators.length > 0 ? (
                          distinctCreators.map(cr => (
                            <button
                              key={cr}
                              type="button"
                              onClick={() => {
                                setExKeyword(cr);
                                setExMatchType('contains');
                                setExReason(`استثنای نامه‌های ثبت‌شده توسط «${cr}»`);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                                exKeyword === cr
                                  ? 'bg-[#9C3A27] text-white border-[#9C3A27] font-bold'
                                  : 'bg-white text-[#5A5852] border-[#DDDBCF] hover:bg-[#F0EEE6]'
                              }`}
                            >
                              {cr}
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-[#75746E]">نام ایجادکننده‌ای از داده‌های بارگذاری‌شده یافت نشد. می‌توانید نام را دستی وارد کنید.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {exField === 'actionType' && (
                    <div>
                      <label className="block text-xs font-bold text-[#5A5852] mb-1.5">
                        پیش‌نهادهای سریع نوع عملیات:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['حذف', 'ویرایش', 'ابطال', 'تغییر وضعیت', 'ارجاع به دیگری'].map(act => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => {
                              setExKeyword(act);
                              setExMatchType('contains');
                              setExReason(`استثنای عملیات نوع «${act}»`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              exKeyword === act
                                ? 'bg-[#9C3A27] text-white border-[#9C3A27]'
                                : 'bg-[#F5F5F0] text-[#5A5852] border-[#E2E0D8] hover:bg-[#EAE8DE]'
                            }`}
                          >
                            + {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Keyword Input */}
                    <div className="md:col-span-5">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        {exField === 'unit' ? 'نام یا عنوان واحد سازمانی مورد نظر' :
                         exField === 'creator' ? 'نام ایجادکننده یا ثبت‌کننده' :
                         exField === 'actionType' ? 'نوع عملیات نامه' :
                         'مقدار / کلمه کلیدی جهت استثنا'} <span className="text-[#9C3A27]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={exKeyword}
                        onChange={e => setExKeyword(e.target.value)}
                        placeholder={
                          exField === 'unit' ? 'مثلاً: حسابداری مالی یا بازرسی' :
                          exField === 'creator' ? 'مثلاً: علی محمدی یا نام کاربر' :
                          exField === 'actionType' ? 'مثلاً: حذف یا ویرایش' :
                          'مثلاً: تست یا test یا آزمایشی'
                        }
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9C3A27]/20 focus:border-[#9C3A27] text-[#2D2C28]"
                      />
                    </div>

                    {/* Target Unit Selector (Scope) */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        محدوده واحد سازمانی (اختیاری)
                      </label>
                      <select
                        value={exTargetUnit}
                        onChange={e => setExTargetUnit(e.target.value)}
                        disabled={exField === 'unit'}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9C3A27]/20 focus:border-[#9C3A27] text-[#2D2C28] disabled:opacity-50"
                      >
                        <option value="all">همه واحدها (اعمال سراسری)</option>
                        {distinctUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Match Type */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        نوع انطباق
                      </label>
                      <select
                        value={exMatchType}
                        onChange={e => setExMatchType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9C3A27]/20 focus:border-[#9C3A27] text-[#2D2C28]"
                      >
                        <option value="contains">شامل مقدار باشد (پیشنهادی)</option>
                        <option value="exact">دقیقاً برابر باشد</option>
                        <option value="startsWith">شروع با این مقدار</option>
                      </select>
                    </div>
                  </div>

                  {/* Reason Description */}
                  <div>
                    <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                      علت / توضیح استثنا (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={exReason}
                      onChange={e => setExReason(e.target.value)}
                      placeholder="توضیحی جهت مستندسازی (مثلاً: نامه‌های آزمایشی پایلوت، یا استثنای واحد خاص)"
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9C3A27]/20 text-[#2D2C28]"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingEx || !exKeyword.trim()}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-[#9C3A27] hover:bg-[#8A2E1D] rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>{editingExclusionId ? 'بروزرسانی قانون' : 'ثبت و اعمال قانون استثنا'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Simulator for Exclusions */}
              <div className="bg-[#FAF9F5] rounded-2xl p-4 border border-[#E2E0D8] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#75746E]" />
                    <h3 className="text-xs font-bold text-[#2D2C28]">
                      شبیه‌ساز و تست زنده قوانین استثنا:
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#75746E]">
                    تست لحظه‌ای حذف یا شمول نامه در محاسبات
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#5A5852] mb-1 font-medium">موضوع یا شرح نامه:</label>
                    <input
                      type="text"
                      value={testExSubject}
                      onChange={e => setTestExSubject(e.target.value)}
                      placeholder="متن نمونه برای بررسی..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5A5852] mb-1 font-medium">واحد سازمانی نامه:</label>
                    <select
                      value={testExUnit}
                      onChange={e => setTestExUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    >
                      <option value="all">همه واحدها</option>
                      {distinctUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5A5852] mb-1 font-medium">نام ثبت‌کننده / ایجادکننده:</label>
                    <input
                      type="text"
                      value={testExCreator}
                      onChange={e => setTestExCreator(e.target.value)}
                      placeholder="نام شخص ثبت‌کننده..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5A5852] mb-1 font-medium">نوع عملیات نامه:</label>
                    <select
                      value={testExActionType}
                      onChange={e => setTestExActionType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    >
                      <option value="حذف">حذف</option>
                      <option value="ویرایش">ویرایش</option>
                      <option value="ابطال">ابطال</option>
                      <option value="سایر">سایر</option>
                    </select>
                  </div>
                </div>

                {/* Simulation Output Card */}
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                  liveExclusionResult.isExcluded
                    ? 'bg-[#FAECE8] text-[#8A2E1D] border-[#F2D1CA]'
                    : 'bg-[#EBF5EC] text-[#24592B] border-[#D1EBD4]'
                }`}>
                  <div className="flex items-center gap-2">
                    {liveExclusionResult.isExcluded ? (
                      <ShieldAlert className="h-4 w-4 text-[#9C3A27] shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#2E7D32] shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">
                        {liveExclusionResult.isExcluded
                          ? '⛔ این نامه از آمار و نمودارها استثنا (حذف) می‌شود'
                          : '✅ این نامه در آمار و داشبوردها محاسبه می‌شود'}
                      </span>
                      {liveExclusionResult.isExcluded && liveExclusionResult.matchedRule && (
                        <p className="text-[11px] mt-0.5 opacity-90">
                          {liveExclusionResult.reason || `علت: تطابق با قانون «${liveExclusionResult.matchedRule.keyword}»`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Exclusion Rules Table */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D2C28]">
                      لیست قوانین استثنای ثبت‌شده ({formatNumber(filteredExclusions.length)} قانون)
                    </h3>
                    <p className="text-xs text-[#75746E]">
                      می‌توانید قوانین را بر اساس فیلدهای مختلف (موضوع، واحد، ایجادکننده، نوع عملیات) مدیریت کنید
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="h-3.5 w-3.5 absolute right-3 top-2.5 text-[#75746E]" />
                      <input
                        type="text"
                        value={exSearch}
                        onChange={e => setExSearch(e.target.value)}
                        placeholder="جستجو در قوانین..."
                        className="w-full sm:w-auto pr-8 pl-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onResetExclusions}
                      title="بازنشانی به قوانین پیش‌فرض (تست، آزمایشی، test)"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#5A5852] bg-[#F5F5F0] hover:bg-[#EAE8DE] rounded-xl border border-[#DDDBCF] transition cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>پیش‌فرض</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#E8E6DF]">
                  {filteredExclusions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#75746E]">
                      هیچ قانون استثنایی یافت نشد. می‌توانید با فرم بالا قانون جدید تعریف کنید.
                    </div>
                  ) : (
                    filteredExclusions.map(rule => (
                      <div
                        key={rule.id}
                        className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition rounded-xl px-2 ${
                          !rule.isActive ? 'opacity-50 bg-[#F9F9F7]' : 'hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Active Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => onUpdateExclusion(rule.id, { isActive: !rule.isActive })}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                              rule.isActive ? 'bg-[#9C3A27] justify-end' : 'bg-[#DDDBCF] justify-start'
                            }`}
                            title={rule.isActive ? 'غیرفعال‌سازی قانون' : 'فعال‌سازی قانون'}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#FAECE8] text-[#9C3A27] border border-[#F2D1CA]">
                                «{rule.keyword}»
                              </span>

                              {/* Rule Field Badge */}
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                rule.field === 'unit'
                                  ? 'bg-[#EBF2F2] text-[#285A5B] border border-[#CDE1E1]'
                                  : rule.field === 'creator'
                                  ? 'bg-[#F5EEF8] text-[#6B2879] border border-[#E9D8F0]'
                                  : rule.field === 'actionType'
                                  ? 'bg-[#FEF3E2] text-[#8C5815] border border-[#FDE3BE]'
                                  : rule.field === 'all'
                                  ? 'bg-[#F2F1EB] text-[#42413C] border border-[#DDDBCF]'
                                  : 'bg-[#F2F1EB] text-[#5A5852] border border-[#DDDBCF]'
                              }`}>
                                {rule.field === 'unit' ? 'واحد سازمانی' :
                                 rule.field === 'creator' ? 'ایجادکننده' :
                                 rule.field === 'actionType' ? 'نوع عملیات' :
                                 rule.field === 'all' ? 'همه فیلدها' : 'موضوع نامه'}
                              </span>

                              {rule.targetUnit && rule.field !== 'unit' && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F2F1EB] text-[#5A5852] border border-[#DDDBCF]">
                                  واحد: {rule.targetUnit}
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F5F5F0] text-[#75746E]">
                                {rule.matchType === 'exact' ? 'تطابق دقیق' : rule.matchType === 'startsWith' ? 'شروع با' : 'شامل مقدار'}
                              </span>
                            </div>
                            {rule.reason && (
                              <p className="text-xs text-[#75746E] mt-1">
                                {rule.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditExclusion(rule)}
                            className="p-1.5 rounded-lg text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#EAE8DE] transition cursor-pointer"
                            title="ویرایش"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExclusion(rule.id)}
                            className="p-1.5 rounded-lg text-[#9C3A27] hover:bg-[#FAECE8] transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CAUSE RULES (قوانین تعیین عامل و منشأ بانکی و ...) */}
          {/* ======================================================== */}
          {activeTab === 'causes' && (
            <div className="space-y-6">
              {/* Informational Hero Card */}
              <div className="bg-[#F0F5FA] rounded-2xl p-4 border border-[#D1E0F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#DBEAFE] text-[#1E40AF] shrink-0 mt-0.5">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E3A8A]">
                      موتور هوشمند قوانین عامل (Cause Engine):
                    </h3>
                    <p className="text-xs text-[#2563EB] mt-1 leading-relaxed">
                      با تعریف کلمات کلیدی، نامه‌های مرتبط با هر موضوع (مانند «بانک برداشت نگردیده» در واحد حسابداری مالی) شناسایی شده و تحت عنوان عامل مربوطه (مثلاً <strong>«بانکی»</strong>) طبقه‌بندی می‌شوند تا از انتساب به اشتباه کارمندان جلوگیری گردد.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form to Add / Edit Cause Rule */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs">
                <form onSubmit={handleSaveCause} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EFF6FF] text-[#1E40AF]">
                        {editingCauseId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                      <h3 className="text-sm font-bold text-[#2D2C28]">
                        {editingCauseId ? 'ویرایش قانون عامل' : 'تعریف قانون جدید طبقه‌بندی عامل'}
                      </h3>
                    </div>
                    {editingCauseId && (
                      <button
                        type="button"
                        onClick={resetCauseForm}
                        className="text-xs text-[#75746E] hover:text-[#2D2C28] underline"
                      >
                        انصراف از ویرایش
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    {/* Target Excel Field / Column */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1 flex items-center justify-between">
                        <span>ستون مورد بررسی در فایل اکسل <span className="text-[#9C3A27]">*</span></span>
                      </label>
                      <select
                        value={cTargetField}
                        onChange={e => setCTargetField(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 text-[#2D2C28] font-medium cursor-pointer"
                      >
                        <option value="all">🔍 همه ستون‌ها (پیش‌فرض)</option>
                        <optgroup label="ستون‌های اصلی و پرکاربرد">
                          <option value="یادداشت">📝 ستون «یادداشت» (متن یادداشت نامه)</option>
                          <option value="موضوع">📋 ستون «موضوع» (عنوان نامه)</option>
                          <option value="شرح">📄 ستون «شرح» (شرح نامه)</option>
                          <option value="واحد سازمانی">🏢 ستون «واحد سازمانی»</option>
                          <option value="گیرنده">👤 ستون «گیرنده»</option>
                          <option value="فرستنده">✉️ ستون «فرستنده»</option>
                          <option value="ایجاد کننده نامه">✍️ ستون «ایجاد کننده نامه»</option>
                          <option value="نوع مکاتبه">📌 ستون «نوع مکاتبه»</option>
                          <option value="شماره ثبت">🔢 ستون «شماره ثبت»</option>
                        </optgroup>
                        {availableExcelColumns.filter(c => !['یادداشت', 'موضوع', 'شرح', 'واحد سازمانی', 'گیرنده', 'فرستنده', 'ایجاد کننده نامه', 'نوع مکاتبه', 'شماره ثبت'].includes(c)).length > 0 && (
                          <optgroup label="سایر ستون‌های اکسل ورودی">
                            {availableExcelColumns
                              .filter(c => !['یادداشت', 'موضوع', 'شرح', 'واحد سازمانی', 'گیرنده', 'فرستنده', 'ایجاد کننده نامه', 'نوع مکاتبه', 'شماره ثبت'].includes(c))
                              .map(c => (
                                <option key={c} value={c}>🔹 ستون «{c}»</option>
                              ))}
                          </optgroup>
                        )}
                        <option value="custom">✍️ نام ستون دلخواه دیگر (تایپ دستی)...</option>
                      </select>
                      {cTargetField === 'custom' && (
                        <input
                          type="text"
                          required
                          value={cCustomFieldName}
                          onChange={e => setCCustomFieldName(e.target.value)}
                          placeholder="نام ستون در اکسل (مثلاً: یادداشت یا وضعیت تسویه)"
                          className="w-full mt-2 px-3 py-1.5 text-xs bg-white border border-[#2563EB] rounded-xl focus:outline-none text-[#2D2C28]"
                        />
                      )}
                    </div>

                    {/* Keyword Input */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        کلمه یا عبارت کلیدی <span className="text-[#9C3A27]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cKeyword}
                        onChange={e => setCKeyword(e.target.value)}
                        placeholder="مثلاً: عدم تسویه یا برداشت نگردیده"
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 text-[#2D2C28]"
                      />
                    </div>

                    {/* Cause Name */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        عامل انتسابی <span className="text-[#9C3A27]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={cCause}
                        onChange={e => setCCause(e.target.value)}
                        placeholder="مثلاً: عدم تسویه یا بانکی"
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 text-[#2D2C28]"
                      />
                    </div>

                    {/* Match Type */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        نوع انطباق
                      </label>
                      <select
                        value={cMatchType}
                        onChange={e => setCMatchType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none text-[#2D2C28]"
                      >
                        <option value="contains">شامل کلمه</option>
                        <option value="exact">دقیق</option>
                        <option value="startsWith">شروع با</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    {/* Target Unit */}
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        واحد سازمانی هدف
                      </label>
                      <select
                        value={cTargetUnit}
                        onChange={e => setCTargetUnit(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl focus:bg-white focus:outline-none text-[#2D2C28]"
                      >
                        <option value="all">همه واحدها</option>
                        {distinctUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Color Selector */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        رنگ برچسب عامل
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        {PRESET_CAUSE_COLORS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setCColor(c.value)}
                            className={`w-6 h-6 rounded-full transition cursor-pointer ${
                              cColor === c.value ? 'ring-2 ring-[#2D2C28] ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-5">
                      <label className="block text-xs font-bold text-[#2D2C28] mb-1">
                        شرح و توضیحات قانون
                      </label>
                      <input
                        type="text"
                        value={cDescription}
                        onChange={e => setCDescription(e.target.value)}
                        placeholder="توضیح جهت راهنمایی..."
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingC || !cKeyword.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>{editingCauseId ? 'بروزرسانی قانون' : 'ثبت قانون عامل'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Simulator for Causes */}
              <div className="bg-[#FAF9F5] rounded-2xl p-4 border border-[#E2E0D8] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#75746E]" />
                    <h3 className="text-xs font-bold text-[#2D2C28]">
                      شبیه‌ساز و تست زنده تشخیص عامل:
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={testCText}
                      onChange={e => setTestCText(e.target.value)}
                      placeholder="متن نمونه نامه یا مقدار فیلد..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <select
                      value={testCField}
                      onChange={e => setTestCField(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none cursor-pointer"
                    >
                      <option value="all">🔍 تست روی همه ستون‌ها</option>
                      <option value="یادداشت">📝 ستون «یادداشت»</option>
                      <option value="موضوع">📋 ستون «موضوع»</option>
                      <option value="شرح">📄 ستون «شرح»</option>
                      {availableExcelColumns.filter(c => !['یادداشت', 'موضوع', 'شرح'].includes(c)).map(c => (
                        <option key={c} value={c}>🔹 ستون «{c}»</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={testCUnit}
                      onChange={e => setTestCUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                    >
                      <option value="all">همه واحدها</option>
                      {distinctUnits.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#E2E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: liveCauseResult.color }} />
                    <span className="font-bold text-[#2D2C28]">عامل تشخیص داده شده:</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold text-white shrink-0" style={{ backgroundColor: liveCauseResult.color }}>
                      {liveCauseResult.cause}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#75746E]">{liveCauseResult.reason}</span>
                </div>
              </div>

              {/* Existing Cause Rules Table */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#2D2C28]">
                      لیست قوانین عامل فعال ({formatNumber(filteredCauses.length)} قانون)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="h-3.5 w-3.5 absolute right-3 top-2.5 text-[#75746E]" />
                      <input
                        type="text"
                        value={cSearch}
                        onChange={e => setCSearch(e.target.value)}
                        placeholder="جستجو در قوانین..."
                        className="w-full sm:w-auto pr-8 pl-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onResetCauseRules}
                      title="بازنشانی قوانین پیش‌فرض بانکی"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#5A5852] bg-[#F5F5F0] hover:bg-[#EAE8DE] rounded-xl border border-[#DDDBCF] transition cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>پیش‌فرض</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#E8E6DF]">
                  {filteredCauses.map(rule => (
                    <div
                      key={rule.id}
                      className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition rounded-xl px-2 ${
                        !rule.isActive ? 'opacity-50 bg-[#F9F9F7]' : 'hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onUpdateCauseRule(rule.id, { isActive: !rule.isActive })}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                            rule.isActive ? 'bg-[#2563EB] justify-end' : 'bg-[#DDDBCF] justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-white" style={{ backgroundColor: rule.color || '#2563EB' }}>
                              {rule.cause}
                            </span>
                            <span className="font-bold text-[#2D2C28] text-xs">
                              کلمه: «{rule.keyword}»
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                              {rule.targetField && rule.targetField !== 'all' ? `ستون: «${rule.targetField}»` : 'همه ستون‌ها'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F2F1EB] text-[#5A5852]">
                              {rule.targetUnit ? `واحد: ${rule.targetUnit}` : 'همه واحدها'}
                            </span>
                          </div>
                          {rule.description && (
                            <p className="text-xs text-[#75746E] mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEditCause(rule)}
                          className="p-1.5 rounded-lg text-[#5A5852] hover:text-[#2D2C28] hover:bg-[#EAE8DE] transition cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCauseRule(rule.id)}
                          className="p-1.5 rounded-lg text-[#9C3A27] hover:bg-[#FAECE8] transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================== */}
              {/* UNIT CAUSE COLUMN VISIBILITY CONFIGURATION              */}
              {/* ======================================================== */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#2D2C28]">
                          تنظیم نمایش ستون «عامل» برای هر واحد سازمانی
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                          {formatNumber(selectedUnitsList.length)} از {formatNumber(distinctUnits.length)} واحد انتخاب شده
                        </span>
                      </div>
                      <p className="text-xs text-[#75746E] mt-0.5">
                        واحد سازمانی مورد نظر را از منوی کشویی انتخاب و اضافه کنید. ستون عامل (منشأ) <strong>فقط برای واحدهای سازمانی انتخاب‌شده</strong> در جدول مکاتبات و گزارش‌ها نمایان خواهد شد.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddAllUnitsToVisibility}
                      className="px-3 py-1.5 text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-xl border border-[#BFDBFE] transition cursor-pointer"
                    >
                      افزودن همه واحدها
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllUnitsVisibility}
                      className="px-3 py-1.5 text-xs font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] rounded-xl border border-[#F2D1CA] transition cursor-pointer"
                    >
                      حذف همه (مخفی‌سازی کامل)
                    </button>
                  </div>
                </div>

                {/* Searchable Combobox Selector & Add Control */}
                <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E2E0D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#2D2C28]">
                      جستجو و انتخاب واحد سازمانی از منوی کشویی هوشمند:
                    </label>
                    <span className="text-[11px] text-[#75746E]">
                      {formatNumber(unselectedUnitsList.length)} واحد آماده افزودن
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={unselectedUnitsList}
                        value={selectedUnitToAdd}
                        onChange={val => setSelectedUnitToAdd(val)}
                        placeholder="جستجو یا انتخاب واحد (مثلاً تایپ کنید «حساب» یا «فروش»)..."
                        searchPlaceholder="نام واحد را تایپ کنید (مثلاً حساب، مالی، بازرگانی)..."
                        emptyText="هیچ واحد سازمانی با این عنوان یافت نشد"
                        showCounts={true}
                        countsMap={unitLetterCounts}
                        onEnterSelectAndSubmit={val => {
                          if (val) {
                            handleAddUnitToVisibility(val);
                          }
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!selectedUnitToAdd}
                      onClick={() => handleAddUnitToVisibility(selectedUnitToAdd)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>افزودن به لیست مجاز</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#75746E]">
                    💡 <strong>راهنما:</strong> روی کادر کلیک کنید و قسمتی از نام واحد (مانند «حساب») را تایپ کنید تا بلافاصله «حسابداری مالی» فیلتر شود و با فشردن Enter یا دکمه افزودن، ثبت گردد.
                  </p>
                </div>

                {/* Active Selected Units List */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2D2C28]">
                        واحدهای سازمانی دارای ستون عامل فعال:
                      </span>
                      <span className="text-xs font-extrabold text-[#16A34A] bg-[#F4F9F4] px-2 py-0.5 rounded-lg border border-[#C2E0C4]">
                        {formatNumber(selectedUnitsList.length)} واحد فعال
                      </span>
                    </div>

                    {selectedUnitsList.length > 5 && (
                      <div className="relative max-w-xs w-full">
                        <Search className="h-3.5 w-3.5 absolute right-3 top-2.5 text-[#75746E]" />
                        <input
                          type="text"
                          value={unitFilterSearch}
                          onChange={e => setUnitFilterSearch(e.target.value)}
                          placeholder="جستجو در واحدهای انتخاب‌شده..."
                          className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {selectedUnitsList.length === 0 ? (
                    <div className="p-6 text-center bg-[#FAF9F5] rounded-2xl border border-dashed border-[#DDDBCF] space-y-2">
                      <Info className="h-6 w-6 text-[#75746E] mx-auto" />
                      <p className="text-xs font-bold text-[#5A5852]">
                        هیچ واحد سازمانی برای نمایش ستون عامل انتخاب نشده است.
                      </p>
                      <p className="text-[11px] text-[#75746E] max-w-md mx-auto">
                        در این حالت ستون عامل برای تمامی واحدها مخفی خواهد بود. جهت نمایش ستون عامل، واحد سازمانی مورد نظر خود (مثلاً «حسابداری مالی») را از منوی کشویی بالا انتخاب و دکمه افزودن را بزنید.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredActiveUnits.map(unitName => {
                        const count = unitLetterCounts[unitName] || 0;
                        return (
                          <div
                            key={unitName}
                            className="bg-[#F4F9F4] border border-[#C2E0C4] p-3 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:bg-[#EAF4EB] transition"
                          >
                            <div className="space-y-0.5 truncate flex-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                                <span className="font-bold text-xs text-[#1E3A1E] truncate" title={unitName}>
                                  {unitName}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#527853]">
                                {formatNumber(count)} نامه ثبت شده
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveUnitFromVisibility(unitName)}
                              title="حذف این واحد از لیست مجاز ستون عامل"
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#9C3A27] bg-[#FAECE8] hover:bg-[#F5D8D0] border border-[#F2D1CA] rounded-lg transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Save Changes Button & Feedback */}
                <div className="pt-3 border-t border-[#E8E6DF] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#75746E]">
                    پس از افزودن یا حذف واحدهای مورد نظر، دکمه <strong>«ذخیره تغییرات»</strong> را بزنید تا در پایگاه داده ثبت گردد.
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {visibilitySavedFeedback && (
                      <span className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#166534] bg-[#E1F3E2] px-3 py-1.5 rounded-xl border border-[#C2E0C4] animate-in fade-in">
                        <Check className="h-4 w-4 text-[#16A34A]" />
                        <span>تنظیمات با موفقیت ذخیره شد</span>
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isSavingVisibility}
                      onClick={handleSaveVisibility}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSavingVisibility ? 'در حال ذخیره...' : 'ذخیره تنظیمات در پایگاه داده'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SYSTEM, AI & DATABASE DIAGNOSTICS                 */}
          {/* ======================================================== */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Card 0: Gemini API Key Setup & Live Connection Testing */}
              <div className="bg-white rounded-2xl p-5 border border-[#BFDBFE] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white shadow-xs shrink-0 mt-0.5">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#1E3A8A]">
                          تنظیم کلید هوش مصنوعی (Gemini API Key)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#DBEAFE]">
                          ذخیره‌سازی مستقیم در پایگاه داده
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                        می‌توانید کلید اختصاصی Google Gemini API را مستقیماً از همین‌جا ذخیره و تست کنید؛ بدون نیاز به ویرایش فایل <code className="bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono text-[#0F172A]">.env</code> یا ری‌استارت سرور.
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${aiConfig?.hasKey ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`} />
                    <div className="text-xs">
                      <span className="text-[#64748B]">وضعیت کلید: </span>
                      <strong className={`font-bold ${aiConfig?.hasKey ? 'text-[#047857]' : 'text-[#B45309]'}`}>
                        {aiConfig?.hasKey ? 'فعال و متصل' : 'تنظیم نشده'}
                      </strong>
                      {aiConfig?.hasKey && (
                        <span className="text-[10px] text-[#64748B] block mt-0.5">
                          {aiConfig.source === 'database' ? '(ذخیره‌شده در تنظیمات پایگاه داده)' : '(تنظیم از فایل .env)'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Key Masked View & Fast Testing */}
                {aiConfig?.hasKey && (
                  <div className="bg-[#F0FDF4] rounded-xl p-3.5 border border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-[#166534]">
                      <ShieldCheck className="h-5 w-5 text-[#16A34A] shrink-0" />
                      <div>
                        <span className="font-bold">کلید فعال فعلی: </span>
                        <code className="font-mono bg-white px-2 py-0.5 rounded border border-[#86EFAC] text-[#15803D] font-bold">
                          {aiConfig.maskedKey || '••••••••'}
                        </code>
                        <span className="text-[11px] text-[#15803D] mr-2">
                          (مدل پیش‌فرض: {aiConfig.model || 'gemini-2.5-flash'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestApiKey(false)}
                        disabled={isTestingApiKey}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isTestingApiKey ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>در حال تست...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>تست اتصال با این کلید</span>
                          </>
                        )}
                      </button>

                      {aiConfig.source === 'database' && (
                        <button
                          type="button"
                          onClick={handleDeleteApiKey}
                          disabled={isDeletingApiKey}
                          className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] font-bold text-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="حذف کلید اختصاصی و بازگشت به پیش‌فرض"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف کلید اختصاصی</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Status / Test feedback message */}
                {apiKeyStatusMsg && (
                  <div
                    className={`rounded-xl p-3.5 text-xs flex items-start justify-between gap-3 border animate-in fade-in ${
                      apiKeyStatusMsg.type === 'success'
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : apiKeyStatusMsg.type === 'error'
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {apiKeyStatusMsg.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" />
                      ) : apiKeyStatusMsg.type === 'error' ? (
                        <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{apiKeyStatusMsg.text}</div>
                        {apiKeyStatusMsg.latency !== undefined && (
                          <div className="text-[11px] mt-0.5 opacity-90">
                            ⏱️ زمان پاسخگویی (Latency): <strong>{apiKeyStatusMsg.latency} میلی‌ثانیه</strong>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApiKeyStatusMsg(null)}
                      className="p-1 rounded-lg hover:bg-black/5 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Form Input for entering/changing API Key */}
                <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  <label className="block text-xs font-bold text-[#1E293B]">
                    {aiConfig?.hasKey ? 'تغییر یا ثبت کلید API جدید:' : 'وارد کردن کلید Gemini API:'}
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type={showApiKeyText ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="کلید API خود را اینجا وارد کنید (مثال: AIzaSy...)"
                        dir="ltr"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-mono placeholder:font-sans placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKeyText(!showApiKeyText)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg transition cursor-pointer"
                        title={showApiKeyText ? 'مخفی‌سازی کلید' : 'نمایش متن کلید'}
                      >
                        {showApiKeyText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveApiKey}
                        disabled={isSavingApiKey || !apiKeyInput.trim()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-[0.99] cursor-pointer"
                      >
                        {isSavingApiKey ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>در حال ذخیره...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>ذخیره کلید</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestApiKey(true)}
                        disabled={isTestingApiKey || !apiKeyInput.trim()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#047857] hover:bg-[#065F46] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-[0.99] cursor-pointer"
                        title="تست کلیدی که در کادر بالا نوشته‌اید قبل از ذخیره"
                      >
                        {isTestingApiKey ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>در حال تست...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            <span>تست این کلید</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Helper Guide & Link */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-[#64748B]">
                    <div className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
                      <span>کلیدهای Google AI Studio رایگان هستند و بلافاصله ساخته می‌شوند.</span>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-bold"
                    >
                      <span>دریافت رایگان کلید از Google AI Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 1: AI Assistant Floating Button Settings */}
              <div className="bg-gradient-to-br from-[#F8FAFC] via-[#EFF6FF] to-[#F1F5F9] rounded-2xl p-5 border border-[#BFDBFE] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DBEAFE] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1E40AF] to-[#2563EB] text-white shadow-xs shrink-0 mt-0.5">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#1E3A8A]">
                          دستیار هوش تجاری و تحلیل هوشمند (Gemini BI)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                          Gemini 3.7 Flash
                        </span>
                      </div>
                      <p className="text-xs text-[#3B82F6] mt-1 leading-relaxed font-medium">
                        تنظیم نحوه دسترسی و نمایش دکمه‌های هوش تجاری در هدر و گوشه صفحه
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-[#BFDBFE] shrink-0">
                    <span className="text-xs font-bold text-[#1E293B]">
                      {showFloatingAiButton ? 'هوش مصنوعی فعال است' : 'هوش مصنوعی غیرفعال است'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showFloatingAiButton}
                      onClick={() => onToggleFloatingAiButton && onToggleFloatingAiButton(!showFloatingAiButton)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        showFloatingAiButton ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          showFloatingAiButton ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Details & Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-white/90 border border-[#DBEAFE] space-y-1.5">
                    <div className="font-bold text-[#1E293B] flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-[#2563EB]" />
                      <span>نمایش دکمه‌های هوش مصنوعی (هدر و گوشه صفحه):</span>
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed">
                      با فعال کردن این گزینه، دکمه بنفش/آبی <strong className="text-[#1E40AF]">«دستیار هوشمند BI»</strong> در بالای صفحه (هدر) و دکمه شناور <strong className="text-[#1E40AF]">«مشاور هوش تجاری (Gemini)»</strong> در گوشه پایین سمت چپ صفحه ظاهر می‌شوند. در صورت غیرفعال کردن، هر دو دکمه مخفی خواهند شد.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/90 border border-[#DBEAFE] flex flex-col justify-between gap-2">
                    <div className="text-[11px] text-[#64748B]">وضعیت فعلی هوش مصنوعی:</div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${showFloatingAiButton ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                      <span className={`font-black text-xs ${showFloatingAiButton ? 'text-[#047857]' : 'text-[#64748B]'}`}>
                        {showFloatingAiButton ? 'نمایش در هدر و صفحه فعال' : 'مخفی و غیرفعال'}
                      </span>
                    </div>
                    {onOpenAiModal && (
                      <button
                        type="button"
                        onClick={onOpenAiModal}
                        className="w-full text-center py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE] transition cursor-pointer"
                      >
                        تست و باز کردن دستیار هوش مصنوعی
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: AI Debug Mode & SQL Query Transparency */}
              <div className="bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/40 to-[#FAF5FF] rounded-2xl p-5 border border-[#FDE68A] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FDE68A]/80 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D97706] to-[#B45309] text-white shadow-xs shrink-0 mt-0.5">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#92400E]">
                          حالت خطایابی و شفافیت کوئری‌های SQL (AI Debug Mode)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                          SQL Trace
                        </span>
                      </div>
                      <p className="text-xs text-[#B45309] mt-1 leading-relaxed font-medium">
                        مشاهده نحوه یافتن پاسخ، کوئری‌های SQL اجرا شده بر روی پایگاه داده SQLite، و پارامترهای استخراج داده
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-[#FDE68A] shrink-0">
                    <span className="text-xs font-bold text-[#78350F]">
                      {aiDebugMode ? 'حالت دیباگ فعال است 🐞' : 'حالت دیباگ غیرفعال است'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={aiDebugMode}
                      onClick={() => onToggleAiDebugMode && onToggleAiDebugMode(!aiDebugMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        aiDebugMode ? 'bg-[#D97706]' : 'bg-[#CBD5E1]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          aiDebugMode ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Details & Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-white/90 border border-[#FDE68A] space-y-2 text-[#78350F]">
                    <div className="font-bold flex items-center gap-1.5 text-[#92400E]">
                      <Code className="h-4 w-4 text-[#D97706]" />
                      <span>مزایای فعال‌سازی حالت دیباگ هوش مصنوعی:</span>
                    </div>
                    <ul className="text-[11px] space-y-1.5 text-[#78350F] list-disc list-inside leading-relaxed font-medium">
                      <li><strong>نمایش دقیق کوئری‌های SQL:</strong> تمام دستورات SQL که برای استخراج آمار از جدول <code>Letter</code> به دیتابیس زده شده‌اند را نمایش می‌دهد.</li>
                      <li><strong>شفافیت محاسبات و فیلترها:</strong> فرمول‌های تجمیعی و کلیدواژه‌های استخراج‌شده از متن سوال را مشخص می‌کند.</li>
                      <li><strong>ثبت زمان و مدل:</strong> زمان اجرای کوئری‌ها (Latency به میلی‌ثانیه) و نام مدل اجراکننده را گزارش می‌دهد.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/90 border border-[#FDE68A] flex flex-col justify-between gap-2">
                    <div className="text-[11px] text-[#92400E] font-semibold">وضعیت فعلی دیباگ:</div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${aiDebugMode ? 'bg-[#D97706] animate-ping' : 'bg-[#94A3B8]'}`} />
                      <span className={`font-black text-xs ${aiDebugMode ? 'text-[#92400E]' : 'text-[#64748B]'}`}>
                        {aiDebugMode ? 'دیباگ فعال (گزارش کامل SQL)' : 'غیرفعال (فقط متن پاسخ)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#A16207] bg-[#FEF3C7] p-2 rounded-lg border border-[#FDE68A]">
                      💡 با غیرفعال‌سازی دیباگ، هوش مصنوعی بدون ارجاعات فنی و بدون نمایش کوئری‌های SQL پاسخ می‌دهد.
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Filter & Query Engine Mode (سوییچ بین فیلتر در مرورگر In-Memory و کوئری مستقیم روی دیتابیس SQLite سرور) */}
              <div className="bg-gradient-to-br from-[#F8FAFC] via-[#F0FDF4]/30 to-[#FAF5FF] rounded-2xl p-5 border border-[#CBD5E1] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#047857] text-white shadow-xs shrink-0 mt-0.5">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#1E293B]">
                          موتور اجرای فیلترسازی و استخراج داده‌ها (Filter Execution Engine)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                          {filterExecutionMode === 'server' ? '🗄️ سرور SQLite' : '⚡ مرورگر In-Memory'}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed font-medium">
                        انتخاب نحوه پردازش فیلترها و جستجو در جداول: پردازش فوری در حافظه کلاینت یا کوئری مستقیم روی پایگاه داده سرور
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-[#CBD5E1] shrink-0">
                    <span className="text-xs font-bold text-[#1E293B]">
                      {filterExecutionMode === 'server' ? 'فیلترسازی در سرور (Server-Side)' : 'فیلترسازی در حافظه (In-Memory)'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={filterExecutionMode === 'server'}
                      onClick={() => onToggleFilterExecutionMode && onToggleFilterExecutionMode(filterExecutionMode === 'server' ? 'client' : 'server')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        filterExecutionMode === 'server' ? 'bg-[#047857]' : 'bg-[#2563EB]'
                      }`}
                      title={filterExecutionMode === 'server' ? 'کلیک برای تغییر به حالت حافظه کلاینت' : 'کلیک برای تغییر به حالت کوئری سرور'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          filterExecutionMode === 'server' ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2 Mode Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Mode 1: Client-Side In-Memory */}
                  <div
                    onClick={() => onToggleFilterExecutionMode && onToggleFilterExecutionMode('client')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                      filterExecutionMode === 'client'
                        ? 'bg-blue-50/80 border-[#2563EB] shadow-xs'
                        : 'bg-white/80 border-[#E2E8F0] hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#1E3A8A]">
                        <span className="p-1.5 rounded-lg bg-blue-100 text-[#1E40AF]">⚡</span>
                        <span>حالت ۱: پردازش در حافظه مرورگر (In-Memory / Client-side)</span>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        filterExecutionMode === 'client' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#CBD5E1]'
                      }`}>
                        {filterExecutionMode === 'client' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#334155] leading-relaxed">
                      تمام رکوردهای بارگذاری‌شده در حافظه مرورگر نگه‌داری شده و فیلترها، جستجو و محاسبات به صورت <strong className="text-[#1E40AF]">فوق‌سریع و بلادرنگ (Real-time)</strong> بدون نیاز به ارسال درخواست جدید به سرور اعمال می‌شوند.
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[10px] text-[#2563EB] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>ایده‌آل برای سرعت حداکثری و جستجوی آنی همزمان با تایپ</span>
                    </div>
                  </div>

                  {/* Mode 2: Server-Side SQLite */}
                  <div
                    onClick={() => onToggleFilterExecutionMode && onToggleFilterExecutionMode('server')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                      filterExecutionMode === 'server'
                        ? 'bg-emerald-50/80 border-[#047857] shadow-xs'
                        : 'bg-white/80 border-[#E2E8F0] hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#064E3B]">
                        <span className="p-1.5 rounded-lg bg-emerald-100 text-[#047857]">🗄️</span>
                        <span>حالت ۲: کوئری مستقیم روی دیتابیس سرور (Server-side / SQLite)</span>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        filterExecutionMode === 'server' ? 'border-[#047857] bg-[#047857]' : 'border-[#CBD5E1]'
                      }`}>
                        {filterExecutionMode === 'server' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#334155] leading-relaxed">
                      با تغییر فیلترها یا جستجو، کوئری مستقیم SQL از طریق <strong className="text-[#047857]">ORM پریسما روی فایل dev.db</strong> اجرا شده و داده‌ها به همراه صفحه‌بندی سمت سرور (Pagination) و آمار عملکرد دریافت می‌شوند.
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[10px] text-[#047857] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>ایده‌آل برای مقیاس‌پذیری بالا، حجم زیاد رکوردها و کاهش مصرف حافظه کلاینت</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: ERA Dashboard Sections Visibility (کنترل نمایش بخش‌ها و کارت‌های داشبورد فرآیندهای الکترونیکی) */}
              <div className="bg-gradient-to-br from-[#FDFBF7] via-[#F5F4EE] to-[#FAF8F5] rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E0D8] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-[#545D4B] text-white shadow-xs shrink-0 mt-0.5">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#2D2C28]">
                          تنظیمات بخش‌های نمایشی داشبورد فرآیندهای الکترونیکی (ERA)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE8DE] text-[#545D4B] border border-[#DDDBCF]">
                          شخصی‌سازی UI
                        </span>
                      </div>
                      <p className="text-xs text-[#75746E] mt-1 leading-relaxed font-medium">
                        کنترل نمایش یا پنهان‌سازی بخش‌های مختلف داشبورد ERA برای متمرکزسازی دید یا ارائه به مدیریت
                      </p>
                    </div>
                  </div>

                  {/* Reset to defaults button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleEraVisibility) {
                        onToggleEraVisibility('showHeader', false);
                        onToggleEraVisibility('showMetrics', false);
                        onToggleEraVisibility('showEntityChips', false);
                        onToggleEraVisibility('autoScrollToTable', false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F4EE] text-[#545D4B] hover:text-[#2D2C28] text-xs font-bold border border-[#DDDBCF] transition shadow-2xs cursor-pointer shrink-0"
                    title="بازنشانی باکس‌های ۱ و ۲ و ۳ و اسکرول خودکار به پیش‌فرض (غیرفعال)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>بازنشانی به پیش‌فرض (غیرفعال ۱، ۲، ۳ و اسکرول)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
                  {/* Item 1: Header and Presentation buttons */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-[#545D4B]" />
                          <span>باکس ۱: هدر و دکمه‌های ارائه</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.showHeader}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('showHeader', !eraVisibility.showHeader)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            eraVisibility.showHeader ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              eraVisibility.showHeader ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        نمایش عنوان، توضیحات سامانه ERA، دکمه پخش اسلایدشو و دانلود فایل HTML ارائه.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${eraVisibility.showHeader ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={eraVisibility.showHeader ? 'text-emerald-700' : 'text-gray-500'}>
                        {eraVisibility.showHeader ? 'در حال نمایش' : 'مخفی'}
                      </span>
                    </div>
                  </div>

                  {/* Item 2: 4 Metric Cards */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-[#545D4B]" />
                          <span>باکس ۲: کارت‌های ۴گانه آماری</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.showMetrics}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('showMetrics', !eraVisibility.showMetrics)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            eraVisibility.showMetrics ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              eraVisibility.showMetrics ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        نمایش کارت‌های آماری کل اقدامات، فرم‌های جدید، اصلاحات فرآیند و اتوماتیک‌سازی هوشمند.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${eraVisibility.showMetrics ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={eraVisibility.showMetrics ? 'text-emerald-700' : 'text-gray-500'}>
                        {eraVisibility.showMetrics ? 'در حال نمایش' : 'مخفی'}
                      </span>
                    </div>
                  </div>

                  {/* Item 3: Entity Type summary chips */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-[#545D4B]" />
                          <span>باکس ۳: نوار نوع موجودیت‌ها</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.showEntityChips}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('showEntityChips', !eraVisibility.showEntityChips)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            eraVisibility.showEntityChips ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              eraVisibility.showEntityChips ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        نوار بالای فیلترها شامل دکمه‌های آمار فرآیندها، فرم‌ها و گزارش‌های کاوشگر.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${eraVisibility.showEntityChips ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={eraVisibility.showEntityChips ? 'text-emerald-700' : 'text-gray-500'}>
                        {eraVisibility.showEntityChips ? 'در حال نمایش' : 'مخفی'}
                      </span>
                    </div>
                  </div>

                  {/* Item 4: Auto Scroll to Table on Unit Click */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <ArrowDownCircle className="h-4 w-4 text-[#545D4B]" />
                          <span>اسکرول خودکار با کلیک روی واحد</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.autoScrollToTable ?? false}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('autoScrollToTable', !(eraVisibility.autoScrollToTable ?? false))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (eraVisibility.autoScrollToTable ?? false) ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              (eraVisibility.autoScrollToTable ?? false) ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        اسکرول نرم و خودکار صفحه به جدول داده‌ها هنگام کلیک روی هر واحد سازمانی یا نمودار.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(eraVisibility.autoScrollToTable ?? false) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={(eraVisibility.autoScrollToTable ?? false) ? 'text-emerald-700' : 'text-gray-500'}>
                        {(eraVisibility.autoScrollToTable ?? false) ? 'اسکرول خودکار فعال' : 'اسکرول غیرفعال (فقط فیلتر)'}
                      </span>
                    </div>
                  </div>

                  {/* Item 5: Slide Hover Preview Popup (80% screen) */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Presentation className="h-4 w-4 text-[#545D4B]" />
                          <span>پاپ‌آپ هاور اسلایدها (۸۰٪ صفحه)</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.slideHoverPreview ?? false}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('slideHoverPreview', !(eraVisibility.slideHoverPreview ?? false))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (eraVisibility.slideHoverPreview ?? false) ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              (eraVisibility.slideHoverPreview ?? false) ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        نمایش پیش‌نمایش بزرگ و جامع اسلاید با حرکت ماوس روی دکمه در جدول و خروج ماوس جهت بستن.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(eraVisibility.slideHoverPreview ?? false) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={(eraVisibility.slideHoverPreview ?? false) ? 'text-emerald-700' : 'text-gray-500'}>
                        {(eraVisibility.slideHoverPreview ?? false) ? 'هاور فعال (۸۰٪ صفحه)' : 'غیرفعال (فقط با کلیک باز می‌شود)'}
                      </span>
                    </div>
                  </div>

                  {/* Item 6: AI Bar Chart Analysis Button Toggle */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span>دکمه تحلیل هوش مصنوعی نمودار</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.showAiChartAnalysis ?? false}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('showAiChartAnalysis', !(eraVisibility.showAiChartAnalysis ?? false))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (eraVisibility.showAiChartAnalysis ?? false) ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              (eraVisibility.showAiChartAnalysis ?? false) ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        نمایش دکمه تحلیل هوش مصنوعی (از موثرترین کارها و ریشه‌یابی) در بالای نمودار میله‌ای داشبوردها.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(eraVisibility.showAiChartAnalysis ?? false) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={(eraVisibility.showAiChartAnalysis ?? false) ? 'text-emerald-700' : 'text-gray-500'}>
                        {(eraVisibility.showAiChartAnalysis ?? false) ? 'دکمه در نمودار فعال است' : 'پیش‌فرض: غیرفعال و مخفی'}
                      </span>
                    </div>
                  </div>

                  {/* Item 7: Slide Before/After Text Position */}
                  <div className="p-4 rounded-xl bg-white border border-[#E2E0D8] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#2D2C28] flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-[#545D4B]" />
                          <span>موقعیت متن قبل و بعد در اسلایدها</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={eraVisibility.slideBeforeAfterUnderImage ?? true}
                          onClick={() => onToggleEraVisibility && onToggleEraVisibility('slideBeforeAfterUnderImage', !(eraVisibility.slideBeforeAfterUnderImage ?? true))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (eraVisibility.slideBeforeAfterUnderImage ?? true) ? 'bg-[#545D4B]' : 'bg-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              (eraVisibility.slideBeforeAfterUnderImage ?? true) ? '-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed">
                        تعیین نحوه چینش متن‌های قبل و بعد؛ چه برای هاور ماوس و چه برای کلیک روی اسلاید و پنجره ارائه. در حالت فعال، متن‌ها مستقیماً زیر عکس‌ها (مشابه پاپ‌آپ) نمایش داده می‌شوند و در حالت غیرفعال در تب جداگانه قرار می‌گیرند.
                      </p>
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${(eraVisibility.slideBeforeAfterUnderImage ?? true) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className={(eraVisibility.slideBeforeAfterUnderImage ?? true) ? 'text-emerald-700' : 'text-gray-500'}>
                        {(eraVisibility.slideBeforeAfterUnderImage ?? true) ? 'فعال (نمایش مستقیم زیر عکس‌ها)' : 'در تب جداگانه (تفکیک به تب‌های مجزا)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Dynamic Column Visibility for Process (ERA) Table */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E0D8] pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-[#2563EB] text-white shadow-xs shrink-0 mt-0.5">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#2D2C28]">
                          مدیریت پویای نمایش تک‌تک ستون‌های جدول فرآیندها (Column Visibility)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          کنترل ۱۲ ستون جدول
                        </span>
                      </div>
                      <p className="text-xs text-[#75746E] mt-1 leading-relaxed font-medium">
                        قابلیت فعال یا غیرفعال کردن نمایش هریک از ستون‌های جدول فرآیندها (شامل ستون BPMN، اسلاید، وضعیت، تاریخ، شرح و سایر موارد) به انتخاب کاربر.
                      </p>
                    </div>
                  </div>

                  {/* Batch Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSetAllEraColumnsVisibility && onSetAllEraColumnsVisibility(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition cursor-pointer"
                      title="نمایش تمام ستون‌های جدول"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>نمایش همه ستون‌ها</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onResetEraColumnsVisibility && onResetEraColumnsVisibility()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F4EE] text-[#545D4B] hover:text-[#2D2C28] text-xs font-bold border border-[#DDDBCF] transition cursor-pointer shadow-2xs"
                      title="بازنشانی وضعیت ستون‌ها به حالت پیش‌فرض"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>بازنشانی پیش‌فرض</span>
                    </button>
                  </div>
                </div>

                {/* Columns Toggle Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  {[
                    { key: 'index' as const, label: 'شماره ردیف (#)', desc: 'شمارنده و ایندکس ردیف در جدول', icon: SlidersHorizontal },
                    { key: 'processName' as const, label: 'نام فرآیند / موجودیت', desc: 'عنوان کامل فرآیند، فرم، یا گزارش', icon: FileSpreadsheet },
                    { key: 'entityType' as const, label: 'نوع موجودیت', desc: 'تفکیک برچسب فرآیند، فرم یا گزارش', icon: Layers },
                    { key: 'orgUnit' as const, label: 'واحد سازمانی', desc: 'دپارتمان یا واحد متولی سازمانی', icon: HardDrive },
                    { key: 'executionDate' as const, label: 'تاریخ انجام', desc: 'تاریخ ثبت و انجام عملیات فرآیندی', icon: Info },
                    { key: 'operationType' as const, label: 'نوع عملیات', desc: 'جدید، اصلاح یا اتوماتیک‌سازی', icon: Tag },
                    { key: 'status' as const, label: 'وضعیت انجام', desc: 'انجام شده، درحال انجام، برای انجام', icon: CheckCircle2 },
                    { key: 'description' as const, label: 'شرح و توضیحات', desc: 'خلاصه متن تغییرات و شرح اقدامات', icon: Edit2 },
                    { key: 'bpmn' as const, label: 'دیاگرام BPMN (مدل‌ساز)', desc: 'دکمه بازکردن ویرایشگر دیاگرام BPMN', icon: Workflow },
                    { key: 'slideFullscreen' as const, label: 'نمایش اسلاید', desc: 'دکمه مشاهده اسلاید تمام‌صفحه و هاور', icon: Presentation },
                    { key: 'slideToggle' as const, label: 'اسلایدشو (انتخاب)', desc: 'سوییچ روشن/خاموش در ارائه اسلایدی', icon: SlidersHorizontal },
                    { key: 'actions' as const, label: 'عملیات (ویرایش و حذف)', desc: 'دکمه‌های اقدام سریع ویرایش و حذف رکورد', icon: Settings },
                  ].map(col => {
                    const isVisible = eraVisibility?.columnVisibility
                      ? eraVisibility.columnVisibility[col.key] !== false
                      : true;
                    const IconComp = col.icon;
                    return (
                      <div
                        key={col.key}
                        className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                          isVisible
                            ? 'bg-white border-[#DDDBCF] shadow-2xs'
                            : 'bg-[#F9F9F6] border-[#E8E6DF] opacity-65'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#2D2C28] flex items-center gap-1.5 text-xs">
                              <IconComp className={`h-4 w-4 ${isVisible ? 'text-[#1E40AF]' : 'text-[#8A8880]'}`} />
                              <span>{col.label}</span>
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isVisible}
                              onClick={() => onToggleEraColumnVisibility && onToggleEraColumnVisibility(col.key, !isVisible)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isVisible ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isVisible ? '-translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-[11px] text-[#75746E] mt-1.5 leading-relaxed font-normal">
                            {col.desc}
                          </p>
                        </div>
                        <div className="text-[10px] font-bold flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#F0EFEA]">
                          <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          <span className={isVisible ? 'text-emerald-700' : 'text-gray-500'}>
                            {isVisible ? 'در حال نمایش در جدول' : 'مخفی از جدول'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 5: System Architecture & SQLite Diagnostics */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-[#E8E6DF] pb-3">
                  <div className="p-2 rounded-xl bg-[#EFEFEA] text-[#4B5344]">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2D2C28]">
                      مشخصات معماری و پایداری داده‌ها
                    </h3>
                    <p className="text-xs text-[#75746E]">
                      پایگاه داده پایدار SQLite و اندپوینت‌های RESTful
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF]">
                    <div className="text-[#75746E] font-medium">نوع پایگاه داده</div>
                    <div className="text-sm font-extrabold text-[#2D2C28] mt-1">SQLite (file:./dev.db)</div>
                    <div className="text-[10px] text-[#446347] font-bold mt-1">ORM Prisma 7 فعال</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF]">
                    <div className="text-[#75746E] font-medium">مکاتبات بارگذاری‌شده</div>
                    <div className="text-sm font-extrabold text-[#2D2C28] mt-1">
                      {formatNumber(allLetters.length)} نامه
                    </div>
                    <div className="text-[10px] text-[#9C3A27] font-bold mt-1">
                      {formatNumber(excludedLetters.length)} نامه تستی مستثنی
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF]">
                    <div className="text-[#75746E] font-medium">تعداد قوانین فعال</div>
                    <div className="text-sm font-extrabold text-[#2D2C28] mt-1">
                      {formatNumber(exclusionRules.length)} استثنا / {formatNumber(causeRules.length)} عامل
                    </div>
                    <div className="text-[10px] text-[#2563EB] font-bold mt-1">آماده پایش آنلاین</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: BACKUP & RESTORE (پشتیبان‌گیری کامل و بازیابی)     */}
          {/* ======================================================== */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Alert Feedback Messages */}
              {backupError && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-[#991B1B]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">خطا در عملیات پشتیبان‌گیری / بازیابی:</div>
                      <div className="mt-0.5 leading-relaxed">{backupError}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setBackupError(null)}
                    className="text-[#991B1B] hover:bg-[#FEE2E2] p-1 rounded-lg transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {importSuccessMessage && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-[#166534]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">عملیات با موفقیت انجام شد:</div>
                      <div className="mt-0.5 leading-relaxed">{importSuccessMessage}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setImportSuccessMessage(null)}
                    className="text-[#166534] hover:bg-[#DCFCE7] p-1 rounded-lg transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {exportSuccess && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-[#166534]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">فایل پشتیبان با موفقیت استخراج و دانلود شد.</div>
                      <div className="mt-0.5 text-[#15803D]">
                        می‌توانید این فایل JSON را برای بایگانی امن ذخیره کرده یا در نسخه دیگر سامانه ایمپورت کنید.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExportSuccess(false)}
                    className="text-[#166534] hover:bg-[#DCFCE7] p-1 rounded-lg transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Informational Hero Banner */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4.5 border border-[#EADBCE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F4E8DC] text-[#8A4A20] shrink-0 mt-0.5">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2D2C28]">
                      پشتیبان‌گیری جامع و انتقال داده‌ها به سامانه‌های دیگر
                    </h3>
                    <p className="text-xs text-[#75746E] mt-1 leading-relaxed">
                      با این قابلیت می‌توانید از تمام نامه‌ها، فرآیندهای سازمانی ERA، تصاویر و مستندات اسلایدها، تنظیمات و قوانین آماری یک فایل استاندارد خروجی تهیه کنید و آن را روی سرور یا رایانه دیگر بازیابی نمایید.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid with 2 Main Cards: Export & Import */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ---------------- CARD 1: EXPORT BACKUP ---------------- */}
                <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E8E6DF] pb-3">
                      <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#1E40AF]">
                        <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#2D2C28]">
                          استخراج و دریافت فایل پشتیبان (Export)
                        </h3>
                        <p className="text-xs text-[#75746E]">
                          تولید فایل JSON یکپارچه شامل تمام داده‌ها و تنظیمات
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#5A5852] leading-relaxed">
                      محتویات بسته‌ی پشتیبان که در فایل ذخیره خواهند شد:
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF] flex items-center justify-between">
                        <span className="text-[#75746E]">✉️ نامه‌های ثبت‌شده:</span>
                        <span className="font-extrabold text-[#2D2C28]">{formatNumber(allLetters.length)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF] flex items-center justify-between">
                        <span className="text-[#75746E]">🏢 فرآیندهای ERA:</span>
                        <span className="font-extrabold text-[#2D2C28]">{formatNumber(totalEraCount)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF] flex items-center justify-between">
                        <span className="text-[#75746E]">🎯 قوانین عامل:</span>
                        <span className="font-extrabold text-[#2563EB]">{formatNumber(causeRules.length)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF] flex items-center justify-between">
                        <span className="text-[#75746E]">🚫 قوانین استثنا:</span>
                        <span className="font-extrabold text-[#9C3A27]">{formatNumber(exclusionRules.length)}</span>
                      </div>
                    </div>

                    {/* Image Backup Mode Selection (همراه با عکس‌ها / بدون عکس‌ها) */}
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-bold text-[#2D2C28]">
                        تنظیمات پشتیبان‌گیری از تصاویر و مستندات اسلایدها:
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <label
                          onClick={() => setBackupIncludeImages(true)}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                            backupIncludeImages
                              ? 'bg-[#EFF6FF] border-[#93C5FD] shadow-2xs'
                              : 'bg-[#FAF9F5] border-[#DDDBCF] hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="backupImageMode"
                            checked={backupIncludeImages}
                            onChange={() => setBackupIncludeImages(true)}
                            className="mt-1 text-[#1E40AF] focus:ring-[#1E40AF]"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A]">
                              <ImageIcon className="h-4 w-4 text-[#2563EB]" />
                              <span>همراه با عکس‌ها و پیوست‌ها (نسخه کامل - پیشنهادی)</span>
                            </div>
                            <p className="text-[11px] text-[#475569] leading-relaxed">
                              شامل تمامی تصاویر اسلایدهای ارائه و اسکرین‌شات‌های ثبت‌شده در دیتابیس SQLite (بکاپ ۱۰۰٪ جامع).
                            </p>
                          </div>
                        </label>

                        <label
                          onClick={() => setBackupIncludeImages(false)}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                            !backupIncludeImages
                              ? 'bg-[#F8FAFC] border-[#CBD5E1] shadow-2xs'
                              : 'bg-[#FAF9F5] border-[#DDDBCF] hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="backupImageMode"
                            checked={!backupIncludeImages}
                            onChange={() => setBackupIncludeImages(false)}
                            className="mt-1 text-[#475569] focus:ring-[#475569]"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#334155]">
                              <ImageOff className="h-4 w-4 text-[#64748B]" />
                              <span>بدون عکس‌ها (فقط متون نامه‌ها، فرآیندها و تنظیمات - بسیار کم‌حجم)</span>
                            </div>
                            <p className="text-[11px] text-[#64748B] leading-relaxed">
                              فقط داده‌های آماری، نامه‌ها و قوانین بدون داده‌های حجیم تصویری صادر می‌شوند (حجم فایل بسیار کم و دانلود سریع).
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={includeClientStorage}
                        onChange={(e) => setIncludeClientStorage(e.target.checked)}
                        className="mt-0.5 rounded text-[#1E40AF] focus:ring-[#1E40AF]"
                      />
                      <span className="text-[#334155] leading-relaxed">
                        شامل تنظیمات نمایشی محلی مرورگر و ترجیحات آماری
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleExportBackup}
                      disabled={isExporting}
                      className="w-full py-3 px-4 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>در حال تجمیع و آماده‌سازی فایل پشتیبان...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span>
                            {backupIncludeImages
                              ? 'دانلود فایل جامع پشتیبان همراه با عکس‌ها (JSON)'
                              : 'دانلود فایل پشتیبان بدون عکس‌ها (JSON)'}
                          </span>
                        </>
                      )}
                    </button>

                    {exportSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex flex-col gap-1.5 animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>فایل پشتیبان با موفقیت ایجاد و دانلود شد.</span>
                        </div>
                        {directDownloadUrl && (
                          <div className="text-[11px] text-emerald-700 pr-6">
                            در صورت عدم شروع خودکار دانلود در مرورگر،{' '}
                            <a
                              href={directDownloadUrl}
                              download={directDownloadFileName}
                              className="font-bold underline text-emerald-900 hover:text-emerald-950"
                            >
                              اینجا کلیک کنید
                            </a>
                            .
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ---------------- CARD 2: IMPORT BACKUP ---------------- */}
                <div className="bg-white rounded-2xl p-5 border border-[#E2E0D8] shadow-xs flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E8E6DF] pb-3">
                      <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#047857]">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#2D2C28]">
                          بازیابی و بارگذاری فایل پشتیبان (Import)
                        </h3>
                        <p className="text-xs text-[#75746E]">
                          بارگذاری فایل JSON پشتیبان و بازگردانی کلیه اطلاعات
                        </p>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleBackupFileChange}
                      className="hidden"
                    />

                    {!selectedBackupFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={handleBackupDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                          isDraggingFile
                            ? 'border-[#047857] bg-[#ECFDF5]'
                            : 'border-[#DDDBCF] hover:border-[#047857] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="p-3 rounded-full bg-[#EFEFEA] text-[#545D4B]">
                          <FileJson className="h-6 w-6" />
                        </div>
                        <div className="text-xs font-bold text-[#2D2C28]">
                          فایل JSON پشتیبان را به اینجا بکشید یا برای انتخاب کلیک کنید
                        </div>
                        <div className="text-[11px] text-[#75746E]">
                          پشتیبانی از فایل‌های پشتیبان صادر شده توسط همین سامانه
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-[#047857]" />
                            <span className="text-xs font-bold text-[#1E293B]">
                              {selectedBackupFileName || 'فایل پشتیبان انتخاب‌شده'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBackupFile(null);
                              setSelectedBackupFileName(null);
                              setParsedBackupSummary(null);
                            }}
                            className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                          >
                            تغییر فایل
                          </button>
                        </div>

                        {parsedBackupSummary && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                            <div>
                              <span className="text-[#64748B]">تاریخ فایل: </span>
                              <span className="font-semibold text-[#1E293B]">{parsedBackupSummary.exportDate}</span>
                            </div>
                            <div>
                              <span className="text-[#64748B]">تعداد نامه‌ها: </span>
                              <span className="font-bold text-[#1E293B]">{formatNumber(parsedBackupSummary.lettersCount)}</span>
                            </div>
                            <div>
                              <span className="text-[#64748B]">فرآیندهای ERA: </span>
                              <span className="font-bold text-[#1E293B]">{formatNumber(parsedBackupSummary.eraCount)}</span>
                            </div>
                            <div>
                              <span className="text-[#64748B]">تصاویر و پیوست‌ها: </span>
                              <span className="font-bold text-[#1E293B]">
                                {parsedBackupSummary.imagesCount > 0
                                  ? `${formatNumber(parsedBackupSummary.imagesCount)} تصویر (کامل)`
                                  : 'بدون تصویر'}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className="text-[#64748B]">مجموع قوانین علل و استثنا: </span>
                              <span className="font-bold text-[#2563EB]">
                                {formatNumber(parsedBackupSummary.causeRulesCount + parsedBackupSummary.exclusionRulesCount)} قانون
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          <div className="text-xs font-bold text-[#334155]">روش بازیابی اطلاعات:</div>
                          <div className="space-y-1.5 text-xs">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="restoreMode"
                                value="replace"
                                checked={restoreMode === 'replace'}
                                onChange={() => setRestoreMode('replace')}
                                className="mt-0.5 text-[#047857] focus:ring-[#047857]"
                              />
                              <div>
                                <span className="font-bold text-[#1E293B]">جایگزینی کامل (Clean Restore - پیشنهادی)</span>
                                <p className="text-[11px] text-[#64748B]">
                                  اطلاعات فعلی پاک شده و داده‌های فایل بکاپ جایگزین می‌شوند.
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="restoreMode"
                                value="merge"
                                checked={restoreMode === 'merge'}
                                onChange={() => setRestoreMode('merge')}
                                className="mt-0.5 text-[#047857] focus:ring-[#047857]"
                              />
                              <div>
                                <span className="font-bold text-[#1E293B]">ادغام با داده‌های موجود (Merge)</span>
                                <p className="text-[11px] text-[#64748B]">
                                  داده‌های فایل بکاپ به پایگاه داده فعلی اضافه می‌شوند.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExecuteRestore}
                    disabled={!selectedBackupFile || isRestoring}
                    className="w-full py-3 px-4 bg-[#047857] hover:bg-[#065F46] text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال بازیابی و اعمال داده‌ها در پایگاه داده...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>شروع بازیابی اطلاعات در پایگاه داده</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 3: Persistence & Mobility Technical Info */}
              <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-[#E2E0D8] shadow-xs text-xs text-[#5A5852] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <Database className="h-5 w-5 text-[#4B5344] shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold text-[#2D2C28]">پایگاه داده پایدار SQLite و سازگاری بین‌سیستمی: </span>
                    <span>فایل خروجی تولیدشده ساختار استاندارد JSON دارد و با هر نمونه‌ای از سامانه سازگار است.</span>
                  </div>
                </div>
                <div className="text-[11px] text-[#047857] font-bold shrink-0 bg-[#ECFDF5] px-3 py-1.5 rounded-xl border border-[#A7F3D0] self-start sm:self-auto">
                  سازگار با تمام مرورگرها و سرورها
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E2E0D8] bg-white sticky bottom-0 z-10">
          <div className="text-xs text-[#75746E] text-center sm:text-right">
            تغییر قوانین بلافاصله در محاسبات آماری، نمودارها و جداول اعمال می‌گردد.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-[#545D4B] hover:bg-[#434A3C] rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-center"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
