import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { RemoveEditDashboard } from './components/RemoveEditDashboard';
import { EraDashboard } from './components/EraDashboard';
import { SlideshowView } from './components/SlideshowView';
import { EraFormModal } from './components/EraFormModal';
import { FileUploadModal } from './components/FileUploadModal';
import { SettingsModal } from './components/SettingsModal';
import { AiBiAssistantModal } from './components/AiBiAssistantModal';
import { INITIAL_LETTERS_DATA, INITIAL_ERA_DATA } from './data/initialData';
import {
  processRawLetters,
  processRawEraItems,
  computeMonthlyMatrix,
  formatNumber,
  extractOrgUnit,
  DEFAULT_EXCLUSION_RULES
} from './utils/parser';
import { RawLetterItem, RawEraItem, ProcessedEraItem, CauseRule, ExclusionRule, EraVisibilitySettings } from './types';
import { api, HealthStatus } from './services/api';
import { CheckCircle2, AlertCircle, Database, RefreshCw, Server, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'removeEdit' | 'era' | 'slideshow'>('removeEdit');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [slideEditingItem, setSlideEditingItem] = useState<ProcessedEraItem | null>(null);
  const [settingsTab, setSettingsTab] = useState<'exclusions' | 'causes' | 'system' | 'backup'>('causes');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleOpenSettings = (tab: 'exclusions' | 'causes' | 'system' | 'backup' = 'causes') => {
    setSettingsTab(tab);
    setIsSettingsModalOpen(true);
  };

  const [rawLetters, setRawLetters] = useState<RawLetterItem[]>(INITIAL_LETTERS_DATA);
  const [rawEraItems, setRawEraItems] = useState<RawEraItem[]>(INITIAL_ERA_DATA);
  const [rules, setRules] = useState<CauseRule[]>([]);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>(DEFAULT_EXCLUSION_RULES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dbHealth, setDbHealth] = useState<HealthStatus | null>(null);

  // Unit Cause Column Visibility Configuration State (ذخیره‌شده در دیتابیس SQLite)
  const [unitCauseVisibility, setUnitCauseVisibility] = useState<Record<string, boolean>>({
    'حسابداری مالی': true,
    'فروش': false,
    'all': true,
  });

  // One-time initialization/migration of user defaults as requested:
  // - AI disabled by default
  // - Debug mode disabled by default
  // - Filter execution mode default: server-side query
  // - ERA Visibility Boxes 1, 2, 3 and Auto-scroll: disabled by default
  if (typeof window !== 'undefined' && !localStorage.getItem('era_system_defaults_v2_applied')) {
    try {
      localStorage.setItem('era_system_defaults_v2_applied', 'true');
      localStorage.setItem('show_floating_ai_button', 'false');
      localStorage.setItem('ai_bi_debug_mode', 'false');
      localStorage.setItem('filter_execution_mode', 'server');
      const existingVis = localStorage.getItem('era_visibility_settings');
      const parsed = existingVis ? JSON.parse(existingVis) : {};
      parsed.showHeader = false;
      parsed.showMetrics = false;
      parsed.showEntityChips = false;
      parsed.autoScrollToTable = false;
      if (parsed.slideBeforeAfterUnderImage === undefined) {
        parsed.slideBeforeAfterUnderImage = true;
      }
      localStorage.setItem('era_visibility_settings', JSON.stringify(parsed));
    } catch {}
  }

  // Floating AI BI Assistant Button display setting (ذخیره در localStorage و کنترل از تنظیمات - پیش‌فرض غیرفعال)
  const [showFloatingAiButton, setShowFloatingAiButton] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('show_floating_ai_button');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false; // پیش‌فرض غیرفعال
  });

  // AI Debug Mode state (ذخیره در localStorage و کنترل از تنظیمات هوش مصنوعی - پیش‌فرض غیرفعال)
  const [aiDebugMode, setAiDebugMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai_bi_debug_mode');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false; // پیش‌فرض غیرفعال
  });

  // Filter Execution Mode: 'client' (In-Memory) vs 'server' (Server-side SQLite - پیش‌فرض روی حالت سرور)
  const [filterExecutionMode, setFilterExecutionMode] = useState<'client' | 'server'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filter_execution_mode');
      if (saved === 'server' || saved === 'client') {
        return saved;
      }
    }
    return 'server'; // پیش‌فرض روی حالت server side query
  });

  // ERA Dashboard Section Visibility & Interaction Settings (باکس‌های ۱ و ۲ و ۳ و اسکرول خودکار پیش‌فرض غیرفعال)
  const [eraVisibility, setEraVisibility] = useState<EraVisibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('era_visibility_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            showHeader: parsed.showHeader ?? false,
            showMetrics: parsed.showMetrics ?? false,
            showEntityChips: parsed.showEntityChips ?? false,
            autoScrollToTable: parsed.autoScrollToTable ?? false,
            slideHoverPreview: parsed.slideHoverPreview ?? false,
            showAiChartAnalysis: parsed.showAiChartAnalysis ?? false,
            slideBeforeAfterUnderImage: parsed.slideBeforeAfterUnderImage ?? true
          };
        } catch {}
      }
    }
    return {
      showHeader: false,
      showMetrics: false,
      showEntityChips: false,
      autoScrollToTable: false,
      slideHoverPreview: false,
      showAiChartAnalysis: false,
      slideBeforeAfterUnderImage: true
    };
  });

  const handleToggleEraVisibility = (key: keyof EraVisibilitySettings, val: boolean) => {
    setEraVisibility(prev => {
      const next = { ...prev, [key]: val };
      if (typeof window !== 'undefined') {
        localStorage.setItem('era_visibility_settings', JSON.stringify(next));
      }
      return next;
    });
  };

  const handleToggleFloatingAiButton = (val: boolean) => {
    setShowFloatingAiButton(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('show_floating_ai_button', String(val));
    }
    showToast(
      val
        ? 'دستیار هوش مصنوعی فعال شد (دکمه هدر و دکمه گوشه صفحه نمایان شدند).'
        : 'دستیار هوش مصنوعی غیرفعال شد (دکمه‌های هدر و گوشه صفحه پنهان شدند).'
    );
  };

  const handleToggleAiDebugMode = (val: boolean) => {
    setAiDebugMode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_bi_debug_mode', String(val));
    }
    showToast(
      val
        ? 'حالت دیباگ هوش مصنوعی فعال شد (کوئری‌های SQL نمایش داده می‌شوند).'
        : 'حالت دیباگ هوش مصنوعی غیرفعال شد.'
    );
  };

  const handleToggleFilterExecutionMode = (mode: 'client' | 'server') => {
    setFilterExecutionMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('filter_execution_mode', mode);
    }
    api.saveSetting('filter_execution_mode', mode).catch(() => {});
    showToast(
      mode === 'server'
        ? 'حالت فیلترسازی مستقیم در پایگاه داده سرور (Server-side SQLite) فعال گردید.'
        : 'حالت فیلترسازی فوق‌سریع در حافظه مرورگر (In-Memory Client-side) فعال گردید.'
    );
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial data from internal REST APIs
  const loadDatabaseData = useCallback(async (showSyncToast = false) => {
    try {
      setIsSyncing(true);
      const [letters, era, fetchedRules, fetchedExclusions, settings, health] = await Promise.all([
        api.getLetters(),
        api.getEraItems(),
        api.getRules().catch(() => []),
        api.getExclusions().catch(() => []),
        api.getSettings().catch(() => ({})),
        api.getHealth().catch(() => null)
      ]);

      if (letters && letters.length > 0) {
        setRawLetters(letters);
      }
      if (era && era.length > 0) {
        setRawEraItems(era);
        // Sync any items marked for slide in SQLite database into selectedSlideIds
        const dbSlideIds = era
          .filter((it: any) => Boolean(it.isSelectedForSlide || it.raw?.isSelectedForSlide || (it.rawJson && JSON.parse(it.rawJson).isSelectedForSlide)))
          .map((it: any) => it.id || (it as any)._dbId)
          .filter(Boolean);
        
        if (dbSlideIds.length > 0) {
          setSelectedSlideIds(prev => {
            const next = new Set(prev);
            dbSlideIds.forEach((id: string) => next.add(id));
            try {
              localStorage.setItem('era_selected_slide_ids', JSON.stringify(Array.from(next)));
            } catch {}
            return next;
          });
        }
      }
      if (fetchedRules && fetchedRules.length > 0) {
        setRules(fetchedRules);
      }
      if (fetchedExclusions && fetchedExclusions.length > 0) {
        setExclusionRules(fetchedExclusions);
      }
      const settingsRecord = (settings || {}) as Record<string, any>;
      if (settingsRecord.unit_cause_visibility_config) {
        setUnitCauseVisibility(settingsRecord.unit_cause_visibility_config);
      }
      if (settingsRecord.filter_execution_mode === 'server' || settingsRecord.filter_execution_mode === 'client') {
        setFilterExecutionMode(settingsRecord.filter_execution_mode);
      }
      if (health) {
        setDbHealth(health);
      }

      if (showSyncToast) {
        showToast('داده‌ها با موفقیت از دیتابیس SQLite همگام‌سازی شدند.');
      }
    } catch (err: any) {
      console.warn('REST API not ready yet or loading fallback, using initial data:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);


  useEffect(() => {
    loadDatabaseData(false);
  }, [loadDatabaseData]);

  // Slide selection state (Set of item IDs selected for slideshow presentation)
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('era_selected_slide_ids');
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) {
            return new Set(arr);
          }
        }
      }
    } catch {}
    return new Set<string>();
  });

  const handleToggleSlideSelection = useCallback(async (itemId: string) => {
    let nextVal = false;
    setSelectedSlideIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        nextVal = false;
      } else {
        next.add(itemId);
        nextVal = true;
      }
      try {
        localStorage.setItem('era_selected_slide_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    // Update rawEraItems state immediately
    setRawEraItems(prev => prev.map((item, idx) => {
      const pId = item.id || (item as any)._dbId || `era-${idx + 1}`;
      if (pId === itemId || item.id === itemId) {
        return {
          ...item,
          isSelectedForSlide: nextVal
        };
      }
      return item;
    }));

    // Persist directly to SQLite database
    try {
      await api.toggleEraSlide(itemId, nextVal);
    } catch (err) {
      console.warn('SQLite slide sync notice:', err);
    }
  }, []);

  const handleBatchUpdateSlideSelection = useCallback(async (itemIds: string[], isSelected: boolean) => {
    setSelectedSlideIds(prev => {
      const next = new Set(prev);
      itemIds.forEach(id => {
        if (isSelected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      try {
        localStorage.setItem('era_selected_slide_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    const idSet = new Set(itemIds);
    setRawEraItems(prev => prev.map((item, idx) => {
      const pId = item.id || (item as any)._dbId || `era-${idx + 1}`;
      if (idSet.has(pId) || (item.id && idSet.has(item.id))) {
        return {
          ...item,
          isSelectedForSlide: isSelected
        };
      }
      return item;
    }));

    // Persist batch directly to SQLite database
    try {
      await api.batchUpdateEraSlide(itemIds, isSelected);
    } catch (err) {
      console.warn('SQLite batch slide sync notice:', err);
    }
  }, []);

  // Processed Data memoization with rules engine and exclusion rules
  const processedLetters = useMemo(() => {
    return processRawLetters(rawLetters, rules, exclusionRules);
  }, [rawLetters, rules, exclusionRules]);

  const excludedLettersCount = useMemo(() => {
    return processedLetters.filter(l => l.isExcluded).length;
  }, [processedLetters]);

  const processedEraItems = useMemo(() => {
    const items = processRawEraItems(rawEraItems);
    return items.map(item => ({
      ...item,
      isSelectedForSlide: selectedSlideIds.has(item.id)
    }));
  }, [rawEraItems, selectedSlideIds]);

  // Compute monthly statistics and unit matrix
  const matrixStats = useMemo(() => {
    return computeMonthlyMatrix(processedLetters);
  }, [processedLetters]);

  // Extract all distinct organizational units from all uploaded/loaded letters and data
  const allOrganizationalUnits = useMemo(() => {
    const unitsSet = new Set<string>();
    // 1. From processed letters (which normalizes creator strings like "نام - نقش - واحد")
    processedLetters.forEach(l => {
      if (l.orgUnit && l.orgUnit !== 'نامشخص' && l.orgUnit.trim() !== '') {
        unitsSet.add(l.orgUnit.trim());
      }
    });
    // 2. Fallback check directly on raw letters
    rawLetters.forEach(l => {
      const explicitUnit = (l["واحد سازمانی"] || l["سازمان"] || (l as any).orgUnit || (l as any).unit);
      if (explicitUnit && typeof explicitUnit === 'string' && explicitUnit.trim() !== '') {
        unitsSet.add(explicitUnit.trim());
      }
      const creatorField = (
        l["ایجاد کننده نامه"] ||
        l["ایجاد کننده"] ||
        l["ایجادکننده نامه"] ||
        l["ایجادکننده"] ||
        (l as any).creatorRaw ||
        (l as any).creator ||
        l["ثبت کننده"]
      );
      const extracted = extractOrgUnit(creatorField, l["فرستنده"]);
      if (extracted.unit && extracted.unit !== 'نامشخص' && extracted.unit.trim() !== '') {
        unitsSet.add(extracted.unit.trim());
      }
    });
    // 3. From ERA items
    rawEraItems.forEach(e => {
      const u = e["واحد سازمانی"] || e["واحد"] || (e as any).unit || (e as any).orgUnit;
      if (u && typeof u === 'string' && u.trim() !== '') {
        unitsSet.add(u.trim());
      }
    });
    // 4. From saved unit visibility keys
    Object.keys(unitCauseVisibility).forEach(k => {
      if (k && k !== 'all' && k.trim() !== '') {
        unitsSet.add(k.trim());
      }
    });
    return Array.from(unitsSet).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [processedLetters, rawLetters, rawEraItems, unitCauseVisibility]);

  // Rules CRUD handlers
  const handleCreateRule = async (ruleData: Partial<CauseRule>) => {
    try {
      setIsSyncing(true);
      const newRule = await api.createRule({
        keyword: ruleData.keyword || '',
        cause: ruleData.cause || 'نامشخص',
        targetUnit: ruleData.targetUnit || null,
        description: ruleData.description || null,
        color: ruleData.color || '#2563EB',
        isActive: ruleData.isActive !== false,
        matchType: ruleData.matchType || 'contains',
        priority: ruleData.priority || 10
      });
      setRules(prev => [...prev, newRule]);
      showToast(`قانون عامل جدید «${newRule.cause}» ثبت و اعمال گردید.`);
    } catch (err: any) {
      console.error('Error creating rule via REST API:', err);
      // Fallback local state
      const localRule: CauseRule = {
        id: `rule-${Date.now()}`,
        keyword: ruleData.keyword || '',
        cause: ruleData.cause || 'نامشخص',
        targetUnit: ruleData.targetUnit || null,
        description: ruleData.description || null,
        color: ruleData.color || '#2563EB',
        isActive: ruleData.isActive !== false,
        matchType: ruleData.matchType || 'contains',
        priority: ruleData.priority || 10
      };
      setRules(prev => [...prev, localRule]);
      showToast(`قانون «${localRule.cause}» در حافظه موقت ثبت شد.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateRule = async (id: string, ruleData: Partial<CauseRule>) => {
    try {
      setIsSyncing(true);
      const updated = await api.updateRule(id, ruleData);
      setRules(prev => prev.map(r => r.id === id ? updated : r));
      showToast(`قانون «${updated.cause}» با موفقیت بروزرسانی شد.`);
    } catch (err: any) {
      console.error('Error updating rule via REST API:', err);
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...ruleData } : r));
      showToast('قانون بروزرسانی شد.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      setIsSyncing(true);
      await api.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      showToast('قانون مورد نظر با موفقیت حذف گردید.');
    } catch (err: any) {
      console.error('Error deleting rule via REST API:', err);
      setRules(prev => prev.filter(r => r.id !== id));
      showToast('قانون حذف گردید.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetRules = async () => {
    try {
      setIsSyncing(true);
      const defaultRules = await api.resetRules();
      setRules(defaultRules);
      showToast('قوانین عامل به تنظیمات پیش‌فرض بازنشانی شدند.');
    } catch (err: any) {
      console.error('Error resetting rules:', err);
      showToast('خطا در بازنشانی قوانین.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Exclusion Rules CRUD handlers
  const handleCreateExclusion = async (ruleData: Partial<ExclusionRule>) => {
    try {
      setIsSyncing(true);
      const newRule = await api.createExclusion({
        keyword: ruleData.keyword || '',
        reason: ruleData.reason || 'تست و آزمایشی',
        isActive: ruleData.isActive !== false,
        matchType: ruleData.matchType || 'contains',
        field: ruleData.field || 'subject'
      });
      setExclusionRules(prev => [...prev, newRule]);
      showToast(`قانون استثنا جدید «${newRule.keyword}» ثبت و در آمار اعمال گردید.`);
    } catch (err: any) {
      console.error('Error creating exclusion rule:', err);
      const localRule: ExclusionRule = {
        id: `excl-${Date.now()}`,
        keyword: ruleData.keyword || '',
        reason: ruleData.reason || 'تست و آزمایشی',
        isActive: ruleData.isActive !== false,
        matchType: ruleData.matchType || 'contains',
        field: ruleData.field || 'subject'
      };
      setExclusionRules(prev => [...prev, localRule]);
      showToast(`قانون استثنا «${localRule.keyword}» در حافظه موقت ثبت شد.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateExclusion = async (id: string, ruleData: Partial<ExclusionRule>) => {
    try {
      setIsSyncing(true);
      const updated = await api.updateExclusion(id, ruleData);
      setExclusionRules(prev => prev.map(r => r.id === id ? updated : r));
      showToast(`قانون استثنا «${updated.keyword}» بروزرسانی گردید.`);
    } catch (err: any) {
      console.error('Error updating exclusion rule:', err);
      setExclusionRules(prev => prev.map(r => r.id === id ? { ...r, ...ruleData } : r));
      showToast('قانون استثنا بروزرسانی شد.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteExclusion = async (id: string) => {
    try {
      setIsSyncing(true);
      await api.deleteExclusion(id);
      setExclusionRules(prev => prev.filter(r => r.id !== id));
      showToast('قانون استثنا با موفقیت حذف شد.');
    } catch (err: any) {
      console.error('Error deleting exclusion rule:', err);
      setExclusionRules(prev => prev.filter(r => r.id !== id));
      showToast('قانون استثنا حذف گردید.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetExclusions = async () => {
    try {
      setIsSyncing(true);
      const defaultExclusions = await api.resetExclusions();
      setExclusionRules(defaultExclusions);
      showToast('قوانین استثنای کلمات به حالت پیش‌فرض (کلمات تست) بازنشانی شدند.');
    } catch (err: any) {
      console.error('Error resetting exclusion rules:', err);
      setExclusionRules(DEFAULT_EXCLUSION_RULES);
      showToast('قوانین استثنا به پیش‌فرض بازنشانی شد.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleUnitCauseVisibility = async (unit: string, isVisible: boolean) => {
    const next = { ...unitCauseVisibility, [unit]: isVisible };
    setUnitCauseVisibility(next);
    try {
      await api.saveSetting('unit_cause_visibility_config', next);
    } catch (e) {
      console.error('Error saving unit visibility to SQLite database:', e);
    }
    showToast(
      isVisible
        ? `نمایش ستون عامل برای واحد «${unit}» در دیتابیس فعال شد.`
        : `ستون عامل برای واحد «${unit}» در دیتابیس مخفی شد.`
    );
  };

  const handleSetAllUnitsCauseVisibility = async (isVisible: boolean) => {
    const next: Record<string, boolean> = { ...unitCauseVisibility, all: isVisible };
    allOrganizationalUnits.forEach(u => {
      next[u] = isVisible;
    });
    setUnitCauseVisibility(next);
    try {
      await api.saveSetting('unit_cause_visibility_config', next);
    } catch (e) {
      console.error('Error saving settings to SQLite database:', e);
    }
    showToast(
      isVisible
        ? 'نمایش ستون عامل برای تمامی واحدها در دیتابیس فعال گردید.'
        : 'ستون عامل برای تمامی واحدها در دیتابیس مخفی شد.'
    );
  };

  const handleSaveAllUnitVisibility = async (nextConfig: Record<string, boolean>) => {
    setUnitCauseVisibility(nextConfig);
    try {
      await api.saveSetting('unit_cause_visibility_config', nextConfig);
      showToast('تنظیمات واحدهای مجاز ستون عامل با موفقیت در پایگاه داده ذخیره شد.');
    } catch (e) {
      console.error('Error saving settings to SQLite database:', e);
      showToast('خطا در ذخیره تنظیمات در پایگاه داده', 'error');
    }
  };


  // Handler: Import Letters via POST /api/letters
  const handleImportLetters = async (newLetters: RawLetterItem[], append: boolean) => {
    try {
      setIsSyncing(true);
      const res = await api.saveLetters(newLetters, append ? 'append' : 'replace');
      await loadDatabaseData(false);
      if (append) {
        showToast(`${newLetters.length} نامه جدید با موفقیت به پایگاه داده SQLite اضافه شد.`);
      } else {
        showToast(`پایگاه داده نامه‌ها با ${newLetters.length} رکورد جدید بازنویسی و ذخیره گردید.`);
      }
    } catch (err: any) {
      console.error('Error saving letters via REST API:', err);
      if (append) {
        setRawLetters(prev => [...newLetters, ...prev]);
      } else {
        setRawLetters(newLetters);
      }
      showToast('داده‌ها در حافظه ثبت شدند (خطای اتصال به سرور REST)', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Import ERA items via POST /api/era
  const handleImportEra = async (newEra: RawEraItem[], append: boolean) => {
    try {
      setIsSyncing(true);
      await api.saveEraItems(newEra, append ? 'append' : 'replace');
      await loadDatabaseData(false);
      if (append) {
        showToast(`${newEra.length} رکورد فرآیندی جدید به پایگاه داده SQLite افزوده شد.`);
      } else {
        showToast(`لیست فرآیندهای ERA با ${newEra.length} رکورد جدید در SQLite ذخیره شد.`);
      }
    } catch (err: any) {
      console.error('Error saving ERA items via REST API:', err);
      if (append) {
        setRawEraItems(prev => [...newEra, ...prev]);
      } else {
        setRawEraItems(newEra);
      }
      showToast('داده‌ها در حافظه ثبت شدند (خطای سرور REST)', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Add ERA Item via POST /api/era
  const handleAddEraItem = async (item: Partial<ProcessedEraItem>) => {
    try {
      setIsSyncing(true);
      const rawItem: RawEraItem = {
        "نام فرایند": item.processName || '',
        processName: item.processName || '',
        "واحد سازمانی": item.orgUnit || '',
        orgUnit: item.orgUnit || '',
        "تاریخ انجام": item.executionDate || '1405/04/15',
        executionDate: item.executionDate || '1405/04/15',
        "نوع عملیات": item.operationType || 'اصلاح',
        operationType: item.operationType || 'اصلاح',
        "نوع موجودیت": item.entityType || 'فرآیند',
        entityType: item.entityType || 'فرآیند',
        "توضیحات": item.description || '',
        description: item.description || '',
        problemDescription: item.problemDescription,
        solutionDescription: item.solutionDescription,
        achievements: item.achievements,
        showAchievements: item.showAchievements,
        impactTimeMetric: item.impactTimeMetric,
        impactErrorMetric: item.impactErrorMetric,
        showImpactMetrics: item.showImpactMetrics,
        isSelectedForSlide: item.isSelectedForSlide,
        formImageUrl: item.formImageUrl,
        formImages: item.formImages
      };

      await api.createEraItem(rawItem);
      await loadDatabaseData(false);
      showToast(`فرآیند "${item.processName}" در پایگاه داده SQLite ذخیره شد.`);
    } catch (err: any) {
      console.error('Error creating ERA item via REST API:', err);
      const rawItem: RawEraItem = {
        "نام فرایند": item.processName || '',
        processName: item.processName || '',
        "واحد سازمانی": item.orgUnit || '',
        orgUnit: item.orgUnit || '',
        "تاریخ انجام": item.executionDate || '1405/04/15',
        executionDate: item.executionDate || '1405/04/15',
        "نوع عملیات": item.operationType || 'اصلاح',
        operationType: item.operationType || 'اصلاح',
        "نوع موجودیت": item.entityType || 'فرآیند',
        entityType: item.entityType || 'فرآیند',
        "توضیحات": item.description || '',
        description: item.description || '',
        problemDescription: item.problemDescription,
        solutionDescription: item.solutionDescription,
        achievements: item.achievements,
        showAchievements: item.showAchievements,
        impactTimeMetric: item.impactTimeMetric,
        impactErrorMetric: item.impactErrorMetric,
        showImpactMetrics: item.showImpactMetrics,
        isSelectedForSlide: item.isSelectedForSlide,
        formImageUrl: item.formImageUrl,
        formImages: item.formImages
      };
      setRawEraItems(prev => [rawItem, ...prev]);
      showToast(`فرآیند "${item.processName}" با موفقیت ثبت شد.`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Update ERA Item via PUT /api/era/:id
  const handleUpdateEraItem = async (item: Partial<ProcessedEraItem>) => {
    if (!item.id && !item.processName) return;

    // 1. Immediately update rawEraItems state strictly by unique ID
    setRawEraItems(prev => {
      return prev.map((p, idx) => {
        const pId = p.id || (p as any)._dbId || `era-${idx + 1}`;
        const isMatch = item.id 
          ? (pId === item.id || p.id === item.id || (p as any)._dbId === item.id)
          : (p["نام فرایند"] === item.processName && p["واحد سازمانی"] === item.orgUnit && p["تاریخ انجام"] === item.executionDate);

        if (isMatch) {
          const updatedName = item.processName !== undefined ? item.processName : (p.processName || p["نام فرایند"] || '');
          const updatedUnit = item.orgUnit !== undefined ? item.orgUnit : (p.orgUnit || p["واحد سازمانی"] || '');
          const updatedDate = item.executionDate !== undefined ? item.executionDate : (p.executionDate || p["تاریخ انجام"] || '');
          const updatedOpType = item.operationType !== undefined ? item.operationType : (p.operationType || p["نوع عملیات"] || 'اصلاح');
          const updatedEntityType = item.entityType !== undefined ? item.entityType : (p.entityType || p["نوع موجودیت"] || 'فرآیند');
          const updatedDesc = item.description !== undefined ? item.description : (p.description || p["توضیحات"] || '');

          return {
            ...p,
            id: pId,
            _dbId: pId,
            "نام فرایند": updatedName,
            processName: updatedName,
            "واحد سازمانی": updatedUnit,
            orgUnit: updatedUnit,
            "تاریخ انجام": updatedDate,
            executionDate: updatedDate,
            "نوع عملیات": updatedOpType,
            operationType: updatedOpType,
            "نوع موجودیت": updatedEntityType,
            entityType: updatedEntityType,
            "توضیحات": updatedDesc,
            description: updatedDesc,
            isSelectedForSlide: item.isSelectedForSlide !== undefined ? item.isSelectedForSlide : p.isSelectedForSlide,
            problemDescription: item.problemDescription !== undefined ? item.problemDescription : p.problemDescription,
            solutionDescription: item.solutionDescription !== undefined ? item.solutionDescription : p.solutionDescription,
            achievements: item.achievements !== undefined ? item.achievements : p.achievements,
            showAchievements: item.showAchievements !== undefined ? item.showAchievements : p.showAchievements,
            impactTimeMetric: item.impactTimeMetric !== undefined ? item.impactTimeMetric : p.impactTimeMetric,
            impactErrorMetric: item.impactErrorMetric !== undefined ? item.impactErrorMetric : p.impactErrorMetric,
            showImpactMetrics: item.showImpactMetrics !== undefined ? item.showImpactMetrics : p.showImpactMetrics,
            formImageUrl: item.formImageUrl !== undefined ? item.formImageUrl : p.formImageUrl,
            formImages: item.formImages !== undefined ? item.formImages : p.formImages
          };
        }
        return p;
      });
    });

    try {
      if (item.id && !item.id.startsWith('era-')) {
        await api.updateEraItem(item.id, item);
      }
      showToast(`فرآیند "${item.processName || ''}" با موفقیت به‌روزرسانی شد.`);
    } catch (err: any) {
      console.warn('REST API update note:', err);
    }
  };

  // Handler: Delete ERA Item via DELETE /api/era/:id
  const handleDeleteEraItem = async (id: string) => {
    try {
      setIsSyncing(true);
      if (!id.startsWith('era-')) {
        await api.deleteEraItem(id);
      }
      await loadDatabaseData(false);
      showToast('فرآیند مورد نظر با موفقیت از دیتابیس SQLite حذف گردید.');
    } catch (err: any) {
      console.error('Error deleting ERA item via REST API:', err);
      setRawEraItems(prev => prev.filter((_, idx) => `era-${idx + 1}` !== id && !id.includes(`era-${idx + 1}`)));
      showToast('فرآیند با موفقیت حذف گردید.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Reset to Initial Data via POST /api/seed
  const handleResetData = async () => {
    if (confirm('آیا از بازنشانی پایگاه داده SQLite و بارگذاری مجدد داده‌های اولیه اطمینان دارید؟')) {
      try {
        setIsSyncing(true);
        await api.seedDatabase(true);
        await loadDatabaseData(false);
        showToast('پایگاه داده SQLite با اطلاعات پیش‌فرض اولیه بازنشانی شد.');
      } catch (err: any) {
        console.error('Error re-seeding database:', err);
        setRawLetters(INITIAL_LETTERS_DATA);
        setRawEraItems(INITIAL_ERA_DATA);
        showToast('داده‌های اولیه با موفقیت بازنشانی شدند.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0] text-[#2D2C28] selection:bg-[#545D4B] selection:text-white" dir="rtl">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        lettersCount={processedLetters.length}
        uniqueLettersCount={matrixStats.grandTotalUniqueLetters}
        eraCount={processedEraItems.length}
        slideSelectedCount={processedEraItems.filter(i => i.isSelectedForSlide).length}
        rulesCount={rules.length}
        exclusionRulesCount={exclusionRules.length}
        excludedCount={excludedLettersCount}
        showAiButton={showFloatingAiButton}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenSettingsModal={() => handleOpenSettings('causes')}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onResetData={handleResetData}
        isSyncing={isSyncing}
        onRefreshData={() => loadDatabaseData(true)}
      />

      {/* Database & Architecture Info Strip */}
      <div className="bg-[#EBEBE6] border-b border-[#DDDBCF] px-4 sm:px-6 lg:px-8 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[#5A5852]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#2D2C28]">
              <Database className="h-3.5 w-3.5 text-[#446347]" />
              پایگاه داده: SQLite (Prisma 7 ORM)
            </span>
            <span className="text-[#DDDBCF]">|</span>
            <span className="inline-flex items-center gap-1.5 text-[#545D4B] font-semibold">
              <Server className="h-3.5 w-3.5 text-[#545D4B]" />
              معماری: Internal REST APIs
            </span>
            {excludedLettersCount > 0 && (
              <>
                <span className="text-[#DDDBCF]">|</span>
                <span className="inline-flex items-center gap-1 text-[#9C3A27] font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>{formatNumber(excludedLettersCount)} نامه مستثنی شده (تست)</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#75746E]">
            <span>مجموع رکوردها: {formatNumber(processedLetters.length + processedEraItems.length)}</span>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[#446347] font-sans font-bold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                در حال همگام‌سازی...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'removeEdit' ? (
          <RemoveEditDashboard
            letters={processedLetters}
            unitStats={matrixStats.unitStats}
            allMonths={matrixStats.allMonths}
            grandTotalDeletes={matrixStats.grandTotalDeletes}
            grandTotalEdits={matrixStats.grandTotalEdits}
            grandTotalLetters={matrixStats.grandTotalLetters}
            grandTotalUniqueLetters={matrixStats.grandTotalUniqueLetters}
            rules={rules}
            exclusionRules={exclusionRules}
            unitCauseVisibility={unitCauseVisibility}
            onToggleUnitCauseVisibility={handleToggleUnitCauseVisibility}
            onOpenSettingsModal={() => handleOpenSettings('causes')}
            eraVisibility={eraVisibility}
            filterExecutionMode={filterExecutionMode}
          />
        ) : activeTab === 'era' ? (
          <EraDashboard
            eraItems={processedEraItems}
            onAddEraItem={handleAddEraItem}
            onUpdateEraItem={handleUpdateEraItem}
            onDeleteEraItem={handleDeleteEraItem}
            onGoToSlideshow={() => setActiveTab('slideshow')}
            onToggleSlide={handleToggleSlideSelection}
            onBatchUpdateSlideSelection={handleBatchUpdateSlideSelection}
            filterExecutionMode={filterExecutionMode}
            eraVisibility={eraVisibility}
            onToggleEraVisibility={handleToggleEraVisibility}
            onOpenGeneralAiChat={() => setIsAiModalOpen(true)}
          />
        ) : (
          <SlideshowView
            items={processedEraItems}
            onToggleSlideItem={handleToggleSlideSelection}
            onOpenEdit={(item) => setSlideEditingItem(item)}
            onClose={() => setActiveTab('era')}
            slideBeforeAfterUnderImage={eraVisibility.slideBeforeAfterUnderImage ?? true}
            onToggleBeforeAfterPosition={(val) => handleToggleEraVisibility('slideBeforeAfterUnderImage', val)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E2E0D8] bg-[#FAFAF7]/80 py-4 text-xs text-[#75746E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#446347] animate-pulse" />
            <span className="font-semibold text-[#2D2C28]">سامانه هوشمند آمار و پایش واحد IT (نرم افزار)</span>
            <span>- پایداری داده با SQLite و ORM پریسما</span>
          </div>
          <div className="text-[#8A8880] flex items-center gap-3">
            <span>تعداد نامه‌ها: {formatNumber(processedLetters.length)}</span>
            <span>تعداد فرآیندهای ERA: {formatNumber(processedEraItems.length)}</span>
          </div>
        </div>
      </footer>

      {/* ERA Form Edit Modal for Slideshow direct editing */}
      {slideEditingItem && (
        <EraFormModal
          isOpen={!!slideEditingItem}
          onClose={() => setSlideEditingItem(null)}
          onSave={(item) => {
            handleUpdateEraItem(item);
            setSlideEditingItem(null);
            showToast(`تغییرات فرآیند "${item.processName || slideEditingItem.processName}" با موفقیت ذخیره و در اسلاید اعمال شد.`);
          }}
          initialItem={slideEditingItem}
          existingUnits={Array.from(allOrganizationalUnits)}
        />
      )}

      {/* JSON File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportLetters={handleImportLetters}
        onImportEra={handleImportEra}
        activeTab={activeTab}
      />

      {/* Comprehensive Settings Modal (Exclusion Rules + Cause Rules + Unit Column Visibility + AI Controls + Backup & Restore) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsTab}
        exclusionRules={exclusionRules}
        onAddExclusion={handleCreateExclusion}
        onUpdateExclusion={handleUpdateExclusion}
        onDeleteExclusion={handleDeleteExclusion}
        onResetExclusions={handleResetExclusions}
        causeRules={rules}
        onAddCauseRule={handleCreateRule}
        onUpdateCauseRule={handleUpdateRule}
        onDeleteCauseRule={handleDeleteRule}
        onResetCauseRules={handleResetRules}
        unitCauseVisibility={unitCauseVisibility}
        onToggleUnitCauseVisibility={handleToggleUnitCauseVisibility}
        onSetAllUnitsCauseVisibility={handleSetAllUnitsCauseVisibility}
        onSaveAllUnitsCauseVisibility={handleSaveAllUnitVisibility}
        allUnits={allOrganizationalUnits}
        allLetters={processedLetters}
        totalEraCount={processedEraItems.length}
        showFloatingAiButton={showFloatingAiButton}
        onToggleFloatingAiButton={handleToggleFloatingAiButton}
        aiDebugMode={aiDebugMode}
        onToggleAiDebugMode={handleToggleAiDebugMode}
        filterExecutionMode={filterExecutionMode}
        onToggleFilterExecutionMode={handleToggleFilterExecutionMode}
        eraVisibility={eraVisibility}
        onToggleEraVisibility={handleToggleEraVisibility}
        onOpenAiModal={() => {
          setIsSettingsModalOpen(false);
          setIsAiModalOpen(true);
        }}
        onDataRestored={async () => {
          await loadDatabaseData(true);
          showToast('اطلاعات با موفقیت از فایل پشتیبان بازیابی و بارگذاری شدند.');
        }}
      />

      {/* Gemini AI BI Assistant & Intelligence Chat Modal */}
      <AiBiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        totalLettersCount={processedLetters.length}
        aiDebugMode={aiDebugMode}
        onToggleAiDebugMode={handleToggleAiDebugMode}
      />

      {/* Floating AI BI Quick Access Button (Icon-Only Gemini Sparkle) */}
      {showFloatingAiButton && (
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="fixed bottom-6 left-6 z-40 w-13 h-13 rounded-full bg-gradient-to-tr from-[#1E40AF] via-[#2563EB] to-[#60A5FA] hover:from-[#1D4ED8] hover:to-[#3B82F6] text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer group border-2 border-white/40 animate-in fade-in slide-in-from-bottom-3 duration-300"
          title="دستیار هوش تجاری و تحلیل داده (Gemini)"
          aria-label="دستیار هوش تجاری Gemini"
        >
          {/* Gemini Sparkle Icon with Pulse */}
          <div className="relative flex items-center justify-center">
            {/* Custom Gemini 4-point star SVG */}
            <svg
              className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 drop-shadow-sm"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#34D399] ring-2 ring-white animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#34D399] ring-2 ring-white" />
          </div>
        </button>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-20 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
          toastMessage.type === 'error'
            ? 'bg-[#FAECE8] text-[#8A2E1D] border-[#F2D1CA]'
            : 'bg-[#2D2C28] text-[#F5F5F0] border-[#44423C]'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-[#8A2E1D] shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-[#8BA888] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}

