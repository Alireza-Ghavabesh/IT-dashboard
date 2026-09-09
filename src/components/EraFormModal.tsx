import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  PlusCircle, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Edit, 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  Plus, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Clock,
  Gauge,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Star,
  ListOrdered,
  GripVertical,
  Workflow
} from 'lucide-react';
import { ProcessedEraItem, RawEraItem } from '../types';
import { JalaliDateInput } from './JalaliDateInput';

interface EraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ProcessedEraItem>) => void;
  initialItem?: ProcessedEraItem | null;
  existingUnits?: string[];
  existingProcesses?: string[];
  onOpenBpmnDesigner?: (item: ProcessedEraItem) => void;
}

export const EraFormModal: React.FC<EraFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  existingUnits = [],
  existingProcesses = [],
  onOpenBpmnDesigner
}) => {
  const [processName, setProcessName] = useState('');
  const [orgUnit, setOrgUnit] = useState('');
  const [executionDate, setExecutionDate] = useState('1405/04/15');
  const [operationType, setOperationType] = useState<'جدید' | 'اصلاح' | 'اتوماتیک‌سازی'>('اصلاح');
  const [entityType, setEntityType] = useState<'فرم' | 'فرآیند' | 'گزارش'>('فرآیند');
  const [status, setStatus] = useState<'برای انجام' | 'درحال انجام' | 'انجام شده'>('برای انجام');
  const [description, setDescription] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [solutionDescription, setSolutionDescription] = useState('');
  const [achievements, setAchievements] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);
  const [impactTimeMetric, setImpactTimeMetric] = useState('');
  const [impactErrorMetric, setImpactErrorMetric] = useState('');
  const [showImpactMetrics, setShowImpactMetrics] = useState(false);
  const [slideNumber, setSlideNumber] = useState<number | ''>('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialItem) {
      setProcessName(initialItem.processName);
      setOrgUnit(initialItem.orgUnit);
      setExecutionDate(initialItem.executionDate);
      
      const op = (initialItem.operationType || '').trim();
      if (op.includes('اتوماتیک') || op.includes('اوتوماتیک') || op.includes('اتوماسیون')) {
        setOperationType('اتوماتیک‌سازی');
      } else if (op.includes('جدید')) {
        setOperationType('جدید');
      } else {
        setOperationType('اصلاح');
      }

      const ent = (initialItem.entityType || (initialItem as any)["نوع موجودیت"] || '').trim();
      if (ent.includes('گزارش') || ent.includes('کاوشگر')) {
        setEntityType('گزارش');
      } else if (ent.includes('فرم')) {
        setEntityType('فرم');
      } else {
        setEntityType('فرآیند');
      }

      const st = (initialItem.status || (initialItem as any)["وضعیت"] || '').trim();
      if (st.includes('برای انجام') || st.toLowerCase().includes('todo')) {
        setStatus('برای انجام');
      } else if (st.includes('درحال انجام') || st.includes('در حال انجام') || st.toLowerCase().includes('in-progress')) {
        setStatus('درحال انجام');
      } else if (st.includes('انجام شده') || st.toLowerCase().includes('done')) {
        setStatus('انجام شده');
      } else {
        const cachedSt = typeof window !== 'undefined' ? localStorage.getItem(`era_status_${initialItem.id}`) : null;
        if (cachedSt === 'برای انجام' || cachedSt === 'درحال انجام' || cachedSt === 'انجام شده') {
          setStatus(cachedSt);
        } else {
          setStatus('انجام شده');
        }
      }

      setDescription(initialItem.description);
      
      const savedProblem = initialItem.problemDescription 
        || (typeof window !== 'undefined' ? localStorage.getItem(`era_prob_desc_${initialItem.id}`) : '')
        || '';
      const savedSolution = initialItem.solutionDescription 
        || (typeof window !== 'undefined' ? localStorage.getItem(`era_sol_desc_${initialItem.id}`) : '')
        || '';
      
      let savedAchievements = '';
      if (initialItem.achievements) {
        if (Array.isArray(initialItem.achievements)) {
          savedAchievements = initialItem.achievements.join('\n');
        } else if (typeof initialItem.achievements === 'string') {
          savedAchievements = initialItem.achievements;
        }
      } else if (typeof window !== 'undefined') {
        savedAchievements = localStorage.getItem(`era_achievements_${initialItem.id}`) || '';
      }
      
      let savedShowAch = false;
      if (initialItem.showAchievements !== undefined) {
        savedShowAch = initialItem.showAchievements;
      } else if (typeof window !== 'undefined') {
        const cachedShow = localStorage.getItem(`era_show_ach_${initialItem.id}`);
        if (cachedShow !== null) savedShowAch = cachedShow === 'true';
      }

      let savedTimeMetric = initialItem.impactTimeMetric || '';
      let savedErrorMetric = initialItem.impactErrorMetric || '';
      let savedShowImp = false;

      if (typeof window !== 'undefined') {
        if (!savedTimeMetric) savedTimeMetric = localStorage.getItem(`era_time_metric_${initialItem.id}`) || '';
        if (!savedErrorMetric) savedErrorMetric = localStorage.getItem(`era_error_metric_${initialItem.id}`) || '';
        const cachedShowImp = localStorage.getItem(`era_show_imp_${initialItem.id}`);
        if (cachedShowImp !== null) savedShowImp = cachedShowImp === 'true';
      }
      if (initialItem.showImpactMetrics !== undefined) {
        savedShowImp = initialItem.showImpactMetrics;
      }

      let savedSlideNum: number | '' = '';
      if (initialItem.slideNumber !== undefined && initialItem.slideNumber !== null) {
        savedSlideNum = initialItem.slideNumber;
      } else if (typeof window !== 'undefined') {
        const cachedSlideNum = localStorage.getItem(`era_slide_num_${initialItem.id}`);
        if (cachedSlideNum !== null && cachedSlideNum !== '') {
          const num = Number(cachedSlideNum);
          if (!isNaN(num) && num > 0) savedSlideNum = num;
        }
      }

      setProblemDescription(savedProblem);
      setSolutionDescription(savedSolution);
      setAchievements(savedAchievements);
      setShowAchievements(savedShowAch);
      setImpactTimeMetric(savedTimeMetric);
      setImpactErrorMetric(savedErrorMetric);
      setShowImpactMetrics(savedShowImp);
      setSlideNumber(savedSlideNum);
      
      let loadedImages: string[] = [];
      if (initialItem.formImages && Array.isArray(initialItem.formImages) && initialItem.formImages.length > 0) {
        loadedImages = initialItem.formImages;
      } else if (initialItem.formImageUrl) {
        loadedImages = [initialItem.formImageUrl];
      } else {
        try {
          const cachedJson = localStorage.getItem(`era_form_imgs_${initialItem.id}`) || localStorage.getItem(`era_form_imgs_${initialItem.processName}`);
          if (cachedJson) {
            loadedImages = JSON.parse(cachedJson);
          } else {
            const singleCached = localStorage.getItem(`era_form_img_${initialItem.id}`) || localStorage.getItem(`era_form_img_${initialItem.processName}`);
            if (singleCached) loadedImages = [singleCached];
          }
        } catch (e) {
          console.warn(e);
        }
      }
      setFormImages(loadedImages);
    } else {
      setProcessName('');
      setOrgUnit(existingUnits[0] || 'فروش');
      setExecutionDate('1405/04/15');
      setOperationType('اصلاح');
      setEntityType('فرآیند');
      setStatus('برای انجام');
      setDescription('');
      setProblemDescription('');
      setSolutionDescription('');
      setAchievements('');
      setShowAchievements(true);
      setImpactTimeMetric('');
      setImpactErrorMetric('');
      setShowImpactMetrics(true);
      setSlideNumber('');
      setFormImages([]);
    }
    setError(null);
  }, [initialItem, isOpen, existingUnits]);

  if (!isOpen) return null;

  const handleImageFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('لطفاً فایل تصویری معتبر (PNG, JPG, WEBP) انتخاب کنید.');
      return;
    }

    Array.from(validFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setFormImages(prev => [...prev, result]);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= formImages.length || fromIdx === toIdx) return;
    setFormImages(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    handleMoveImage(index, 0);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImgIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverImgIdx !== index) {
      setDragOverImgIdx(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  const handleImageDropReorder = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedImgIdx !== null && draggedImgIdx !== dropIndex) {
      handleMoveImage(draggedImgIdx, dropIndex);
    }
    setDraggedImgIdx(null);
    setDragOverImgIdx(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processName.trim()) {
      setError('لطفاً نام فرایند را وارد کنید.');
      return;
    }
    if (!orgUnit.trim()) {
      setError('لطفاً واحد سازمانی را مشخص کنید.');
      return;
    }
    if (!executionDate.trim()) {
      setError('لطفاً تاریخ انجام را وارد کنید.');
      return;
    }
    if (!description.trim()) {
      setError('لطفاً توضیحات تغییرات فرآیندی را ثبت کنید.');
      return;
    }

    const finalSlideNum = slideNumber !== '' && !isNaN(Number(slideNumber)) ? Number(slideNumber) : undefined;
    const savedId = initialItem ? initialItem.id : undefined;
    if (savedId) {
      try {
        localStorage.setItem(`era_form_imgs_${savedId}`, JSON.stringify(formImages));
        if (formImages[0]) {
          localStorage.setItem(`era_form_img_${savedId}`, formImages[0]);
        } else {
          localStorage.removeItem(`era_form_img_${savedId}`);
        }
        if (problemDescription.trim()) {
          localStorage.setItem(`era_prob_desc_${savedId}`, problemDescription.trim());
        } else {
          localStorage.removeItem(`era_prob_desc_${savedId}`);
        }
        if (solutionDescription.trim()) {
          localStorage.setItem(`era_sol_desc_${savedId}`, solutionDescription.trim());
        } else {
          localStorage.removeItem(`era_sol_desc_${savedId}`);
        }
        if (achievements.trim()) {
          localStorage.setItem(`era_achievements_${savedId}`, achievements.trim());
        } else {
          localStorage.removeItem(`era_achievements_${savedId}`);
        }
        localStorage.setItem(`era_show_ach_${savedId}`, String(showAchievements));
        if (impactTimeMetric.trim()) {
          localStorage.setItem(`era_time_metric_${savedId}`, impactTimeMetric.trim());
        } else {
          localStorage.removeItem(`era_time_metric_${savedId}`);
        }
        if (impactErrorMetric.trim()) {
          localStorage.setItem(`era_error_metric_${savedId}`, impactErrorMetric.trim());
        } else {
          localStorage.removeItem(`era_error_metric_${savedId}`);
        }
        localStorage.setItem(`era_show_imp_${savedId}`, String(showImpactMetrics));
        if (finalSlideNum !== undefined) {
          localStorage.setItem(`era_slide_num_${savedId}`, String(finalSlideNum));
        } else {
          localStorage.removeItem(`era_slide_num_${savedId}`);
        }
        localStorage.setItem(`era_status_${savedId}`, status);
      } catch (e) {
        console.warn('Could not cache data in localStorage', e);
      }
    }

    onSave({
      id: savedId,
      processName: processName.trim(),
      orgUnit: orgUnit.trim(),
      executionDate: executionDate.trim(),
      operationType,
      entityType,
      status,
      description: description.trim(),
      problemDescription: problemDescription.trim() || undefined,
      solutionDescription: solutionDescription.trim() || undefined,
      achievements: achievements.trim() || undefined,
      showAchievements,
      impactTimeMetric: impactTimeMetric.trim() || undefined,
      impactErrorMetric: impactErrorMetric.trim() || undefined,
      showImpactMetrics,
      slideNumber: finalSlideNum,
      slideOrder: finalSlideNum,
      formImageUrl: formImages[0] || undefined,
      formImages: formImages.length > 0 ? formImages : undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2D2C28]/65 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full md:w-[85vw] lg:w-[80vw] max-w-6xl rounded-3xl bg-[#FAFAF7] p-5 sm:p-8 shadow-2xl border border-[#DDDBCF] max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#545D4B] text-white shadow-xs">
              {initialItem ? <Edit className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#2D2C28]">
                {initialItem ? 'ویرایش اطلاعات فرآیند ERA' : 'ثبت فرآیند جدید / اصلاح شده ERA'}
              </h2>
              <p className="text-xs text-[#75746E] mt-0.5">
                {initialItem
                  ? 'بروزرسانی مشخصات فرآیند، متون پرزنتیشن اسلایدی و تصاویر فرم در پایگاه داده'
                  : 'افزودن فرم جدید یا اصلاحیه ساختاری جهت ثبت در پایگاه داده'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2.5 text-[#75746E] hover:bg-[#EFEFEA] hover:text-[#2D2C28] transition cursor-pointer"
            title="بستن پنجره"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-5 text-xs overflow-y-auto flex-1 pr-1 pl-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-[#FAECE8] text-[#8A2E1D] rounded-xl border border-[#F2D1CA]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Info Grid: Process Name, Org Unit, Execution Date, Entity Type, Operation Type */}
          <div className="bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#DCD9CE] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
              {/* Process Name (Span 6 on large screens) */}
              <div className="lg:col-span-6">
                <label className="block font-bold text-[#4B5344] mb-1.5">
                  نام فرآیند / موجودیت: *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="existing-processes-list"
                    value={processName}
                    onChange={e => setProcessName(e.target.value)}
                    placeholder="مثال: درخواست پرداخت ارزی، مجوز خروج کالا، گزارش اعلان..."
                    className="w-full text-xs bg-white border border-[#DDDBCF] rounded-xl px-3.5 py-2.5 text-[#2D2C28] font-medium focus:outline-none focus:ring-2 focus:ring-[#545D4B] transition"
                    required
                  />
                  <datalist id="existing-processes-list">
                    {existingProcesses.map((p, idx) => (
                      <option key={idx} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Org Unit (Span 3 on large screens) */}
              <div className="lg:col-span-3">
                <label className="block font-bold text-[#4B5344] mb-1.5">
                  واحد سازمانی: *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="existing-units-list"
                    value={orgUnit}
                    onChange={e => setOrgUnit(e.target.value)}
                    placeholder="واحد مربوطه..."
                    className="w-full text-xs bg-white border border-[#DDDBCF] rounded-xl px-3.5 py-2.5 text-[#2D2C28] font-medium focus:outline-none focus:ring-2 focus:ring-[#545D4B] transition"
                    required
                  />
                  <datalist id="existing-units-list">
                    {existingUnits.map((u, idx) => (
                      <option key={idx} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Execution Date (Span 3 on large screens) */}
              <div className="lg:col-span-3">
                <label className="block font-bold text-[#4B5344] mb-1.5">
                  تاریخ انجام (شمسی): *
                </label>
                <JalaliDateInput
                  value={executionDate}
                  onChange={setExecutionDate}
                  placeholder="1405/03/28"
                  inputClassName="px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Row 2: Entity Type, Operation Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E8E6DF]">
              {/* Entity Type (نوع موجودیت: فرم | فرآیند | گزارش) */}
              <div>
                <label className="block font-bold text-[#4B5344] mb-1.5">
                  نوع موجودیت: *
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF]">
                  <button
                    type="button"
                    onClick={() => setEntityType('فرم')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      entityType === 'فرم'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>فرم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntityType('فرآیند')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      entityType === 'فرآیند'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>فرآیند</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntityType('گزارش')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      entityType === 'گزارش'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>گزارش</span>
                  </button>
                </div>
              </div>

              {/* Operation Type (نوع عملیات: اصلاح | جدید | اتوماتیک‌سازی) */}
              <div>
                <label className="block font-bold text-[#4B5344] mb-1.5">
                  نوع عملیات: *
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF]">
                  <button
                    type="button"
                    onClick={() => setOperationType('اصلاح')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      operationType === 'اصلاح'
                        ? 'bg-[#7C3E1D] text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>اصلاح</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationType('جدید')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      operationType === 'جدید'
                        ? 'bg-[#446347] text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>جدید</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationType('اتوماتیک‌سازی')}
                    className={`py-2 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      operationType === 'اتوماتیک‌سازی'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                  >
                    <span>اتوماتیک‌سازی</span>
                  </button>
                </div>
              </div>

              {/* Process Status (وضعیت فرآیند: برای انجام | درحال انجام | انجام شده) */}
              <div>
                <label className="block font-bold text-[#4B5344] mb-1.5 flex items-center justify-between">
                  <span>وضعیت فرآیند: *</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    status === 'برای انجام' ? 'text-amber-800 bg-amber-100 border-amber-300' :
                    status === 'درحال انجام' ? 'text-blue-800 bg-blue-100 border-blue-300' :
                    'text-emerald-800 bg-emerald-100 border-emerald-300'
                  }`}>
                    {status}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF]">
                  <button
                    type="button"
                    onClick={() => setStatus('برای انجام')}
                    className={`py-2 px-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'برای انجام'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                    title="برای انجام"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">برای انجام</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('درحال انجام')}
                    className={`py-2 px-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'درحال انجام'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                    title="درحال انجام"
                  >
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">درحال انجام</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('انجام شده')}
                    className={`py-2 px-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'انجام شده'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                    title="انجام شده"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">انجام شده</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Change Details */}
          <div>
            <label className="block font-bold text-[#4B5344] mb-1.5">
              توضیحات و شرح تغییرات اعمال شده: *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="شرح دقیق دسترسی، فرمت چاپی، فیلدهای اضافه شده یا تغییر ساختار گردش کار..."
              className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl p-3 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition leading-relaxed"
              required
            />
          </div>

          {/* Custom Slide Presentation Text (Problem & Solution / Before & After) */}
          <div className="bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#DCD9CE] space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E6DF] pb-2.5 gap-2">
              <div className="flex items-center gap-2 font-bold text-[#2D2C28] text-xs sm:text-sm">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>متن‌های اختصاصی پرزنتیشن و نمایش اسلایدی (تحلیل چالش و راهکار):</span>
              </div>
              
              {/* Slide Number / Order Input */}
              <div className="flex items-center gap-2 bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
                <ListOrdered className="h-3.5 w-3.5 text-blue-700" />
                <label className="text-xs font-bold text-blue-900 whitespace-nowrap">
                  شماره اسلاید:
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={slideNumber}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') {
                      setSlideNumber('');
                    } else {
                      const n = parseInt(v, 10);
                      setSlideNumber(!isNaN(n) && n > 0 ? n : '');
                    }
                  }}
                  placeholder="خودکار"
                  className="w-16 text-center text-xs font-mono font-bold bg-white border border-blue-300 rounded-lg py-1 px-1.5 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="شماره دلخواه اسلاید در پرزنتیشن (مثلاً ۱، ۲، ۳...)"
                />
                {slideNumber !== '' && (
                  <button
                    type="button"
                    onClick={() => setSlideNumber('')}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                    title="حذف شماره اختصاصی و بازگشت به حالت خودکار"
                  >
                    پاک
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Problem / Before (Right column in slide) */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-bold text-rose-800 text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>مشکل و چالش شناسایی‌شده (ستون قرمز / قبل از اصلاح):</span>
                </label>
                <textarea
                  rows={4}
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  placeholder={
                    operationType === 'اتوماتیک‌سازی'
                      ? 'مثال: قبل از اتوماتیک‌سازی، فرآیند نیازمند مداخله دستی مکرر کاربران، انجام محاسبات یا جابجایی دستی داده‌ها بود که باعث کندی و خطای انسانی می‌شد...'
                      : operationType === 'جدید'
                      ? 'مثال: قبل از ایجاد فرم، فرآیند به صورت سنتی و کاغذی انجام می‌شد که باعث تاخیر و اتلاف وقت می‌گردید...'
                      : 'مثال: وجود باگ و مغایرت در ثبت، عدم دسترسی کاربران شعبه یا کندی در گردش‌کار قبلی...'
                  }
                  className="w-full text-xs bg-white border border-rose-200 rounded-xl p-3 text-[#2D2C28] placeholder:text-[#9A9890] focus:outline-none focus:ring-2 focus:ring-rose-400 transition leading-relaxed"
                />
                <span className="text-[11px] text-rose-700/80 block">
                  این متن در اسلاید با کارت هشدار قرمز نمایش داده می‌شود.
                </span>
              </div>

              {/* Solution / After (Left column in slide) */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>راهکار پیاده‌سازی‌شده در سامانه (ستون سبز / راهکار فناوری اطلاعات):</span>
                </label>
                <textarea
                  rows={4}
                  value={solutionDescription}
                  onChange={e => setSolutionDescription(e.target.value)}
                  placeholder={
                    operationType === 'اتوماتیک‌سازی'
                      ? 'مثال: با اتوماتیک‌سازی هوشمند در بستر سامانه، محاسبات و صدور اسناد به شکل تمام‌خودکار و بدون نیاز به مداخله دست انجام می‌پذیرد...'
                      : operationType === 'جدید'
                      ? 'مثال: با راه‌اندازی فرآیند مکانیزه در سامانه ERA، تمام مراحل ثبت، استعلام و تایید بدون کاغذ و آنلاین شد...'
                      : 'مثال: تیم فناوری اطلاعات با ایجاد دسترسی اختصاصی، اصلاح قالب چاپ و بازطراحی فرم مشکل را برطرف نمود...'
                  }
                  className="w-full text-xs bg-white border border-emerald-200 rounded-xl p-3 text-[#2D2C28] placeholder:text-[#9A9890] focus:outline-none focus:ring-2 focus:ring-emerald-400 transition leading-relaxed"
                />
                <span className="text-[11px] text-emerald-700/80 block">
                  این متن در اسلاید با کارت موفقیت سبز نمایش داده می‌شود.
                </span>
              </div>
            </div>

            {/* Operational Achievements / Results (دستاوردها و نتایج عملیاتی فرآیند) */}
            <div className={`p-4 rounded-2xl border transition-all ${showAchievements ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-100/80 border-slate-300'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200/70">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                  <label className="font-black text-emerald-950 text-xs sm:text-sm">
                    دستاوردها و نتایج عملیاتی فرآیند
                  </label>
                </div>

                {/* Toggle Switch for Achievements Box Visibility */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-emerald-900">
                    {showAchievements ? 'نمایش باکس در اسلاید فعال است' : 'باکس در اسلاید مخفی است'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showAchievements}
                    onClick={() => setShowAchievements(!showAchievements)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showAchievements ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        showAchievements ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between text-[11px] text-emerald-900">
                  <span className="font-semibold">متن دستاوردها (هر مورد در یک سطر با کلید Enter):</span>
                  <span className="text-[10px] text-[#75746E]">
                    در اسلاید با علامت تیک سبز ✓ لیست می‌شوند
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={achievements}
                  onChange={e => setAchievements(e.target.value)}
                  placeholder={
                    '✓ کاهش زمان تأیید و پرداخت حواله ارزی از ۳ روز کاری به کمتر از ۳ ساعت\n✓ شفافیت ۱۰۰٪ تاریخچه تاییدات و پیوست اسناد سوئیفت و تراستی\n✓ حذف کامل خطاهای محاسباتی در نرخ تسعیر و سرفصل‌های ارزی\n✓ گزارش‌گیری لحظه‌ای برای مدیران از کل تعهدات و پرداختی‌های ارزی شرکت'
                  }
                  className="w-full text-xs bg-white border border-emerald-300 rounded-xl p-3 text-[#2D2C28] placeholder:text-[#9A9890] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition leading-relaxed font-medium"
                />

                {/* Predefined Templates / Sample text helper buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-emerald-800 font-bold">درج سریع نمونه متن:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAchievements(
                        'کاهش زمان تأیید و پرداخت حواله ارزی از ۳ روز کاری به کمتر از ۳ ساعت\nشفافیت ۱۰۰٪ تاریخچه تاییدات و پیوست اسناد سوئیفت و تراستی\nحذف کامل خطاهای محاسباتی در نرخ تسعیر و سرفصل‌های ارزی\nگزارش‌گیری لحظه‌ای برای مدیران از کل تعهدات و پرداختی‌های ارزی شرکت'
                      );
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/70 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    + نمونه حواله ارزی و مالی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAchievements(
                        'تسریع بیش از ۷۰٪ در گردش کار و حذف کامل فرآیندهای کاغذی\nثبت مکانیزه لاگ زمانی و کاربر تاییدکننده در تمامی مراحل\nدسترسی برخط مدیران به سوابق، اسناد پیوست و گزارش‌ها'
                      );
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/70 rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    + نمونه فرآیند عمومی
                  </button>
                  {achievements && (
                    <button
                      type="button"
                      onClick={() => setAchievements('')}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100/70 rounded-lg transition cursor-pointer ml-auto"
                    >
                      پاک کردن متن
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Impact Metrics (شاخص‌های اثرگذاری فرآیند) */}
            <div className={`p-4 rounded-2xl border transition-all ${showImpactMetrics ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-100/80 border-slate-300'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <label className="font-black text-amber-950 text-xs sm:text-sm">
                    شاخص‌های اثرگذاری فرآیند
                  </label>
                </div>

                {/* Toggle Switch for Impact Metrics Box Visibility */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-amber-900">
                    {showImpactMetrics ? 'نمایش باکس شاخص‌ها در اسلاید فعال است' : 'باکس شاخص‌ها در اسلاید مخفی است'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showImpactMetrics}
                    onClick={() => setShowImpactMetrics(!showImpactMetrics)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showImpactMetrics ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        showImpactMetrics ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                {/* Metric 1: Time Reduction */}
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-200/80">
                  <label className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>صرفه‌جویی زمان:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">کارت اول اسلاید</span>
                  </label>
                  <input
                    type="text"
                    value={impactTimeMetric}
                    onChange={e => setImpactTimeMetric(e.target.value)}
                    placeholder="مثال: کاهش بیش از ۸۰٪ زمان پردازش حواله‌ها"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#2D2C28] placeholder:text-[#9A9890] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                    <span>پیشنهاد:</span>
                    <button
                      type="button"
                      onClick={() => setImpactTimeMetric('کاهش بیش از ۸۰٪ زمان پردازش حواله‌ها')}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      کاهش بیش از ۸۰٪
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setImpactTimeMetric('از ۳ روز کاری به ۳ ساعت')}
                      className="text-emerald-700 hover:underline cursor-pointer font-bold"
                    >
                      از ۳ روز به ۳ ساعت
                    </button>
                  </div>
                </div>

                {/* Metric 2: Error Reduction */}
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-amber-200/80">
                  <label className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-blue-600" />
                      <span>کاهش خطای انسانی:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">کارت دوم اسلاید</span>
                  </label>
                  <input
                    type="text"
                    value={impactErrorMetric}
                    onChange={e => setImpactErrorMetric(e.target.value)}
                    placeholder="مثال: صفر شدن خطاهای مغایرت حساب بانکی و تراستی"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-[#2D2C28] placeholder:text-[#9A9890] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                    <span>پیشنهاد:</span>
                    <button
                      type="button"
                      onClick={() => setImpactErrorMetric('صفر شدن خطاهای مغایرت حساب بانکی و تراستی')}
                      className="text-blue-700 hover:underline cursor-pointer font-bold"
                    >
                      صفر شدن خطای مغایرت
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setImpactErrorMetric('حذف ۱۰۰٪ خطاهای محاسباتی نرخ تسعیر')}
                      className="text-blue-700 hover:underline cursor-pointer font-bold"
                    >
                      حذف ۱۰۰٪ خطای تسعیر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Screenshots / Multi-Image Upload & Ordering Section */}
          <div className="bg-[#EFEFEA] p-4 sm:p-5 rounded-2xl border border-[#DDDBCF] space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-[#2D2C28] text-xs sm:text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#545D4B]" />
                  <span>تصاویر و اسکرین‌شات‌های فرآیند ({formImages.length} تصویر):</span>
                </label>
                <p className="text-[11px] text-[#75746E] mt-0.5">
                  می‌توانید ترتیب نمایش تصاویر در اسلاید را با دکمه‌های ◀ / ▶ یا کشیدن و رها کردن تغییر دهید. تصویر ۱ کاور اصلی اسلاید است.
                </p>
              </div>

              {formImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-700 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-blue-200 hover:bg-blue-50 transition cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>افزودن تصویر بیشتر</span>
                </button>
              )}
            </div>

            {/* Image Gallery Grid with Reordering */}
            {formImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                {formImages.map((img, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === formImages.length - 1;
                  const isBeingDragged = draggedImgIdx === idx;
                  const isDragTarget = dragOverImgIdx === idx;

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleImageDropReorder(e, idx)}
                      className={`relative rounded-2xl overflow-hidden border-2 bg-white flex flex-col shadow-xs transition-all ${
                        isFirst ? 'border-amber-400 ring-2 ring-amber-200/50' : 'border-[#DDDBCF]'
                      } ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${
                        isDragTarget ? 'border-blue-500 scale-105 shadow-md ring-2 ring-blue-400' : ''
                      }`}
                    >
                      {/* Top Bar with Badge and Actions */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FAF9F5] border-b border-[#E8E6DF] text-xs">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-[#8A8880] cursor-grab active:cursor-grabbing" />
                          <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-1.5 py-0.5 rounded-md ${
                            isFirst ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#EAE8DE] text-[#44423C]'
                          }`}>
                            {isFirst && <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" />}
                            <span>تصویر {idx + 1}</span>
                            {isFirst && <span className="text-[9px] font-normal">(کاور)</span>}
                          </span>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isFirst ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                            title="انتقال به قبل (سمت چپ/جلوتر)"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isLast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                            title="انتقال به بعد (سمت راست/عقب‌تر)"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>

                          {!isFirst && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(idx)}
                              className="p-1 rounded-lg text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                              title="تنظیم به عنوان تصویر اصلی (کاور اسلاید)"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="حذف این تصویر"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Image Thumbnail */}
                      <div className="relative h-32 bg-slate-950/5 flex items-center justify-center overflow-hidden group">
                        <img
                          src={img}
                          alt={`اسکرین شات ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!isFirst && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(idx)}
                              className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition shadow-md flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="h-3 w-3" />
                              <span>کاور اصلی</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 rounded-lg bg-rose-600 text-white text-xs hover:bg-rose-700 transition shadow-md cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Add More Button in Grid */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DDDBCF] hover:border-[#545D4B] rounded-2xl h-[172px] flex flex-col items-center justify-center gap-2 text-[#75746E] hover:text-[#2D2C28] bg-white/60 hover:bg-white transition cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#EFEFEA] group-hover:bg-[#545D4B] text-[#545D4B] group-hover:text-white flex items-center justify-center transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold">افزودن عکس جدید</span>
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#DDDBCF] hover:border-[#545D4B] rounded-2xl p-6 text-center cursor-pointer bg-white/70 hover:bg-white transition flex flex-col items-center justify-center gap-2"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#EFEFEA] flex items-center justify-center text-[#545D4B]">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm text-[#2D2C28]">
                  برای آپلود تصاویر فرم کلیک کنید یا فایل‌ها را به اینجا بکشید و رها کنید
                </span>
                <span className="text-xs text-[#75746E]">
                  امکان بارگذاری چندین تصویر همزمان با قابلیت تعیین ترتیب و اولویت نمایش در اسلاید
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleImageFiles(e.target.files);
                }
              }}
            />
          </div>

          {/* BPMN 2.0 Process Modeling Section */}
          <div className="bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#DDDBCF] space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#2D2C28] text-xs sm:text-sm flex items-center gap-2">
                    <span>مدل‌سازی فرآیند با استاندارد BPMN 2.0 (bpmn.js)</span>
                    {initialItem && (initialItem.bpmnXml || initialItem.hasBpmn) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        <Check className="h-3 w-3 text-emerald-700" />
                        <span>دیاگرام فعال</span>
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-[#75746E] mt-0.5">
                    طراحی جریان کار، استخرهای سازمانی (Lanes)، رویدادها، فعالیت‌ها و درگاه‌های تصمیم‌گیری فرآیند با ویرایشگر تعاملی bpmn.js
                  </p>
                </div>
              </div>

              {initialItem && onOpenBpmnDesigner ? (
                <button
                  type="button"
                  onClick={() => onOpenBpmnDesigner(initialItem)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Workflow className="h-4 w-4" />
                  <span>
                    {initialItem.bpmnXml || initialItem.hasBpmn
                      ? 'ویرایش دیاگرام BPMN'
                      : 'طراحی دیاگرام جدید BPMN'}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] text-[#8A8880] italic self-start sm:self-auto">
                  (برای دسترسی به طراح BPMN، ابتدا فرآیند را ذخیره نمایید)
                </span>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E8E6DF] pt-4 mt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 font-bold text-[#5A5852] hover:bg-[#EFEFEA] rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-[#545D4B] hover:bg-[#434A3C] rounded-xl shadow-md transition active:scale-95 cursor-pointer text-xs sm:text-sm"
            >
              <Check className="h-4 w-4" />
              <span>{initialItem ? 'ذخیره و ثبت تغییرات' : 'ثبت و ارسال فرآیند'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
