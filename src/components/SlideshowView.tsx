import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  Calendar,
  FileCheck2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Presentation,
  Check,
  X,
  Layers,
  ArrowRight,
  Sliders,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Move,
  ArrowLeft,
  FileSpreadsheet,
  ExternalLink,
  Edit,
  FileCode,
  ChevronDown,
  ArrowUpDown,
  GripVertical,
  GripHorizontal,
  Workflow
} from 'lucide-react';
import { ProcessedEraItem } from '../types';
import {
  ProcessPresentationDetail,
  getProcessPresentation
} from '../data/presentationTemplates';
import { downloadPresentationHtml } from '../utils/htmlExport';
import { SlideReorderModal } from './SlideReorderModal';

interface SlideshowViewProps {
  items: ProcessedEraItem[];
  onToggleSlideItem?: (itemId: string, selected: boolean) => void;
  onOpenEdit?: (item: ProcessedEraItem) => void;
  onOpenBpmnDesigner?: (item: ProcessedEraItem) => void;
  onClose?: () => void;
  initialItemId?: string;
  isModal?: boolean;
  slideBeforeAfterUnderImage?: boolean;
  onToggleBeforeAfterPosition?: (val: boolean) => void;
  onReorderSlides?: (orders: { id: string; slideNumber: number }[]) => void;
}

export const SlideshowView: React.FC<SlideshowViewProps> = ({
  items = [],
  onToggleSlideItem,
  onOpenEdit,
  onOpenBpmnDesigner,
  onClose,
  initialItemId,
  isModal = false,
  slideBeforeAfterUnderImage = true,
  onToggleBeforeAfterPosition,
  onReorderSlides
}) => {
  // Sort helper to ensure slides respect custom slideNumber or slideOrder
  const sortSlides = useCallback((list: ProcessedEraItem[]) => {
    return [...list].sort((a, b) => {
      const numA = a.slideNumber ?? a.slideOrder ?? 999999;
      const numB = b.slideNumber ?? b.slideOrder ?? 999999;
      if (numA !== numB) return numA - numB;
      return 0;
    });
  }, []);

  // If initialItemId is passed or isModal is true, we allow displaying all items or the target item even if isSelectedForSlide is false
  const slideItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    
    // If specific initial item requested, ensure we can view it
    if (initialItemId) {
      const directTarget = items.find(it => it.id === initialItemId);
      if (directTarget) {
        // If items are only 1 item (single slide mode)
        if (items.length === 1) return [directTarget];
        // Otherwise return all items so user can browse starting at target
        return sortSlides(items);
      }
    }

    const selectedOnly = items.filter(it => Boolean(it.isSelectedForSlide));
    // If none are selected for slideshow but we have items, fallback to all items
    if (selectedOnly.length === 0 && isModal) {
      return sortSlides(items);
    }
    return sortSlides(selectedOnly);
  }, [items, initialItemId, isModal, sortSlides]);

  // Local reordered state for immediate UI feedback
  const [localSlideItems, setLocalSlideItems] = useState<ProcessedEraItem[]>([]);
  useEffect(() => {
    setLocalSlideItems(slideItems);
  }, [slideItems]);

  const displaySlideItems = localSlideItems.length > 0 ? localSlideItems : slideItems;

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialItemId && Array.isArray(items)) {
      const sorted = sortSlides(items);
      const idx = sorted.findIndex(it => it.id === initialItemId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [isBottomStripOpen, setIsBottomStripOpen] = useState<boolean>(false);
  const [stripDraggedIndex, setStripDraggedIndex] = useState<number | null>(null);
  const [stripDragOverIndex, setStripDragOverIndex] = useState<number | null>(null);

  // Central reorder handler
  const handleReorder = useCallback((orders: { id: string; slideNumber: number }[], reorderedItems: ProcessedEraItem[]) => {
    const activeItem = displaySlideItems[currentIndex];
    setLocalSlideItems(reorderedItems);

    if (activeItem) {
      const newIdx = reorderedItems.findIndex(it => it.id === activeItem.id);
      if (newIdx !== -1) {
        setCurrentIndex(newIdx);
      }
    }

    if (onReorderSlides) {
      onReorderSlides(orders);
    }
  }, [currentIndex, displaySlideItems, onReorderSlides]);

  // Horizontal thumbnail drag and drop reorder
  const handleStripDrop = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const nextList = [...displaySlideItems];
    const [moved] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, moved);

    const orders = nextList.map((it, idx) => ({ id: it.id, slideNumber: idx + 1 }));
    const updatedWithOrder = nextList.map((it, idx) => ({
      ...it,
      slideNumber: idx + 1,
      slideOrder: idx + 1
    }));

    handleReorder(orders, updatedWithOrder);
  };
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(isModal);
  const [slideSubView, setSlideSubView] = useState<'visual_showcase' | 'before_after' | 'problem_solution'>('visual_showcase');
  const [isUnderImageMode, setIsUnderImageMode] = useState<boolean>(() => {
    if (slideBeforeAfterUnderImage !== undefined) {
      return slideBeforeAfterUnderImage;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('era_visibility_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.slideBeforeAfterUnderImage !== undefined) {
            return Boolean(parsed.slideBeforeAfterUnderImage);
          }
        }
      } catch {}
    }
    return true; // Default is true (under images)
  });

  useEffect(() => {
    if (slideBeforeAfterUnderImage !== undefined) {
      setIsUnderImageMode(slideBeforeAfterUnderImage);
    }
  }, [slideBeforeAfterUnderImage]);

  const handleToggleUnderImageMode = (newVal: boolean) => {
    setIsUnderImageMode(newVal);
    if (onToggleBeforeAfterPosition) {
      onToggleBeforeAfterPosition(newVal);
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('era_visibility_settings');
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.slideBeforeAfterUnderImage = newVal;
        localStorage.setItem('era_visibility_settings', JSON.stringify(parsed));
      } catch {}
    }
  };

  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // Advanced Zoom & Pan state for Image Lightbox
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleOpenPreviewModal = (imgSrc: string, imgIdx?: number) => {
    setPreviewModalImg(imgSrc);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsPanning(false);
    if (imgIdx !== undefined) {
      setActiveImageIndex(imgIdx);
    }
  };

  const handleClosePreviewModal = () => {
    setPreviewModalImg(null);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(prev => Math.min(5, Number((prev + 0.3).toFixed(2))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(prev => {
      const next = Math.max(0.5, Number((prev - 0.3).toFixed(2)));
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handleSetZoomLevel = (level: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(level);
    if (level === 1) {
      setPanPosition({ x: 0, y: 0 });
      setIsPanning(false);
    }
  };

  const handleModalWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(5, Number((prev + 0.2).toFixed(2))));
    } else {
      setZoomScale(prev => {
        const next = Math.max(0.5, Number((prev - 0.2).toFixed(2)));
        if (next <= 1) setPanPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoomScale <= 1) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handlePanMouseUp = () => {
    setIsPanning(false);
  };

  // Sync index when initialItemId changes
  useEffect(() => {
    if (initialItemId && slideItems.length > 0) {
      const idx = slideItems.findIndex(it => it.id === initialItemId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialItemId, slideItems]);

  // When isModal prop is true, ensure fullscreen state is active and attempt browser native fullscreen
  useEffect(() => {
    if (isModal) {
      setIsFullscreen(true);
      // Attempt browser fullscreen automatically
      const timer = setTimeout(() => {
        const elem = document.getElementById('slideshow-container');
        if (elem && !document.fullscreenElement && elem.requestFullscreen) {
          elem.requestFullscreen().then(() => {
            setIsNativeFullscreen(true);
          }).catch(err => {
            console.log('Auto native fullscreen notice:', err?.message);
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModal]);

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

  // HTML Export Handler
  const handleExportHtml = (mode: 'selected' | 'all' = 'selected') => {
    setIsExportMenuOpen(false);
    if (items.length === 0) {
      alert('هیچ فرآیندی در سامانه یافت نشد.');
      return;
    }
    if (mode === 'selected' && slideItems.length === 0) {
      alert('هیچ اسلایدی فعال نیست. می‌توانید گزینه «همه اسلایدها» را انتخاب نمایید.');
      return;
    }
    try {
      downloadPresentationHtml(items, mode);
    } catch (err: any) {
      console.error('Failed to export HTML:', err);
      alert(err?.message || 'خطا در ایجاد فایل HTML ارائه');
    }
  };

  // Keep index within bounds
  useEffect(() => {
    if (displaySlideItems.length > 0 && currentIndex >= displaySlideItems.length) {
      setCurrentIndex(Math.max(0, displaySlideItems.length - 1));
    }
    setActiveImageIndex(0);
  }, [displaySlideItems.length, currentIndex]);

  const currentItem: ProcessedEraItem | null = displaySlideItems[currentIndex] || displaySlideItems[0] || null;

  // Safe Presentation Template lookup
  const presentation: ProcessPresentationDetail | null = useMemo(() => {
    if (!currentItem) return null;
    try {
      return getProcessPresentation(
        currentItem.processName || '',
        currentItem.orgUnit || '',
        currentItem.operationType || 'اصلاح',
        currentItem.description || ''
      );
    } catch (e) {
      console.error('Error computing presentation template:', e);
      return null;
    }
  }, [currentItem]);

  // Load photos of current item safely
  const currentImages = useMemo(() => {
    if (!currentItem) return [];
    let imgs: string[] = [];
    if (currentItem.formImages && Array.isArray(currentItem.formImages) && currentItem.formImages.length > 0) {
      imgs = currentItem.formImages.filter(Boolean);
    } else if (currentItem.formImageUrl) {
      imgs = [currentItem.formImageUrl];
    } else {
      try {
        if (typeof window !== 'undefined') {
          const cachedJson = localStorage.getItem(`era_form_imgs_${currentItem.id}`) || localStorage.getItem(`era_form_imgs_${currentItem.processName}`);
          if (cachedJson) {
            const parsed = JSON.parse(cachedJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              imgs = parsed.filter(Boolean);
            }
          } else {
            const singleCached = localStorage.getItem(`era_form_img_${currentItem.id}`) || localStorage.getItem(`era_form_img_${currentItem.processName}`);
            if (singleCached) imgs = [singleCached];
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    // Check template preset fallback
    if (imgs.length === 0 && presentation) {
      if (presentation.formImages && Array.isArray(presentation.formImages) && presentation.formImages.length > 0) {
        imgs = presentation.formImages;
      } else if (presentation.formImageUrl) {
        imgs = [presentation.formImageUrl];
      }
    }

    return imgs;
  }, [currentItem, presentation]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (displaySlideItems.length === 0) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : displaySlideItems.length - 1));
    setActiveImageIndex(0);
  }, [displaySlideItems.length]);

  const handleNext = useCallback(() => {
    if (displaySlideItems.length === 0) return;
    setCurrentIndex(prev => (prev < displaySlideItems.length - 1 ? prev + 1 : 0));
    setActiveImageIndex(0);
  }, [displaySlideItems.length]);

  // Fullscreen toggle (handles both browser native fullscreen and window modal)
  const toggleFullscreen = useCallback(() => {
    const elem = document.getElementById('slideshow-container');
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
          setIsNativeFullscreen(true);
          setIsFullscreen(true);
        }).catch(err => {
          console.warn(`Native fullscreen not available or blocked: ${err.message}`);
          setIsFullscreen(prev => !prev);
        });
      } else {
        setIsFullscreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsNativeFullscreen(false);
          if (!isModal) {
            setIsFullscreen(false);
          }
        }).catch(err => console.warn(err));
      } else {
        setIsNativeFullscreen(false);
        if (!isModal) {
          setIsFullscreen(false);
        }
      }
    }
  }, [isModal]);

  // Close handler that exits browser fullscreen as well
  const handleCloseModal = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Keyboard navigation listener (ArrowRight, ArrowLeft, Space to advance, F, Esc, Zoom keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewModalImg) {
        if (e.key === 'Escape') {
          handleClosePreviewModal();
        } else if (e.key === '+' || e.key === '=') {
          setZoomScale(prev => Math.min(5, Number((prev + 0.3).toFixed(2))));
        } else if (e.key === '-') {
          setZoomScale(prev => {
            const next = Math.max(0.5, Number((prev - 0.3).toFixed(2)));
            if (next <= 1) setPanPosition({ x: 0, y: 0 });
            return next;
          });
        } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
          setZoomScale(1);
          setPanPosition({ x: 0, y: 0 });
        } else if (e.key === 'ArrowLeft') {
          if (currentImages.length > 1) {
            setActiveImageIndex(prev => (prev < currentImages.length - 1 ? prev + 1 : 0));
          }
        } else if (e.key === 'ArrowRight') {
          if (currentImages.length > 1) {
            setActiveImageIndex(prev => (prev > 0 ? prev - 1 : currentImages.length - 1));
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleCloseModal, previewModalImg, toggleFullscreen, currentImages.length]);

  useEffect(() => {
    const onFsChange = () => {
      const isNative = Boolean(document.fullscreenElement);
      setIsNativeFullscreen(isNative);
      if (!isModal) {
        setIsFullscreen(isNative);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isModal]);

  // If no items are selected for slideshow
  if (!currentItem || displaySlideItems.length === 0) {
    return (
      <div className="bg-white text-[#2D2C28] rounded-3xl p-12 text-center border border-[#DDDBCF] space-y-5 max-w-2xl mx-auto shadow-sm my-10" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[#EFEFEA] border border-[#DDDBCF] flex items-center justify-center mx-auto text-[#545D4B]">
          <Presentation className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-[#2D2C28]">هیچ فرآیندی برای نمایش اسلاید انتخاب نشده است</h3>
          <p className="text-xs sm:text-sm text-[#75746E] max-w-md mx-auto leading-relaxed">
            برای ارائه در این بخش، لطفاً به تب «فرآیندهای ERA» بروید و کلید سوییچ اسلاید مربوط به فرآیندهای دلخواه را روشن کنید.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#545D4B] hover:bg-[#434A3C] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
          >
            مشاهده فرآیندهای ERA و انتخاب اسلایدها
          </button>
        )}
      </div>
    );
  }

  const isCreation = currentItem.operationType === 'جدید';
  const isAuto = currentItem.operationType === 'اتوماتیک‌سازی' || currentItem.operationType === 'اتوماتیک سازی';

  // Derived content safely
  const summary = presentation?.summarySentence || currentItem.description || currentItem.processName;
  
  // Custom user-defined achievements / benefits (prioritizes user input from edit modal)
  const customAchievementsRaw = currentItem.achievements
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_achievements_${currentItem.id}`) : null);

  let userBenefits: string[] = [];
  if (customAchievementsRaw) {
    if (Array.isArray(customAchievementsRaw)) {
      userBenefits = customAchievementsRaw
        .map(b => (typeof b === 'string' ? b.replace(/^[•\-\*✓\d\.]+\s*/, '').trim() : ''))
        .filter(b => b.length > 0);
    } else if (typeof customAchievementsRaw === 'string') {
      userBenefits = customAchievementsRaw
        .split('\n')
        .map(line => line.replace(/^[•\-\*✓\d\.]+\s*/, '').trim())
        .filter(line => line.length > 0);
    }
  }

  // Benefits / Outcomes list (Custom first, fallback to domain/AI templates)
  const defaultSampleBenefits = currentItem.processName.includes('ارز') || currentItem.processName.includes('حواله') || currentItem.orgUnit.includes('مالی')
    ? [
        'کاهش زمان تأیید و پرداخت حواله ارزی از ۳ روز کاری به کمتر از ۳ ساعت',
        'شفافیت ۱۰۰٪ تاریخچه تاییدات و پیوست اسناد سوئیفت و تراستی',
        'حذف کامل خطاهای محاسباتی در نرخ تسعیر و سرفصل‌های ارزی',
        'گزارش‌گیری لحظه‌ای برای مدیران از کل تعهدات و پرداختی‌های ارزی شرکت'
      ]
    : (isCreation
        ? (presentation?.afterImprovements && presentation.afterImprovements.length > 0
            ? presentation.afterImprovements
            : ['تسریع چشمگیر در انجام فرآیند و حذف کاغذبازی', 'ثبت دقیق لاگ زمانی و کاربر تاییدکننده', 'دسترسی برخط مدیران به سوابق و گزارش‌ها'])
        : (presentation?.solvedOutcomes && presentation.solvedOutcomes.length > 0
            ? presentation.solvedOutcomes
            : ['رفع کامل باگ‌ها و خطاهای سیستمی', 'تسهیل و روان‌سازی فرآیند برای پرسنل', 'انطباق فرآیند با استانداردهای جدید']));

  const benefitsList: string[] = userBenefits.length > 0 ? userBenefits : defaultSampleBenefits;

  // Visibility toggles (custom user flags with localStorage fallback)
  const showAchievements = currentItem.showAchievements !== undefined
    ? currentItem.showAchievements
    : (typeof window !== 'undefined'
        ? (localStorage.getItem(`era_show_ach_${currentItem.id}`) !== null
            ? localStorage.getItem(`era_show_ach_${currentItem.id}`) === 'true'
            : false)
        : false);

  const showImpactMetrics = currentItem.showImpactMetrics !== undefined
    ? currentItem.showImpactMetrics
    : (typeof window !== 'undefined'
        ? (localStorage.getItem(`era_show_imp_${currentItem.id}`) !== null
            ? localStorage.getItem(`era_show_imp_${currentItem.id}`) === 'true'
            : false)
        : false);

  // Before Description & Pain points (Prioritizes user's custom problemDescription from edit modal)
  const customProblem = currentItem.problemDescription?.trim() 
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_prob_desc_${currentItem.id}`) : null);
  const beforeText = customProblem
    || (isCreation
        ? (presentation?.beforeDescription || `قبل از ایجاد فرم، فرآیند «${currentItem.processName}» به صورت دستی و کاغذی انجام می‌شد که باعث تاخیر و اتلاف وقت می‌گردید.`)
        : (presentation?.identifiedProblems && presentation.identifiedProblems.length > 0
            ? presentation.identifiedProblems.join('\n')
            : currentItem.description || 'نیاز به اصلاح ساختار، دسترسی‌ها یا خطای عملکردی'));

  // After Description & Improvements (Prioritizes user's custom solutionDescription from edit modal)
  const customSolution = currentItem.solutionDescription?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_sol_desc_${currentItem.id}`) : null);
  const afterText = customSolution
    || (isCreation
        ? (presentation?.afterDescription || `با راه‌اندازی فرآیند مکانیزه در سامانه ERA، تمام مراحل ثبت و تایید بدون کاغذ و به صورت برخط انجام می‌شود. (${currentItem.description || ''})`)
        : (presentation?.solutionApplied || `تیم فناوری اطلاعات تغییرات لازم را در گردش‌کار اعمال و بهینه‌سازی نمود: ${currentItem.description || ''}`));

  // Quantitative Metrics (User custom editable first, then AI/standard fallback)
  const customTimeMetric = currentItem.impactTimeMetric?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_time_metric_${currentItem.id}`) : null);
  const customErrorMetric = currentItem.impactErrorMetric?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_error_metric_${currentItem.id}`) : null);

  const timeMetric = customTimeMetric
    || presentation?.quantifiableImpact?.timeReduction
    || (currentItem.processName.includes('ارز') || currentItem.processName.includes('حواله')
        ? 'کاهش بیش از ۸۰٪ زمان پردازش حواله‌ها'
        : '۷۰٪ کاهش زمان پردازش');

  const errorMetric = customErrorMetric
    || presentation?.quantifiableImpact?.errorReduction
    || (currentItem.processName.includes('ارز') || currentItem.processName.includes('حواله')
        ? 'صفر شدن خطاهای مغایرت حساب بانکی و تراستی'
        : 'حذف کامل خطاهای کاربری');

  const isViewFullscreen = isModal || isFullscreen || isNativeFullscreen;

  return (
    <div
      id="slideshow-container"
      className={`bg-white text-[#2D2C28] rounded-3xl border border-[#DDDBCF] shadow-lg flex flex-col transition-all overflow-hidden ${
        isViewFullscreen
          ? 'fixed inset-0 z-[99999] rounded-none h-screen w-screen border-none max-h-screen bg-[#FAFAF7]'
          : 'h-[calc(100vh-140px)] min-h-[620px] max-h-[880px]'
      }`}
      dir="rtl"
    >
      {/* Top Slide Header Bar */}
      <div className="bg-[#FAFAF7] px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#DDDBCF] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#545D4B] text-white shadow-xs shrink-0">
            <Presentation className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF]">
                اسلاید {currentIndex + 1} از {displaySlideItems.length}
              </span>
              <span className="text-[11px] text-[#75746E] font-mono">{currentItem.executionDate}</span>
              <span className="text-[11px] font-bold text-amber-800 px-2 py-0.5 bg-amber-50 rounded-md border border-amber-200">
                {currentItem.orgUnit}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                isAuto
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : isCreation
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#FDF6F0] text-[#7C3E1D] border-[#E8D5C4]'
              }`}>
                {isAuto ? 'اتوماتیک‌سازی هوشمند' : isCreation ? 'فرم و فرآیند جدید' : 'اصلاح فرآیندی'}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-[#2D2C28] mt-0.5 truncate">
              {currentItem.processName}
            </h2>
          </div>
        </div>

        {/* Center: Layout Setting & Slide Sub-Views Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Layout Setting Quick Toggle Button */}
          <button
            type="button"
            onClick={() => handleToggleUnderImageMode(!isUnderImageMode)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isUnderImageMode
                ? 'bg-[#EBF3E8] text-[#2D4523] border-[#C2DDB8] hover:bg-[#DFECD9]'
                : 'bg-white text-[#545D4B] border-[#DDDBCF] hover:bg-[#F0EDE6]'
            }`}
            title="تغییر نحوه نمایش: متن قبل و بعد زیر عکس‌ها یا در تب جداگانه"
          >
            <Sliders className="h-3.5 w-3.5 text-[#545D4B]" />
            <span className="hidden md:inline">نحوه نمایش:</span>
            <span>{isUnderImageMode ? 'متن زیر عکس (یکپارچه)' : 'متن در تب جدا'}</span>
          </button>

          {/* If separate tabs mode, show tab switcher */}
          {!isUnderImageMode && (
            <div className="flex items-center bg-[#EFEFEA] p-0.5 sm:p-1 rounded-xl border border-[#DDDBCF] text-xs shrink-0">
              <button
                onClick={() => setSlideSubView('visual_showcase')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                  slideSubView === 'visual_showcase'
                    ? 'bg-white text-[#2D2C28] shadow-xs border border-[#DDDBCF]'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>اسکرین‌شات‌ها</span>
              </button>

              <button
                onClick={() => setSlideSubView(isCreation ? 'before_after' : 'problem_solution')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                  slideSubView !== 'visual_showcase'
                    ? 'bg-white text-[#2D2C28] shadow-xs border border-[#DDDBCF]'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{isCreation ? 'مقایسه قبل و بعد' : 'تحلیل مشکل و راهکار'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: HTML Download, Edit, Fullscreen, Close & Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Download Standalone HTML Presentation */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              title="دانلود فایل HTML مستقل و خودکفای ارائه (انتخاب همه اسلایدها یا اسلایدهای فعال)"
            >
              <FileCode className="h-3.5 w-3.5 text-white/90" />
              <span className="hidden sm:inline">دانلود HTML</span>
              <ChevronDown className={`h-3 w-3 text-white/80 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#DDDBCF] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-1.5 border-b border-[#F4F3EE]">
                  <p className="text-xs font-bold text-[#2D2C28]">دامنه خروجی فایل HTML</p>
                </div>

                <div className="p-1 space-y-1">
                  <button
                    onClick={() => handleExportHtml('selected')}
                    disabled={slideItems.length === 0}
                    className="w-full flex items-start gap-2 p-2 rounded-xl hover:bg-[#F4F3EE] transition text-right cursor-pointer disabled:opacity-40 disabled:pointer-events-none group"
                  >
                    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 shrink-0 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2D2C28]">اسلایدهای فعال</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {slideItems.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#75746E] mt-0.5">فقط اسلایدهای انتخاب‌شده</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExportHtml('all')}
                    className="w-full flex items-start gap-2 p-2 rounded-xl hover:bg-[#F4F3EE] transition text-right cursor-pointer group"
                  >
                    <div className="p-1 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100 shrink-0 mt-0.5">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2D2C28]">همه اسلایدها</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {items.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#75746E] mt-0.5">تمام فرآیندهای سامانه</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reorder Slides Drag & Drop Button */}
          <button
            onClick={() => setIsReorderModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
            title="تغییر و مرتب‌سازی ترتیب اسلایدها با درگ و دراپ (Drag & Drop)"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#545D4B]" />
            <span className="hidden sm:inline">ترتیب اسلایدها</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF]">
              {displaySlideItems.length}
            </span>
          </button>

          {/* Quick Edit Current Slide Button */}
          {onOpenEdit && currentItem && (
            <button
              onClick={() => onOpenEdit(currentItem)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition cursor-pointer shadow-xs"
              title="ویرایش اطلاعات، تصاویر و متون مشکل و راهکار این فرآیند"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#545D4B]" />
              <span className="hidden sm:inline">ویرایش اسلاید</span>
            </button>
          )}

          {/* BPMN Workflow Button */}
          {onOpenBpmnDesigner && currentItem && (
            <button
              onClick={() => onOpenBpmnDesigner(currentItem)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                currentItem.bpmnXml || currentItem.hasBpmn
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-[#EFEFEA] text-[#545D4B] border-[#DDDBCF]'
              }`}
              title={
                currentItem.bpmnXml || currentItem.hasBpmn
                  ? 'مشاهده و ویرایش دیاگرام BPMN این فرآیند در bpmn.js'
                  : 'طراحی دیاگرام BPMN برای این فرآیند'
              }
            >
              <Workflow className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden md:inline">
                {currentItem.bpmnXml || currentItem.hasBpmn ? 'دیاگرام BPMN' : '+ طراح BPMN'}
              </span>
              {(currentItem.bpmnXml || currentItem.hasBpmn) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF] transition cursor-pointer shadow-xs"
            title={isNativeFullscreen ? "خروج از تمام‌صفحه مرورگر (کلید F)" : "حالت تمام‌صفحه پرزنتیشن (کلید F)"}
          >
            {isNativeFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          {/* Back to ERA tab / Close modal */}
          {onClose && (
            <button
              onClick={handleCloseModal}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                isModal
                  ? 'bg-[#EAEAE5] hover:bg-[#DDDBCF] text-[#2D2C28] border-[#DDDBCF]'
                  : 'bg-white hover:bg-[#EFEFEA] text-[#4B5344] border-[#DDDBCF]'
              }`}
              title={isModal ? "بستن اسلاید و بازگشت به جدول فرآیندها" : "بازگشت به جدول فرآیندها"}
            >
              <X className="h-3.5 w-3.5 text-[#2D2C28]" />
              <span className="hidden sm:inline">{isModal ? 'بستن اسلاید' : 'خروج'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Slide Content Stage - Perfect Viewport Flex Fit */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 lg:p-5 flex flex-col justify-between overflow-hidden gap-3 bg-[#FAF9F5]">

        {/* Dynamic Slide Body based on Active Sub-View */}
        {slideSubView === 'visual_showcase' ? (
          /* SUB-VIEW 1: Visual Showcase & Gallery */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
            {/* Screenshot Hero Frame (8 cols or 12 cols if side cards are hidden) */}
            <div className={`${(!showAchievements && !showImpactMetrics) ? 'lg:col-span-12' : 'lg:col-span-8'} bg-white rounded-2xl border border-[#DDDBCF] p-2.5 sm:p-3 flex flex-col h-full min-h-0 justify-between relative shadow-xs overflow-hidden gap-1.5`}>
              <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-1.5 mb-0.5 text-xs text-[#75746E] shrink-0">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-[#545D4B]" />
                  {currentImages.length > 1 && (
                    <span className="font-bold text-[#545D4B] text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded-md border border-[#E8E6DF]">
                      {activeImageIndex + 1} / {currentImages.length}
                    </span>
                  )}
                  {isUnderImageMode && (
                    <span className="hidden sm:inline-flex items-center text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                      مستندات تصویری و مقایسه قبل و بعد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(!showAchievements || !showImpactMetrics) && onOpenEdit && (
                    <button
                      onClick={() => onOpenEdit(currentItem)}
                      className="text-[10px] text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition font-medium"
                      title="تنظیم دستاوردها و شاخص‌ها"
                    >
                      <Edit className="h-2.5 w-2.5" />
                      <span>تنظیمات اسلاید</span>
                    </button>
                  )}
                  {currentImages.length > 0 && (
                    <span className="text-[10px] text-[#75746E] font-medium hidden sm:inline">
                      برای نمایش بزرگ روی تصویر کلیک کنید
                    </span>
                  )}
                </div>
              </div>

              {/* Main Image Stage */}
              {currentImages.length > 0 ? (
                <div className={`${isUnderImageMode ? 'flex-1 min-h-0' : 'flex-1 min-h-0'} flex flex-col items-center justify-center overflow-hidden`}>
                  {/* Dynamic Flexible Frame that adjusts strictly within available height */}
                  <div 
                    className="relative group w-full flex-1 min-h-0 rounded-xl border border-[#DDDBCF] bg-[#FAFAF7] flex items-center justify-center p-1.5 overflow-hidden shadow-inner cursor-zoom-in"
                    onClick={() => handleOpenPreviewModal(currentImages[activeImageIndex] || currentImages[0], activeImageIndex)}
                  >
                    <img
                      src={currentImages[activeImageIndex] || currentImages[0]}
                      alt={`${currentItem.processName} Screenshot`}
                      className="max-h-full max-w-full w-auto h-auto object-contain rounded shadow-sm select-none transition-transform duration-200 group-hover:scale-[1.01]"
                    />

                    {/* Left/Right navigation arrows on the image if multiple images */}
                    {currentImages.length > 1 && (
                      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(p => (p > 0 ? p - 1 : currentImages.length - 1));
                          }}
                          className="p-1.5 rounded-full bg-white/90 text-[#2D2C28] hover:bg-[#545D4B] hover:text-white pointer-events-auto transition cursor-pointer shadow-md border border-[#DDDBCF]"
                          title="تصویر قبلی"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(p => (p < currentImages.length - 1 ? p + 1 : 0));
                          }}
                          className="p-1.5 rounded-full bg-white/90 text-[#2D2C28] hover:bg-[#545D4B] hover:text-white pointer-events-auto transition cursor-pointer shadow-md border border-[#DDDBCF]"
                          title="تصویر بعدی"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Overlay Zoom Action Badge */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreviewModal(currentImages[activeImageIndex] || currentImages[0], activeImageIndex);
                      }}
                      className="absolute bottom-2 left-2 bg-[#2D2C28]/90 hover:bg-[#2D2C28] text-white px-3 py-1.5 rounded-xl border border-white/20 shadow-md opacity-90 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer z-10"
                      title="بزرگ‌نمایی و قابلیت زوم روی جزئیات تصویر"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-emerald-400" />
                      <span>بزرگ‌نمایی</span>
                    </button>
                  </div>

                  {/* Thumbnail Row if Multiple Images */}
                  {currentImages.length > 1 && (
                    <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-[#E8E6DF] overflow-x-auto w-full justify-center shrink-0">
                      {currentImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative rounded-lg overflow-hidden border transition-all p-0.5 cursor-pointer shrink-0 ${
                            activeImageIndex === idx ? 'border-[#545D4B] ring-2 ring-[#545D4B]/30 scale-105' : 'border-[#DDDBCF] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${idx + 1}`} className="h-7 w-11 sm:h-8 sm:w-12 object-cover rounded" />
                          <span className="absolute bottom-0.5 right-0.5 bg-[#2D2C28]/80 text-white text-[8px] px-1 rounded font-mono">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#8A8880] space-y-2">
                  <ImageIcon className="h-12 w-12 stroke-1 text-[#DDDBCF]" />
                  <p className="text-xs font-bold text-[#4B5344]">تصویر فرم هنوز بارگذاری نشده است</p>
                  <p className="text-[11px] text-[#75746E] max-w-sm">
                    می‌توانید در جدول فرآیندها دکمه ویرایش را زده و چندین اسکرین‌شات از فرم‌های سامانه پیوست کنید.
                  </p>
                </div>
              )}

              {/* Dynamic Before & After (Problem / Solution) Cards placed under the image (When isUnderImageMode is enabled) */}
              {isUnderImageMode && (
                <div className="h-[28%] sm:h-[26%] min-h-[90px] grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 shrink-0 overflow-hidden pt-1.5 border-t border-[#E8E6DF]">
                  {/* Before (قبل از اقدام / مشکل) */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#FFF8F7] border border-[#F5C2C7] space-y-0.5 overflow-hidden flex flex-col shadow-xs">
                    <div className="flex items-center justify-between text-rose-800 font-black text-[11px] sm:text-xs border-b border-rose-200 pb-0.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600 shrink-0" />
                        <span>{isCreation ? 'وضعیت قبل از اقدام:' : 'مشکل و چالش شناسایی‌شده:'}</span>
                      </div>
                      {onOpenEdit && (
                        <button
                          type="button"
                          onClick={() => onOpenEdit(currentItem)}
                          className="text-[10px] text-rose-700 hover:text-rose-900 flex items-center gap-0.5 cursor-pointer"
                          title="ویرایش متن قبل از اقدام"
                        >
                          <Edit className="h-2.5 w-2.5" />
                          <span>ویرایش</span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar">
                      {beforeText ? (
                        <p className="text-[11px] sm:text-xs text-[#4A4944] leading-relaxed whitespace-pre-wrap font-medium">
                          {beforeText}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#A8A69E] italic py-0.5">
                          موردی برای قبل از اقدام ثبت نشده است.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* After (بعد از اقدام / راهکار) */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-0.5 overflow-hidden flex flex-col shadow-xs">
                    <div className="flex items-center justify-between text-emerald-800 font-black text-[11px] sm:text-xs border-b border-emerald-200 pb-0.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 shrink-0" />
                        <span>{isCreation ? 'وضعیت بعد از اقدام:' : 'راهکار پیاده‌سازی‌شده:'}</span>
                      </div>
                      {onOpenEdit && (
                        <button
                          type="button"
                          onClick={() => onOpenEdit(currentItem)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                          title="ویرایش متن بعد از اقدام"
                        >
                          <Edit className="h-2.5 w-2.5" />
                          <span>ویرایش</span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar">
                      {afterText ? (
                        <p className="text-[11px] sm:text-xs text-[#4A4944] leading-relaxed whitespace-pre-wrap font-medium">
                          {afterText}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#A8A69E] italic py-0.5">
                          موردی برای بعد از اقدام ثبت نشده است.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Strategic KPI & Results Column (4 cols - conditionally shown if either box is active) */}
            {(showAchievements || showImpactMetrics) && (
              <div className="lg:col-span-4 flex flex-col h-full min-h-0 justify-between gap-3 overflow-hidden">
                {/* Operational Achievements Box */}
                {showAchievements && (
                  <div className={`bg-white rounded-2xl p-3.5 sm:p-4 border border-[#DDDBCF] flex flex-col overflow-hidden shadow-xs ${showImpactMetrics ? 'flex-1 min-h-0' : 'h-full min-h-0'}`}>
                    <div className="flex items-center justify-between text-emerald-800 text-xs font-black border-b border-emerald-100 pb-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>دستاوردها و نتایج عملیاتی:</span>
                      </div>
                      {onOpenEdit && currentItem && (
                        <button
                          onClick={() => onOpenEdit(currentItem)}
                          className="text-[10px] text-[#75746E] hover:text-emerald-700 transition flex items-center gap-1 cursor-pointer bg-[#EFEFEA] hover:bg-[#E2E0D8] px-2 py-0.5 rounded-lg border border-[#DDDBCF]"
                          title="ویرایش یا غیرفعال‌سازی این بخش"
                        >
                          <Edit className="h-2.5 w-2.5" />
                          <span>ویرایش</span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-0.5">
                      {benefitsList.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-[#2D2C28]">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[9px] font-bold">
                            ✓
                          </div>
                          <span className="leading-relaxed font-medium">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantitative Impact Metrics Badge */}
                {showImpactMetrics && (
                  <div className={`bg-white rounded-2xl p-3 sm:p-3.5 border border-[#DDDBCF] space-y-2 shrink-0 shadow-xs ${!showAchievements ? 'flex-1 min-h-0 flex flex-col justify-center' : ''}`}>
                    <div className="flex items-center justify-between text-[#4B5344] text-xs font-black border-b border-[#E8E6DF] pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#545D4B]" />
                        <span>شاخص‌های اثرگذاری:</span>
                      </div>
                      {onOpenEdit && currentItem && (
                        <button
                          onClick={() => onOpenEdit(currentItem)}
                          className="text-[10px] text-[#75746E] hover:text-[#2D2C28] transition flex items-center gap-1 cursor-pointer bg-[#EFEFEA] hover:bg-[#E2E0D8] px-2 py-0.5 rounded-lg border border-[#DDDBCF]"
                          title="ویرایش یا غیرفعال‌سازی این بخش"
                        >
                          <Edit className="h-2.5 w-2.5" />
                          <span>ویرایش</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="bg-[#FAFAF7] p-2.5 rounded-xl border border-[#DDDBCF] text-center flex flex-col justify-center shadow-xs">
                        <span className="text-[#75746E] text-[10px] font-semibold block mb-1">صرفه‌جویی زمان</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 leading-tight">
                          {timeMetric}
                        </span>
                      </div>
                      <div className="bg-[#FAFAF7] p-2.5 rounded-xl border border-[#DDDBCF] text-center flex flex-col justify-center shadow-xs">
                        <span className="text-[#75746E] text-[10px] font-semibold block mb-1">کاهش خطای انسانی</span>
                        <span className="text-xs sm:text-sm font-black text-blue-700 leading-tight">
                          {errorMetric}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* SUB-VIEW 2: Before / After or Problem / Solution Comparison Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
            {/* Column 1: Before / Problem State */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 sm:p-4 flex flex-col h-full min-h-0 justify-between gap-2.5 shadow-xs overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between border-b border-rose-200 pb-2 shrink-0">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-xs sm:text-sm">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>{isCreation ? 'وضعیت قبل' : 'مشکل و چالش شناسایی‌شده'}</span>
                  </div>
                  {onOpenEdit && (
                    <button
                      onClick={() => onOpenEdit(currentItem)}
                      className="text-[10px] text-rose-800 hover:text-rose-900 bg-white hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition font-medium shadow-2xs"
                      title="ویرایش متن مشکل و چالش"
                    >
                      <span>ویرایش متن</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
                  <p className="text-xs sm:text-sm text-rose-950 leading-relaxed font-medium whitespace-pre-line">
                    {beforeText}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: After / Solution State */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 flex flex-col h-full min-h-0 justify-between gap-2.5 shadow-xs overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2 shrink-0">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-xs sm:text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{isCreation ? 'وضعیت بعد' : 'راهکار پیاده‌سازی‌شده در سامانه'}</span>
                  </div>
                  {onOpenEdit && (
                    <button
                      onClick={() => onOpenEdit(currentItem)}
                      className="text-[10px] text-emerald-800 hover:text-emerald-900 bg-white hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition font-medium shadow-2xs"
                      title="ویرایش متن راهکار و دستاورد"
                    >
                      <span>ویرایش متن</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
                  <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium whitespace-pre-line">
                    {afterText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Drag & Drop Filmstrip */}
        {isBottomStripOpen && (
          <div className="bg-white/95 rounded-2xl p-2.5 border border-[#DDDBCF] shadow-md flex flex-col gap-1.5 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between px-1 text-[11px] text-[#75746E]">
              <div className="flex items-center gap-1.5 font-bold text-[#2D2C28]">
                <GripHorizontal className="h-3.5 w-3.5 text-[#545D4B]" />
                <span>نوار چیدمان سریع (اسلایدها را با ماوس بگیرید و به چپ یا راست بکشید):</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReorderModalOpen(true)}
                  className="text-[10px] text-[#545D4B] hover:text-[#2D2C28] font-bold underline cursor-pointer"
                >
                  نمای پیشرفته چیدمان
                </button>
                <button
                  onClick={() => setIsBottomStripOpen(false)}
                  className="p-1 rounded-md text-[#75746E] hover:text-[#2D2C28] cursor-pointer"
                  title="بستن نوار"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-thin">
              {displaySlideItems.map((item, idx) => {
                const isCur = currentIndex === idx;
                const isBeingDragged = stripDraggedIndex === idx;
                const isDropTarget = stripDragOverIndex === idx && stripDraggedIndex !== idx;
                const img = item.formImages?.[0] || item.formImageUrl;

                return (
                  <div
                    key={`strip-thumb-${item.id || idx}`}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      e.dataTransfer.effectAllowed = 'move';
                      setStripDraggedIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (stripDragOverIndex !== idx) setStripDragOverIndex(idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (stripDraggedIndex !== null && stripDraggedIndex !== idx) {
                        handleStripDrop(stripDraggedIndex, idx);
                      }
                      setStripDraggedIndex(null);
                      setStripDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setStripDraggedIndex(null);
                      setStripDragOverIndex(null);
                    }}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative group shrink-0 w-28 sm:w-32 rounded-xl border p-1.5 flex flex-col gap-1 transition-all cursor-grab active:cursor-grabbing select-none ${
                      isBeingDragged
                        ? 'opacity-30 scale-90 border-dashed border-[#545D4B] bg-[#EFEFEA]'
                        : isDropTarget
                        ? 'border-[#545D4B] ring-2 ring-[#545D4B] bg-emerald-50 scale-105 shadow-md'
                        : isCur
                        ? 'bg-white border-[#545D4B] ring-2 ring-[#545D4B]/40 shadow-sm'
                        : 'bg-[#FAFAF7] hover:bg-white border-[#DDDBCF] hover:border-[#8A8880]'
                    }`}
                  >
                    {/* Thumbnail Frame */}
                    <div className="w-full h-14 rounded-lg bg-[#F4F3EE] border border-[#E8E6DF] flex items-center justify-center overflow-hidden relative">
                      {img ? (
                        <img src={img} alt={item.processName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-[#8A8880]" />
                      )}
                      <span className="absolute top-1 right-1 bg-black/70 text-white text-[9px] font-mono font-bold px-1 rounded">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Title & Unit */}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#2D2C28] truncate leading-tight">
                        {item.processName}
                      </p>
                      <p className="text-[9px] text-[#75746E] truncate mt-0.5">
                        {item.orgUnit}
                      </p>
                    </div>

                    {/* Step buttons on hover */}
                    <div className="absolute inset-x-1 bottom-1 hidden group-hover:flex items-center justify-between pointer-events-auto bg-black/70 rounded px-1 py-0.5 text-white">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx > 0) handleStripDrop(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        className="disabled:opacity-20 hover:text-emerald-300"
                        title="یک پله به جلو"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <span className="text-[8px] font-bold">{idx + 1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (idx < displaySlideItems.length - 1) handleStripDrop(idx, idx + 1);
                        }}
                        disabled={idx === displaySlideItems.length - 1}
                        className="disabled:opacity-20 hover:text-emerald-300"
                        title="یک پله به عقب"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Slide Footer Navigation Strip */}
        <div className="bg-[#FAFAF7] rounded-2xl p-2.5 sm:p-3 border border-[#DDDBCF] flex items-center justify-between gap-2 shrink-0">
          {/* Previous Slide Button */}
          <button
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="hidden sm:inline">اسلاید قبلی</span>
          </button>

          {/* Slide Selector Indicators Dots & Reorder Strip Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBottomStripOpen(!isBottomStripOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-xs ${
                isBottomStripOpen
                  ? 'bg-[#545D4B] text-white border-[#434A3C]'
                  : 'bg-white hover:bg-[#EFEFEA] text-[#545D4B] border-[#DDDBCF]'
              }`}
              title="نمایش نوار بندانگشتی اسلایدها برای جابجایی مستقیم با درگ و دراپ"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">نوار اسلایدها ({displaySlideItems.length})</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[35vw] sm:max-w-[45vw] py-1 px-1">
              {displaySlideItems.map((item, idx) => (
                <button
                  key={`slide-dot-${item.id || idx}-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all rounded-full cursor-pointer shrink-0 ${
                    currentIndex === idx
                      ? 'w-7 h-2 bg-[#545D4B] shadow-xs'
                      : 'w-2 h-2 bg-[#DDDBCF] hover:bg-[#8A8880]'
                  }`}
                  title={`${idx + 1}. ${item.processName}`}
                />
              ))}
            </div>
          </div>

          {/* Next Slide Button */}
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="hidden sm:inline">اسلاید بعدی</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Advanced Lightbox & Interactive Zoom Viewer Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-150"
          onClick={handleClosePreviewModal}
        >
          {/* Top Modal Header & Controls Toolbar */}
          <div
            className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 text-white shrink-0 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-white/15 backdrop-blur-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Title & Image Counter */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-white truncate">
                {currentItem.processName}
              </span>
              {currentImages.length > 1 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/30 shrink-0">
                  {activeImageIndex + 1} از {currentImages.length}
                </span>
              )}
            </div>

            {/* Interactive Zoom Tools Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.5}
                className="p-1.5 sm:p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-white/20"
                title="کوچک‌نمایی (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              {/* Zoom Percentage Indicator */}
              <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400 min-w-[54px] text-center bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                {Math.round(zoomScale * 100)}%
              </span>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 5}
                className="p-1.5 sm:p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer border border-white/20"
                title="بزرگ‌نمایی (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              {/* Quick Zoom Presets */}
              <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
                {[1, 1.5, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={(e) => handleSetZoomLevel(lvl, e)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      zoomScale === lvl
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-white/80 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {lvl * 100}%
                  </button>
                ))}
              </div>

              {/* Reset Zoom to Fit */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer border border-white/20 shadow-xs"
                title="بازنشانی به سایز اصلی تصویر (کلید 0 یا R)"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                <span>سایز اصلی</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClosePreviewModal}
                className="p-1.5 sm:p-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white transition cursor-pointer shadow-md border border-rose-400"
                title="بستن (Esc)"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Centered Image Viewing Stage with Drag & Wheel Pan */}
          <div
            className={`relative flex-1 w-full max-w-[96vw] flex items-center justify-center overflow-hidden my-2 sm:my-3 rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xs px-2 sm:px-6 ${
              zoomScale > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
            onClick={e => {
              e.stopPropagation();
              if (zoomScale === 1) {
                setZoomScale(1.8);
              }
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              if (zoomScale > 1) {
                handleResetZoom();
              } else {
                setZoomScale(2);
              }
            }}
            onWheel={handleModalWheel}
            onMouseDown={handlePanMouseDown}
            onMouseMove={handlePanMouseMove}
            onMouseUp={handlePanMouseUp}
            onMouseLeave={handlePanMouseUp}
          >
            <div
              className="transition-transform duration-100 ease-out flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                transformOrigin: 'center center'
              }}
            >
              <img
                src={previewModalImg || (currentImages && currentImages[activeImageIndex]) || ''}
                alt="Full Preview"
                draggable={false}
                className="max-h-[76vh] sm:max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl pointer-events-none select-none"
              />
            </div>

            {/* Left & Right Switcher Buttons inside modal when multiple images exist */}
            {currentImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = activeImageIndex > 0 ? activeImageIndex - 1 : currentImages.length - 1;
                    setActiveImageIndex(nextIdx);
                    setPreviewModalImg(currentImages[nextIdx] || null);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                    setIsPanning(false);
                  }}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/20 transition cursor-pointer shadow-xl backdrop-blur-md z-20"
                  title="تصویر قبلی (کلید جهت‌نما راست)"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIdx = activeImageIndex < currentImages.length - 1 ? activeImageIndex + 1 : 0;
                    setActiveImageIndex(nextIdx);
                    setPreviewModalImg(currentImages[nextIdx] || null);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                    setIsPanning(false);
                  }}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/20 transition cursor-pointer shadow-xl backdrop-blur-md z-20"
                  title="تصویر بعدی (کلید جهت‌نما چپ)"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </>
            )}

            {/* Floating Zoom & Pan Helper Tip */}
            <div className="absolute bottom-3 right-1/2 translate-x-1/2 bg-slate-900/80 text-white/90 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-medium backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-2">
              <Move className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {zoomScale > 1
                  ? 'برای جابجایی تصویر را با ماوس بکشید | کلید 0 یا دکمه «سایز اصلی» برای بازگشت'
                  : 'با اسکرول ماوس یا دکمه‌ها زوم کنید | کلیک: زوم | کلید Esc: بستن'}
              </span>
            </div>
          </div>

          {/* Bottom Thumbnails Strip (if slide has multiple images) */}
          {currentImages.length > 1 && (
            <div
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-white/15 backdrop-blur-md shrink-0 max-w-full overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {currentImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setPreviewModalImg(img);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className={`h-12 w-16 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    activeImageIndex === idx
                      ? 'border-emerald-500 ring-2 ring-emerald-400/50 scale-105'
                      : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                  title={`تصویر ${idx + 1}`}
                >
                  <img src={img} alt={`تصویر ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drag and Drop Slide Reordering Modal */}
      <SlideReorderModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        items={items}
        currentIndex={currentIndex}
        onSelectSlide={(idx) => {
          setCurrentIndex(idx);
        }}
        onReorder={handleReorder}
        onToggleSlideItem={onToggleSlideItem}
      />
    </div>
  );
};
