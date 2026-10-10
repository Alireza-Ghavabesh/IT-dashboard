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
  XCircle,
  Gauge,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Star,
  ListOrdered,
  GripVertical,
  Workflow,
  Paperclip,
  FileText,
  Download,
  FileArchive,
  FileSpreadsheet
} from 'lucide-react';
import { ProcessedEraItem, RawEraItem, EraNoteFile } from '../types';
import { JalaliDateInput } from './JalaliDateInput';
import { RichTextEditor } from './RichTextEditor';
import { getCurrentJalaliDate } from '../utils/parser';

interface EraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ProcessedEraItem>) => void;
  initialItem?: ProcessedEraItem | null;
  existingUnits?: string[];
  existingProcesses?: string[];
  maxFileSizeMb?: number;
  onOpenBpmnDesigner?: (item: ProcessedEraItem) => void;
}

export const EraFormModal: React.FC<EraFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  existingUnits = [],
  existingProcesses = [],
  maxFileSizeMb = 10,
  onOpenBpmnDesigner
}) => {
  const [processName, setProcessName] = useState('');
  const [orgUnit, setOrgUnit] = useState('');
  const [executionDate, setExecutionDate] = useState(() => getCurrentJalaliDate().str);
  const [operationType, setOperationType] = useState<'جدید' | 'اصلاح' | 'اتوماتیک‌سازی'>('اصلاح');
  const [entityType, setEntityType] = useState<'فرم' | 'فرآیند' | 'گزارش'>('فرآیند');
  const [status, setStatus] = useState<'برای انجام' | 'درحال انجام' | 'انجام شده' | 'رد شده'>('برای انجام');
  const [rejectionReason, setRejectionReason] = useState('');
  const [description, setDescription] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [solutionDescription, setSolutionDescription] = useState('');
  const [achievements, setAchievements] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);
  const [impactTimeMetric, setImpactTimeMetric] = useState('');
  const [impactErrorMetric, setImpactErrorMetric] = useState('');
  const [showImpactMetrics, setShowImpactMetrics] = useState(false);
  const [slideNumber, setSlideNumber] = useState<number | ''>('');
  const [hasBeforeImage, setHasBeforeImage] = useState(false);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [draggedBeforeIdx, setDraggedBeforeIdx] = useState<number | null>(null);
  const [dragOverBeforeIdx, setDragOverBeforeIdx] = useState<number | null>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);

  const [formImages, setFormImages] = useState<string[]>([]);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);
  const [editorColumnsMode, setEditorColumnsMode] = useState<'2cols' | '1col'>('2cols');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note File Attachment State (PDF, XLSX, RAR, ZIP)
  const [noteFile, setNoteFile] = useState<EraNoteFile | null>(null);
  const [isUploadingNote, setIsUploadingNote] = useState<boolean>(false);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialItem) {
      setProcessName(initialItem.processName);
      setOrgUnit(initialItem.orgUnit);
      setExecutionDate(initialItem.executionDate || getCurrentJalaliDate().str);
      
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
      if (st.includes('رد شده') || st.includes('ردشده') || st.toLowerCase().includes('reject')) {
        setStatus('رد شده');
      } else if (st.includes('برای انجام') || st.toLowerCase().includes('todo')) {
        setStatus('برای انجام');
      } else if (st.includes('درحال انجام') || st.includes('در حال انجام') || st.toLowerCase().includes('in-progress')) {
        setStatus('درحال انجام');
      } else if (st.includes('انجام شده') || st.toLowerCase().includes('done')) {
        setStatus('انجام شده');
      } else {
        const cachedSt = typeof window !== 'undefined' ? localStorage.getItem(`era_status_${initialItem.id}`) : null;
        if (cachedSt === 'برای انجام' || cachedSt === 'درحال انجام' || cachedSt === 'انجام شده' || cachedSt === 'رد شده') {
          setStatus(cachedSt as any);
        } else {
          setStatus('انجام شده');
        }
      }

      const savedRej = initialItem.rejectionReason 
        || (initialItem as any)["دلیل رد"] 
        || (initialItem as any)["علت رد"] 
        || (typeof window !== 'undefined' ? localStorage.getItem(`era_rej_reason_${initialItem.id}`) : '')
        || '';
      setRejectionReason(savedRej);

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

      // Load optional Before Image(s)
      const initHasBefore = Boolean(
        initialItem.hasBeforeImage ||
        (initialItem as any)["دارای عکس قبل از اصلاح"] === 'بله' ||
        (initialItem as any)["دارای عکس قبل از اصلاح"] === true ||
        initialItem.beforeImageUrl ||
        (Array.isArray(initialItem.beforeImages) && initialItem.beforeImages.length > 0)
      );
      setHasBeforeImage(initHasBefore);

      let loadedBeforeImgs: string[] = [];
      if (initialItem.beforeImages && Array.isArray(initialItem.beforeImages) && initialItem.beforeImages.length > 0) {
        loadedBeforeImgs = initialItem.beforeImages;
      } else if (initialItem.beforeImageUrl) {
        loadedBeforeImgs = [initialItem.beforeImageUrl];
      } else {
        try {
          const cachedJson = localStorage.getItem(`era_before_imgs_${initialItem.id}`) || localStorage.getItem(`era_before_imgs_${initialItem.processName}`);
          if (cachedJson) {
            loadedBeforeImgs = JSON.parse(cachedJson);
          } else {
            const singleCached = localStorage.getItem(`era_before_img_${initialItem.id}`) || localStorage.getItem(`era_before_img_${initialItem.processName}`);
            if (singleCached) loadedBeforeImgs = [singleCached];
          }
        } catch (e) {
          console.warn(e);
        }
      }
      setBeforeImages(loadedBeforeImgs);

      // Load note file attachment if present
      let loadedNoteFile: EraNoteFile | null = null;
      if (initialItem.noteFile) {
        loadedNoteFile = initialItem.noteFile;
      } else if ((initialItem as any)["فایل یادداشت"]) {
        loadedNoteFile = (initialItem as any)["فایل یادداشت"];
      } else if (typeof window !== 'undefined') {
        try {
          const cachedNote = localStorage.getItem(`era_notefile_${initialItem.id}`) || localStorage.getItem(`era_notefile_${initialItem.processName}`);
          if (cachedNote) {
            loadedNoteFile = JSON.parse(cachedNote);
          }
        } catch {}
      }
      setNoteFile(loadedNoteFile);
    } else {
      setProcessName('');
      setOrgUnit(existingUnits[0] || 'فروش');
      setExecutionDate(getCurrentJalaliDate().str);
      setOperationType('اصلاح');
      setEntityType('فرآیند');
      setStatus('برای انجام');
      setRejectionReason('');
      setDescription('');
      setProblemDescription('');
      setSolutionDescription('');
      setAchievements('');
      setShowAchievements(false);
      setImpactTimeMetric('');
      setImpactErrorMetric('');
      setShowImpactMetrics(false);
      setSlideNumber('');
      setHasBeforeImage(false);
      setBeforeImages([]);
      setFormImages([]);
      setNoteFile(null);
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

  const handleBeforeImageFiles = (files: FileList | File[]) => {
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
          setBeforeImages(prev => [...prev, result]);
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

  const handleBeforeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBeforeImageFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveBeforeImage = (indexToRemove: number) => {
    setBeforeImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveBeforeImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= beforeImages.length || fromIdx === toIdx) return;
    setBeforeImages(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
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

  const handleNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['pdf', 'xlsx', 'xls', 'rar', 'zip'];
    if (!ext || !allowedExts.includes(ext)) {
      setError(`فرمت فایل انتخابی مجاز نیست. لطفاً یکی از فرمت‌های pdf، xlsx، rar یا zip را انتخاب فرمایید.`);
      if (noteFileInputRef.current) noteFileInputRef.current.value = '';
      return;
    }

    // Check size limit from props (maxFileSizeMb)
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const actualMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`حجم فایل انتخابی (${actualMb} مگابایت) بیشتر از سقف مجاز تعیین شده در تنظیمات (${maxFileSizeMb} مگابایت) است. لطفاً فایل کم‌حجم‌تری انتخاب کنید یا سقف مجاز را در تنظیمات افزایش دهید.`);
      if (noteFileInputRef.current) noteFileInputRef.current.value = '';
      return;
    }

    setIsUploadingNote(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setNoteFile({
        name: file.name,
        size: file.size,
        type: file.type || ext,
        data: dataUri,
        uploadedAt: getCurrentJalaliDate().str
      });
      setIsUploadingNote(false);
      if (noteFileInputRef.current) noteFileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setError('خطا در خواندن فایل یادداشت. لطفاً دوباره تلاش کنید.');
      setIsUploadingNote(false);
      if (noteFileInputRef.current) noteFileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveNoteFile = () => {
    setNoteFile(null);
    if (noteFileInputRef.current) noteFileInputRef.current.value = '';
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
    if (status === 'رد شده' && !rejectionReason.trim()) {
      setError('وضعیت فرآیند روی «رد شده» تنظیم شده است؛ لطفاً دلیل رد را به صورت اجباری وارد کنید.');
      return;
    }

    const finalSlideNum = slideNumber !== '' && !isNaN(Number(slideNumber)) ? Number(slideNumber) : undefined;
    const savedId = initialItem ? initialItem.id : undefined;
    if (savedId) {
      try {
        localStorage.setItem(`era_has_before_img_${savedId}`, String(hasBeforeImage));
        if (hasBeforeImage && beforeImages.length > 0) {
          localStorage.setItem(`era_before_imgs_${savedId}`, JSON.stringify(beforeImages));
          localStorage.setItem(`era_before_img_${savedId}`, beforeImages[0]);
        } else {
          localStorage.removeItem(`era_before_imgs_${savedId}`);
          localStorage.removeItem(`era_before_img_${savedId}`);
        }
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
        if (status === 'رد شده' && rejectionReason.trim()) {
          localStorage.setItem(`era_rej_reason_${savedId}`, rejectionReason.trim());
        } else {
          localStorage.removeItem(`era_rej_reason_${savedId}`);
        }
        if (noteFile) {
          localStorage.setItem(`era_notefile_${savedId}`, JSON.stringify(noteFile));
        } else {
          localStorage.removeItem(`era_notefile_${savedId}`);
        }
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
      rejectionReason: status === 'رد شده' ? rejectionReason.trim() : undefined,
      noteFile: noteFile || null,
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
      hasBeforeImage,
      beforeImageUrl: hasBeforeImage && beforeImages.length > 0 ? beforeImages[0] : undefined,
      beforeImages: hasBeforeImage && beforeImages.length > 0 ? beforeImages : undefined,
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#4B5344]">
                    تاریخ انجام (شمسی): *
                  </label>
                  <button
                    type="button"
                    onClick={() => setExecutionDate(getCurrentJalaliDate().str)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                    title="تنظیم تاریخ به امروز"
                  >
                    امروز ({getCurrentJalaliDate().str})
                  </button>
                </div>
                <JalaliDateInput
                  value={executionDate}
                  onChange={setExecutionDate}
                  placeholder={getCurrentJalaliDate().str}
                  inputClassName="px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono"
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

              {/* Process Status (وضعیت فرآیند: برای انجام | درحال انجام | انجام شده | رد شده) */}
              <div>
                <label className="block font-bold text-[#4B5344] mb-1.5 flex items-center justify-between">
                  <span>وضعیت فرآیند: *</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    status === 'رد شده' ? 'text-rose-900 bg-rose-100 border-rose-300' :
                    status === 'برای انجام' ? 'text-amber-800 bg-amber-100 border-amber-300' :
                    status === 'درحال انجام' ? 'text-blue-800 bg-blue-100 border-blue-300' :
                    'text-emerald-800 bg-emerald-100 border-emerald-300'
                  }`}>
                    {status}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4 gap-1.5 bg-[#EBEBE6] p-1 rounded-xl border border-[#DDDBCF]">
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
                  <button
                    type="button"
                    onClick={() => setStatus('رد شده')}
                    className={`py-2 px-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      status === 'رد شده'
                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                        : 'text-rose-700 hover:text-rose-900 hover:bg-rose-100/70'
                    }`}
                    title="رد شده"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">رد شده</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rejection Reason - Prominent Red Box (دلیل رد - اجباری در صورت انتخاب وضعیت رد شده) */}
            {status === 'رد شده' && (
              <div className="pt-3 border-t-2 border-rose-300">
                <div className="bg-rose-50/90 border-2 border-rose-400 rounded-2xl p-4 shadow-sm space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-rose-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow-2xs">
                        <XCircle className="w-4 h-4" />
                      </div>
                      <label htmlFor="rejectionReasonInput" className="font-extrabold text-sm text-rose-950 flex items-center gap-2">
                        <span>دلیل رد فرآیند / اقدام:</span>
                        <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                          اجباری *
                        </span>
                      </label>
                    </div>
                    <span className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>ثبت دلیل رد برای این فرآیند الزامی است</span>
                    </span>
                  </div>

                  <div>
                    <textarea
                      id="rejectionReasonInput"
                      rows={2}
                      value={rejectionReason}
                      onChange={e => {
                        setRejectionReason(e.target.value);
                        if (error && error.includes('دلیل رد')) {
                          setError(null);
                        }
                      }}
                      placeholder="علت و دلیل رد شدن این فرآیند را به طور شفاف توضیح دهید (مثلاً: عدم تطابق با دستورالعمل مصوب، عدم تایید مدیر مافوق، خطای ساختاری و...)"
                      className={`w-full text-xs font-medium bg-white border-2 rounded-xl p-3 text-rose-950 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 transition leading-relaxed resize-y min-h-[75px] ${
                        !rejectionReason.trim() && error
                          ? 'border-rose-600 ring-2 ring-rose-400 bg-rose-50/40'
                          : 'border-rose-300 focus:border-rose-600'
                      }`}
                      required
                    />
                    {!rejectionReason.trim() ? (
                      <p className="mt-1 text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        * این فیلد اجباری است و در فهرست فرآیندها به همراه نشان وضعیت قرمز نمایش داده خواهد شد.
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>دلیل رد آماده ذخیره‌سازی است.</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
              className="w-full text-xs bg-[#F5F5F0] border border-[#DDDBCF] rounded-xl p-3 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] focus:bg-white transition leading-relaxed resize-y min-h-[90px]"
              required
            />
          </div>

          {/* Note File Attachment Section (پیوست فایل یادداشت با فرمت‌های pdf, xlsx, rar, zip) */}
          <div className="bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#DDDBCF] space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#E8E6DF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <label className="font-bold text-[#2D2C28] text-xs sm:text-sm flex items-center gap-2">
                    <span>پیوست فایل یادداشت فرآیند</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAE8DE] text-[#545D4B] border border-[#DDDBCF]">
                      اختیاری
                    </span>
                  </label>
                  <p className="text-[11px] text-[#75746E] mt-0.5">
                    فرمت‌های مجاز: <strong className="text-[#2D2C28]">PDF</strong> ، <strong className="text-[#2D2C28]">XLSX</strong> ، <strong className="text-[#2D2C28]">RAR</strong> ، <strong className="text-[#2D2C28]">ZIP</strong> • سقف مجاز حجم: <strong className="text-amber-800">{maxFileSizeMb} مگابایت</strong>
                  </p>
                </div>
              </div>

              {/* Upload trigger button */}
              <div>
                <input
                  ref={noteFileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.rar,.zip,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/x-rar-compressed,application/octet-stream,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={handleNoteFileChange}
                />
                {!noteFile ? (
                  <button
                    type="button"
                    onClick={() => noteFileInputRef.current?.click()}
                    disabled={isUploadingNote}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F5F4EE] text-[#545D4B] hover:text-[#2D2C28] text-xs font-bold rounded-xl border border-[#DDDBCF] transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="h-4 w-4 text-amber-700" />
                    <span>{isUploadingNote ? 'در حال بارگذاری فایل...' : 'انتخاب و بارگذاری فایل یادداشت'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => noteFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F4EE] text-[#545D4B] text-xs font-bold rounded-xl border border-[#DDDBCF] transition shadow-2xs cursor-pointer"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>تغییر فایل</span>
                  </button>
                )}
              </div>
            </div>

            {/* Note File Display Card */}
            {noteFile ? (
              <div className="bg-white rounded-xl p-3.5 border border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    noteFile.name.toLowerCase().endsWith('.pdf')
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : noteFile.name.toLowerCase().endsWith('.xlsx') || noteFile.name.toLowerCase().endsWith('.xls')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {noteFile.name.toLowerCase().endsWith('.pdf') ? (
                      <FileText className="h-5 w-5" />
                    ) : noteFile.name.toLowerCase().endsWith('.xlsx') || noteFile.name.toLowerCase().endsWith('.xls') ? (
                      <FileSpreadsheet className="h-5 w-5" />
                    ) : (
                      <FileArchive className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#2D2C28] truncate dir-ltr text-right" title={noteFile.name}>
                        {noteFile.name}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${
                        noteFile.name.toLowerCase().endsWith('.pdf')
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : noteFile.name.toLowerCase().endsWith('.xlsx') || noteFile.name.toLowerCase().endsWith('.xls')
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {noteFile.name.split('.').pop()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#75746E] mt-0.5">
                      <span>حجم: <strong className="font-mono text-[#2D2C28]">{(noteFile.size / 1024).toFixed(1)} KB</strong></span>
                      {noteFile.uploadedAt && <span>تاریخ ثبت: <strong className="font-mono">{noteFile.uploadedAt}</strong></span>}
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <Check className="h-3 w-3" />
                        <span>پیوست آماده ذخیره</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <a
                    href={noteFile.data}
                    download={noteFile.name}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                    title="دانلود و مشاهده فایل"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>دانلود فایل</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleRemoveNoteFile}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition cursor-pointer"
                    title="حذف فایل پیوست"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => noteFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#DDDBCF] hover:border-amber-400 bg-white hover:bg-amber-50/30 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group"
              >
                <div className="w-8 h-8 rounded-full bg-[#F5F4EE] group-hover:bg-amber-100 text-[#75746E] group-hover:text-amber-800 flex items-center justify-center transition">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-[#5A5852] group-hover:text-[#2D2C28]">
                  برای بارگذاری فایل یادداشت اینجا کلیک کنید
                </div>
                <div className="text-[10px] text-[#8A8880]">
                  پشتیبانی از اسناد PDF ، اکسل XLSX ، فشرده RAR و ZIP (حداکثر تا {maxFileSizeMb} مگابایت بر اساس تنظیمات)
                </div>
              </div>
            )}
          </div>

          {/* Custom Slide Presentation Text (Problem & Solution / Before & After) */}
          <div className="bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#DCD9CE] space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E6DF] pb-2.5 gap-2">
              <div className="flex items-center gap-2 font-bold text-[#2D2C28] text-xs sm:text-sm">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>متن‌های اختصاصی پرزنتیشن و نمایش اسلایدی (تحلیل چالش و راهکار):</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Col vs 2-Col Layout Switcher */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#DDDBCF] text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setEditorColumnsMode('2cols')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      editorColumnsMode === '2cols' ? 'bg-[#545D4B] text-white shadow-2xs' : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                    title="نمایش دو کادر در دو ستون کنار هم"
                  >
                    ۲ ستونه
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorColumnsMode('1col')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      editorColumnsMode === '1col' ? 'bg-[#545D4B] text-white shadow-2xs' : 'text-[#615F59] hover:text-[#2D2C28]'
                    }`}
                    title="نمایش کادرها به صورت تمام‌عرض زیر هم برای فضای بسیار بزرگ‌تر و نوشتن متون طولانی"
                  >
                    تمام‌عرض (بزرگ‌تر)
                  </button>
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
            </div>

            <div className={editorColumnsMode === '2cols' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-5'}>
              {/* Problem / Before (Right column in slide) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-rose-800 text-xs">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>مشکل و چالش شناسایی‌شده (ستون قرمز / قبل از اصلاح):</span>
                  </label>
                  <span className="text-[10px] text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200 font-bold">
                    ویرایشگر پیشرفته با قابلیت تغییر اندازه
                  </span>
                </div>
                <RichTextEditor
                  value={problemDescription}
                  onChange={setProblemDescription}
                  placeholder={
                    operationType === 'اتوماتیک‌سازی'
                      ? 'مثال: قبل از اتوماتیک‌سازی، فرآیند نیازمند مداخله دستی مکرر کاربران، انجام محاسبات یا جابجایی دستی داده‌ها بود که باعث کندی و خطای انسانی می‌شد...'
                      : operationType === 'جدید'
                      ? 'مثال: قبل از ایجاد فرم، فرآیند به صورت سنتی و کاغذی انجام می‌شد که باعث تاخیر و اتلاف وقت می‌گردید...'
                      : 'مثال: وجود باگ و مغایرت در ثبت، عدم دسترسی کاربران شعبه یا کندی در گردش‌کار قبلی...'
                  }
                  variant="rose"
                  minHeight="140px"
                  maxHeight="none"
                />
                <span className="text-[11px] text-rose-700/80 block">
                  این متن در اسلاید با کارت هشدار قرمز و قالب‌بندی انتخابی شما (سرتیتر، لیست نقطه‌ای و شماره‌دار، سایز و رنگ) نمایش داده می‌شود.
                </span>
              </div>

              {/* Solution / After (Left column in slide) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>راهکار پیاده‌سازی‌شده در سامانه (ستون سبز / راهکار فناوری اطلاعات):</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                    ویرایشگر پیشرفته با قابلیت تغییر اندازه
                  </span>
                </div>
                <RichTextEditor
                  value={solutionDescription}
                  onChange={setSolutionDescription}
                  placeholder={
                    operationType === 'اتوماتیک‌سازی'
                      ? 'مثال: با اتوماتیک‌سازی هوشمند در بستر سامانه، محاسبات و صدور اسناد به شکل تمام‌خودکار و بدون نیاز به مداخله دست انجام می‌پذیرد...'
                      : operationType === 'جدید'
                      ? 'مثال: با راه‌اندازی فرآیند مکانیزه در سامانه ERA، تمام مراحل ثبت، استعلام و تایید بدون کاغذ و آنلاین شد...'
                      : 'مثال: تیم فناوری اطلاعات با ایجاد دسترسی اختصاصی، اصلاح قالب چاپ و بازطراحی فرم مشکل را برطرف نمود...'
                  }
                  variant="emerald"
                  minHeight="140px"
                  maxHeight="none"
                />
                <span className="text-[11px] text-emerald-700/80 block">
                  این متن در اسلاید با کارت موفقیت سبز و قالب‌بندی انتخابی شما نمایش داده می‌شود.
                </span>
              </div>
            </div>

            {/* Operational Achievements / Results (دستاوردها و نتایج عملیاتی فرآیند) */}
            <div className={`p-4 rounded-2xl border transition-all ${showAchievements ? 'bg-emerald-50/70 border-emerald-300' : 'bg-[#F7F7F4] border-[#DDDBCF]'}`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${showAchievements ? 'pb-3 border-b border-emerald-200/70' : ''}`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${showAchievements ? 'text-emerald-700' : 'text-[#615F59]'}`} />
                  <label className={`font-black text-xs sm:text-sm ${showAchievements ? 'text-emerald-950' : 'text-[#2D2C28]'}`}>
                    دستاوردها و نتایج عملیاتی فرآیند
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    showAchievements ? 'bg-emerald-200 text-emerald-900' : 'bg-[#E5E5DF] text-[#615F59]'
                  }`}>
                    {showAchievements ? 'فعال در اسلاید' : 'پیش‌فرض غیرفعال'}
                  </span>
                </div>

                {/* Toggle Switch for Achievements Box Visibility */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold ${showAchievements ? 'text-emerald-900' : 'text-[#75746E]'}`}>
                    {showAchievements ? 'نمایش باکس در اسلاید فعال است' : 'غیرفعال (مخفی در اسلاید)'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showAchievements}
                    onClick={() => setShowAchievements(!showAchievements)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showAchievements ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={showAchievements ? 'غیرفعال‌سازی دستاوردها' : 'فعال‌سازی دستاوردها'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        showAchievements ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {showAchievements ? (
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
              ) : (
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#75746E]">
                  <span>این بخش به صورت پیش‌فرض غیرفعال است و کادر دستاوردها در اسلاید مخفی می‌باشد.</span>
                  <button
                    type="button"
                    onClick={() => setShowAchievements(true)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    فعال‌سازی و افزودن دستاورد
                  </button>
                </div>
              )}
            </div>

            {/* Impact Metrics (شاخص‌های اثرگذاری فرآیند) */}
            <div className={`p-4 rounded-2xl border transition-all ${showImpactMetrics ? 'bg-amber-50/70 border-amber-300' : 'bg-[#F7F7F4] border-[#DDDBCF]'}`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${showImpactMetrics ? 'pb-3 border-b border-amber-200/70' : ''}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${showImpactMetrics ? 'text-amber-700' : 'text-[#615F59]'}`} />
                  <label className={`font-black text-xs sm:text-sm ${showImpactMetrics ? 'text-amber-950' : 'text-[#2D2C28]'}`}>
                    شاخص‌های اثرگذاری فرآیند
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    showImpactMetrics ? 'bg-amber-200 text-amber-900' : 'bg-[#E5E5DF] text-[#615F59]'
                  }`}>
                    {showImpactMetrics ? 'فعال در اسلاید' : 'پیش‌فرض غیرفعال'}
                  </span>
                </div>

                {/* Toggle Switch for Impact Metrics Box Visibility */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold ${showImpactMetrics ? 'text-amber-900' : 'text-[#75746E]'}`}>
                    {showImpactMetrics ? 'نمایش باکس شاخص‌ها در اسلاید فعال است' : 'غیرفعال (مخفی در اسلاید)'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showImpactMetrics}
                    onClick={() => setShowImpactMetrics(!showImpactMetrics)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showImpactMetrics ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                    title={showImpactMetrics ? 'غیرفعال‌سازی شاخص‌ها' : 'فعال‌سازی شاخص‌ها'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        showImpactMetrics ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {showImpactMetrics ? (
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
              ) : (
                <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#75746E]">
                  <span>این بخش به صورت پیش‌فرض غیرفعال است و کارت‌های شاخص در اسلاید مخفی می‌باشند.</span>
                  <button
                    type="button"
                    onClick={() => setShowImpactMetrics(true)}
                    className="text-amber-800 hover:text-amber-950 font-bold text-xs hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    فعال‌سازی و تنظیم شاخص‌ها
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Optional Before-Image Checkbox Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#DDDBCF] shadow-2xs hover:border-[#545D4B]/40 transition">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasBeforeImage}
                onChange={e => setHasBeforeImage(e.target.checked)}
                className="h-4 w-4 rounded text-[#545D4B] focus:ring-[#545D4B] border-[#C7C5BB] cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-[#2D2C28]">
                  دارای عکس قبل از اصلاح
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  اختیاری
                </span>
              </div>
            </label>
            <span className="text-[11px] text-[#75746E]">
              {hasBeforeImage
                ? 'امکان آپلود تصویر وضعیت قبل از اصلاح و وضعیت بعد از اصلاح فعال شد'
                : 'در صورت عدم انتخاب، فرآیند مطابق روال فعلی فقط دارای تصویر فرم نهایی خواهد بود'}
            </span>
          </div>

          {/* Section 1: Before-Image (Only rendered if hasBeforeImage is checked) */}
          {hasBeforeImage && (
            <div className="bg-[#FAF4F2] p-4 sm:p-5 rounded-2xl border border-[#F2D1CA] space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="font-bold text-[#8A2E1D] text-xs sm:text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#9C3A27]" />
                    <span>عکس یا اسکرین‌شات وضعیت قبل از اصلاح (کاغذی، دستی یا سنتی) ({beforeImages.length} تصویر):</span>
                  </label>
                  <p className="text-[11px] text-[#9C3A27]/80 mt-0.5">
                    تصویر فرم قدیمی، برگه دستی، گردش کار کاغذی یا وضعیت قبلی که این فرآیند آن را حل کرده است.
                  </p>
                </div>

                {beforeImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="text-rose-700 hover:text-rose-800 font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-rose-200 hover:bg-rose-50 transition cursor-pointer shadow-2xs self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>افزودن تصویر قبل بیشتر</span>
                  </button>
                )}
              </div>

              {/* Before Images Gallery Grid */}
              {beforeImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  {beforeImages.map((img, idx) => (
                    <div
                      key={`before-img-${idx}`}
                      className="relative rounded-2xl overflow-hidden border-2 border-[#F2D1CA] bg-white flex flex-col shadow-xs"
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#FDF7F5] border-b border-[#F2D1CA] text-xs">
                        <span className="font-bold text-[11px] px-1.5 py-0.5 rounded-md bg-[#FAECE8] text-[#8A2E1D]">
                          تصویر قبل {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveBeforeImage(idx)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="حذف این تصویر قبل"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="relative h-32 bg-slate-950/5 flex items-center justify-center overflow-hidden">
                        <img src={img} alt={`تصویر قبل ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#F2D1CA] hover:border-[#9C3A27] rounded-2xl h-[172px] flex flex-col items-center justify-center gap-2 text-[#9C3A27] hover:text-[#8A2E1D] bg-white/70 hover:bg-white transition cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-xl bg-[#FAECE8] flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold">افزودن عکس قبل</span>
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleBeforeDrop}
                  onClick={() => beforeFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#F2D1CA] hover:border-[#9C3A27] rounded-2xl p-5 text-center cursor-pointer bg-white/70 hover:bg-white transition flex flex-col items-center justify-center gap-2"
                >
                  <div className="h-10 w-10 rounded-2xl bg-[#FAECE8] flex items-center justify-center text-[#9C3A27]">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-[#8A2E1D]">
                    برای آپلود عکس وضعیت قبل از اصلاح کلیک کنید یا عکس را بکشید و رها کنید
                  </span>
                  <span className="text-[11px] text-[#9C3A27]/70">
                    تصویر سند کاغذی، فرم قدیمی یا سیستم سنتی
                  </span>
                </div>
              )}

              <input
                ref={beforeFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleBeforeImageFiles(e.target.files);
                  }
                }}
              />
            </div>
          )}

          {/* Form Screenshots / Multi-Image Upload & Ordering Section */}
          <div className="bg-[#EFEFEA] p-4 sm:p-5 rounded-2xl border border-[#DDDBCF] space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-[#2D2C28] text-xs sm:text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#545D4B]" />
                  <span>
                    {hasBeforeImage
                      ? `تصاویر و اسکرین‌شات‌های فرآیند (وضعیت بعد از اصلاح) (${formImages.length} تصویر):`
                      : `تصاویر و اسکرین‌شات‌های فرآیند (${formImages.length} تصویر):`}
                  </span>
                </label>
                <p className="text-[11px] text-[#75746E] mt-0.5">
                  {hasBeforeImage
                    ? 'تصاویر سامانه جدید، فرم‌های مکانیزه و بهبودهای ایجاد شده. تصویر ۱ کاور اصلی اسلاید است.'
                    : 'می‌توانید ترتیب نمایش تصاویر در اسلاید را با دکمه‌های ◀ / ▶ یا کشیدن و رها کردن تغییر دهید. تصویر ۱ کاور اصلی اسلاید است.'}
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
