import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Presentation,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Building2,
  Calendar,
  FileCheck2,
  Wrench,
  Layers,
  FileText,
  Printer,
  Copy,
  Check,
  Sliders,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BarChart2,
  Image as ImageIcon,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Trash2,
  Download,
  Eye,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { ProcessedEraItem } from '../types';
import {
  ProcessPresentationDetail,
  getProcessPresentation,
  PRESET_PROCESS_PRESENTATIONS
} from '../data/presentationTemplates';
import { api } from '../services/api';

interface ProcessPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProcessedEraItem | null;
  allItems?: ProcessedEraItem[];
  onSelectItem?: (item: ProcessedEraItem) => void;
  onUpdateItem?: (item: Partial<ProcessedEraItem>) => void;
}

export const ProcessPresentationModal: React.FC<ProcessPresentationModalProps> = ({
  isOpen,
  onClose,
  item,
  allItems = [],
  onSelectItem,
  onUpdateItem
}) => {
  const [activeSlide, setActiveSlide] = useState<'overview' | 'before_after' | 'problem_solution' | 'impact'>('before_after');
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slides' | 'one_page'>('slides');

  // Presentation Data
  const [presentation, setPresentation] = useState<ProcessPresentationDetail | null>(null);

  // Form Screenshots (Multi-image support)
  const [formImages, setFormImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Lightbox Modal States
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string>('');
  const [lightboxTitle, setLightboxTitle] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Upload Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSavingImages, setIsSavingImages] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      const generated = getProcessPresentation(
        item.processName,
        item.orgUnit,
        item.operationType,
        item.description
      );
      setPresentation(generated);
      
      // Load saved images first from item props if already present
      let initialImgs: string[] = [];
      if (item.formImages && Array.isArray(item.formImages) && item.formImages.length > 0) {
        initialImgs = item.formImages;
      } else if (item.formImageUrl) {
        initialImgs = [item.formImageUrl];
      } else if (generated.formImages && generated.formImages.length > 0) {
        initialImgs = generated.formImages;
      } else if (generated.formImageUrl) {
        initialImgs = [generated.formImageUrl];
      }

      setFormImages(initialImgs);
      setSelectedImageIndex(0);

      // Asynchronously fetch latest images directly from SQLite database table
      if (item.id) {
        api.getProcessImages(item.id).then(dbImages => {
          if (dbImages && dbImages.length > 0) {
            setFormImages(dbImages);
          }
        }).catch(err => console.error('SQLite image fetch error:', err));
      }

      // Default view based on type
      if (item.operationType === 'جدید' || generated.category === 'form_creation') {
        setActiveSlide('before_after');
      } else {
        setActiveSlide('problem_solution');
      }
    }
  }, [item]);

  // Global Paste Listener (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                addFormImages([base64]);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, item, formImages]);

  if (!isOpen || !item || !presentation) return null;

  const isAuto = item.operationType === 'اتوماتیک‌سازی' || item.operationType === 'اتوماتیک سازی';
  const isCreation = (presentation.category === 'form_creation' || item.operationType === 'جدید') && !isAuto;

  // Navigation between items
  const currentIndex = allItems.findIndex(i => i.id === item.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex !== -1 && currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  const addFormImages = async (newImages: string[]) => {
    const updated = [...formImages, ...newImages];
    setFormImages(updated);
    setIsSavingImages(true);
    try {
      // Save directly into SQLite ProcessImage table
      await api.saveProcessImages(item.id, updated, item.processName);
    } catch (e) {
      console.error('Error saving image to SQLite:', e);
    } finally {
      setIsSavingImages(false);
    }

    if (onUpdateItem) {
      onUpdateItem({
        id: item.id,
        formImageUrl: updated[0] || undefined,
        formImages: updated
      });
    }
  };

  const removeFormImage = async (indexToRemove: number) => {
    const updated = formImages.filter((_, idx) => idx !== indexToRemove);
    setFormImages(updated);
    if (selectedImageIndex >= updated.length) {
      setSelectedImageIndex(Math.max(0, updated.length - 1));
    }
    setIsSavingImages(true);
    try {
      // Update directly in SQLite database
      await api.saveProcessImages(item.id, updated, item.processName);
    } catch (e) {
      console.error('Error updating image in SQLite:', e);
    } finally {
      setIsSavingImages(false);
    }

    if (onUpdateItem) {
      onUpdateItem({
        id: item.id,
        formImageUrl: updated[0] || undefined,
        formImages: updated
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const readPromises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newImages => {
      if (newImages.length > 0) {
        addFormImages(newImages);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      const readPromises = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readPromises).then(newImages => {
        if (newImages.length > 0) {
          addFormImages(newImages);
        }
      });
    }
  };

  const handleOpenLightbox = (imgUrl: string, title: string) => {
    setLightboxImageUrl(imgUrl);
    setLightboxTitle(title);
    setZoomLevel(1);
    setRotation(0);
    setIsLightboxOpen(true);
  };

  const handleCopySummary = () => {
    let text = `🎯 گزارش ارائه مدیریتی فرآیند: ${item.processName} (${item.orgUnit})\n`;
    text += `📅 تاریخ اجرا: ${item.executionDate} | نوع اقدام: ${item.operationType}\n\n`;
    text += `📌 خلاصه اجرایی:\n${presentation.summarySentence || item.description}\n\n`;

    const customAchievements = item.achievements
      || (typeof window !== 'undefined' ? localStorage.getItem(`era_achievements_${item.id}`) : null);
    
    let achievementsList: string[] = [];
    if (customAchievements) {
      if (Array.isArray(customAchievements)) {
        achievementsList = customAchievements.map(b => (typeof b === 'string' ? b.replace(/^[•\-\*✓\d\.]+\s*/, '').trim() : '')).filter(b => b.length > 0);
      } else if (typeof customAchievements === 'string') {
        achievementsList = customAchievements.split('\n').map(l => l.replace(/^[•\-\*✓\d\.]+\s*/, '').trim()).filter(l => l.length > 0);
      }
    }

    if (isCreation) {
      text += `🔴 وضعیت قبل از ایجاد فرم:\n${presentation.beforeDescription}\n`;
      text += `چالش‌ها:\n` + (presentation.beforePainPoints?.map(p => ` - ${p}`).join('\n') || '') + '\n\n';
      text += `🟢 وضعیت بعد از ایجاد فرم و مکانیزه‌سازی:\n${presentation.afterDescription}\n`;
      const finalImprovements = achievementsList.length > 0 ? achievementsList : (presentation.afterImprovements || []);
      text += `بهبودها و ارزش افزوده برای شرکت:\n` + (finalImprovements.map(p => ` - ${p}`).join('\n') || '') + '\n\n';
      if (presentation.quantifiableImpact) {
        text += `📊 نتایج کمی و قابل سنجش:\n`;
        if (presentation.quantifiableImpact.timeReduction) text += ` • سرعت: ${presentation.quantifiableImpact.timeReduction}\n`;
        if (presentation.quantifiableImpact.errorReduction) text += ` • دقت: ${presentation.quantifiableImpact.errorReduction}\n`;
        if (presentation.quantifiableImpact.paperElimination) text += ` • کاغذ: ${presentation.quantifiableImpact.paperElimination}\n`;
      }
    } else {
      text += `⚠️ مشکلات و چالش‌های اولیه فرآیند:\n` + (presentation.identifiedProblems?.map(p => ` - ${p}`).join('\n') || '') + '\n\n';
      text += `🛠 راهکار و اصلاحات اعمال شده توسط IT:\n${presentation.solutionApplied}\n\n`;
      const finalSolved = achievementsList.length > 0 ? achievementsList : (presentation.solvedOutcomes || []);
      text += `✅ مشکلات حل شده و دستاوردها:\n` + (finalSolved.map(p => ` - ${p}`).join('\n') || '') + '\n\n';
      if (presentation.preventedIssues) {
        text += `🛡️ پیشگیری از خسارت/ریسک:\n${presentation.preventedIssues}\n`;
      }
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeImage = formImages[selectedImageIndex] || formImages[0] || '';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0F172A]/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-[#FAFAF7] rounded-3xl shadow-2xl border border-[#DDDBCF] overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Modal Top Header with Executive Controls */}
          <div className="bg-[#1E293B] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] text-white shadow-md">
                <Presentation className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {isCreation ? 'بسته ارائه ایجاد فرم و مکانیزاسیون' : 'بسته ارائه بازمهندسی و اصلاح فرآیند'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{item.executionDate}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  ارائه مدیریتی: {item.processName}
                </h2>
              </div>
            </div>

            {/* Top Actions: Copy, Print, View Mode & Close */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center bg-[#0F172A] p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  onClick={() => setViewMode('slides')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'slides' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  اسلایدی (پرزنتیشن)
                </button>
                <button
                  onClick={() => setViewMode('one_page')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'one_page' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  تک‌صفحه‌ای (گزارش کامل)
                </button>
              </div>

              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                title="کپی متن خلاصه برای ارسال در پیام‌رسان یا ایمیل مدیر"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                <span>{copied ? 'کپی شد' : 'کپی خلاصه متن'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer hidden sm:block"
                title="چاپ یا خروجی PDF"
              >
                <Printer className="h-4 w-4" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500 hover:text-white text-slate-400 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub-header Badges & Navigation Bar */}
          <div className="bg-[#EFEFEA] px-6 py-2.5 border-b border-[#DDDBCF] flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="flex items-center gap-1 font-bold text-[#2D2C28] bg-white px-2.5 py-1 rounded-lg border border-[#DDDBCF]">
                <Building2 className="h-3.5 w-3.5 text-[#545D4B]" />
                واحد: {item.orgUnit}
              </span>
              <span className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg border ${
                isAuto
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : isCreation
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-[#FDF6F0] text-[#7C3E1D] border-[#E8D5C4]'
              }`}>
                {isAuto ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> : isCreation ? <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> : <Wrench className="h-3.5 w-3.5 text-[#7C3E1D]" />}
                <span>نوع عملیات: {isAuto ? 'اتوماتیک‌سازی هوشمند' : isCreation ? 'ایجاد فرم و فرآیند جدید' : 'اصلاح و توسعه فرآیند'}</span>
              </span>

              {/* Photo Status Pill */}
              {formImages.length > 0 && (
                <span className="flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span>{formImages.length} تصویر پیوست</span>
                </span>
              )}
            </div>

            {/* Previous / Next Process in list */}
            {onSelectItem && allItems.length > 1 && (
              <div className="flex items-center gap-1.5 font-bold">
                <button
                  disabled={!nextItem}
                  onClick={() => nextItem && onSelectItem(nextItem)}
                  className="p-1 rounded-lg bg-white border border-[#DDDBCF] text-[#545D4B] hover:bg-[#E2E0D8] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="فرآیند بعدی"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-[11px] text-[#75746E]">
                  {currentIndex + 1} از {allItems.length}
                </span>
                <button
                  disabled={!prevItem}
                  onClick={() => prevItem && onSelectItem(prevItem)}
                  className="p-1 rounded-lg bg-white border border-[#DDDBCF] text-[#545D4B] hover:bg-[#E2E0D8] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="فرآیند قبلی"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content Body: Either Slide Presentation or Full One-Page Report */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Executive Summary Hero Banner (Always visible) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] text-white p-5 sm:p-6 border border-slate-700 shadow-lg">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-black">
                  <Zap className="h-4 w-4 animate-pulse" />
                  <span>پیام کلیدی برای جلسه با مدیریت ارشد</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-100 leading-relaxed">
                  «{presentation.summarySentence || item.description}»
                </p>
                <p className="text-xs text-slate-400 leading-normal pt-1">
                  توضیحات ثبت شده در سامانه: <span className="text-slate-300 font-medium">{item.description}</span>
                </p>
              </div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* ========================================================================= */}
            {/* PHOTO & SCREENSHOT SHOWCASE SECTION (MULTI-IMAGE SUPPORT) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#DDDBCF] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#2D2C28]">
                      مستندات تصویری و اسکرین‌شات‌های سامانه ERA ({formImages.length} تصویر)
                    </h3>
                    <p className="text-[11px] text-[#75746E]">
                      می‌توانید چندین تصویر و اسکرین‌شات از بخش‌های مختلف فرم اضافه نمایید (یا با Ctrl+V الصاق کنید)
                    </p>
                  </div>
                </div>

                {/* Upload & Actions Buttons */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    {isSavingImages ? 'در حال ذخیره در دیتابیس SQLite...' : 'ذخیره مستقیم در دیتابیس SQLite'}
                  </span>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>افزودن تصویر / اسکرین‌شات</span>
                  </button>

                  {activeImage && (
                    <button
                      onClick={() => handleOpenLightbox(activeImage, `تصویر فرم الکترونیکی: ${item.processName} (عکس ${selectedImageIndex + 1})`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFEFEA] hover:bg-[#E2E0D8] text-[#2D2C28] text-xs font-bold rounded-xl border border-[#DDDBCF] transition cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-[#545D4B]" />
                      <span>تمام صفحه</span>
                    </button>
                  )}

                  {activeImage && (
                    <button
                      onClick={() => removeFormImage(selectedImageIndex)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="حذف این تصویر از دیتابیس"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden File Input (Supports Multiple) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Multiple Images Carousel / Thumbnails and Main Display */}
              {formImages.length > 0 ? (
                <div className="space-y-3">
                  {/* Thumbnails Row if more than 1 image */}
                  {formImages.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {formImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative rounded-xl overflow-hidden h-16 w-24 border-2 shrink-0 transition-all cursor-pointer ${
                            selectedImageIndex === idx
                              ? 'border-blue-600 ring-2 ring-blue-400/40 scale-105 shadow-md'
                              : 'border-[#DDDBCF] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`عکس ${idx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-16 w-20 rounded-xl border-2 border-dashed border-[#DDDBCF] hover:border-[#545D4B] flex flex-col items-center justify-center text-[#75746E] hover:text-[#2D2C28] shrink-0 text-[10px] font-bold transition cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mb-0.5" />
                        <span>افزودن</span>
                      </button>
                    </div>
                  )}

                  {/* Main Large Image Stage */}
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-blue-200 bg-slate-900/5 shadow-inner flex items-center justify-center min-h-[280px] max-h-[500px]">
                    <img
                      src={activeImage}
                      alt={`اسکرین شات ${item.processName}`}
                      className="w-full h-full object-contain max-h-[480px] transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    
                    {/* Zoom / Lightbox Overlay on Hover */}
                    <div 
                      onClick={() => handleOpenLightbox(activeImage, `اسکرین‌شات فرم: ${item.processName} (عکس ${selectedImageIndex + 1})`)}
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer text-white"
                    >
                      <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-xl">
                        <ZoomIn className="h-7 w-7 text-white" />
                      </div>
                      <span className="font-bold text-xs bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                        برای بزرگ‌نمایی و نمایش تمام‌صفحه کلیک کنید
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-[#1E293B]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 shadow-md">
                      <Sparkles className="h-3 w-3 text-blue-400" />
                      <span>فرم مکانیزه در سامانه ERA {formImages.length > 1 ? `(عکس ${selectedImageIndex + 1} از ${formImages.length})` : ''}</span>
                    </div>

                    {/* Left/Right controls inside main preview when multiple */}
                    {formImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : formImages.length - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition shadow-lg cursor-pointer"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(prev => (prev < formImages.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition shadow-lg cursor-pointer"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Zone when No Image Uploaded */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? 'border-[#3B82F6] bg-blue-50/50'
                      : 'border-[#DDDBCF] hover:border-[#545D4B] bg-[#FAFAF7] hover:bg-white'
                  }`}
                >
                  <div className="p-3.5 rounded-2xl bg-[#EFEFEA] text-[#545D4B] shadow-xs">
                    <UploadCloud className="h-8 w-8 text-[#545D4B]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#2D2C28]">
                      افزودن عکس یا اسکرین‌شات‌های فرم ایجاد شده
                    </h4>
                    <p className="text-xs text-[#75746E]">
                      فایل‌های عکس را اینجا بکشید و رها کنید، یا کلیک کرده و انتخاب نمایید (یا در این صفحه <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Ctrl+V</kbd> بزنید)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>امکان بارگذاری چندین تصویر به صورت همزمان (PNG، JPG و WEBP)</span>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* CASE 1: FORMS / CREATION MODE (قبل از ایجاد vs بعد از ایجاد) */}
            {/* ========================================================================= */}
            {isCreation ? (
              <div className="space-y-6">
                {/* Before & After 2-Column Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* 🔴 BEFORE (قبل از ایجاد فرم) */}
                  <div className="bg-[#FEF2F2] rounded-3xl p-5 border-2 border-[#FECACA] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-3 border-b border-[#FCA5A5]/40">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            قبل
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-[#991B1B]">
                              وضعیت کارها قبل از ایجاد فرم
                            </h3>
                            <span className="text-[11px] text-rose-700/80">شیوه سنتی، دستی و نامتمرکز</span>
                          </div>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                      </div>

                      <div className="bg-white/80 rounded-2xl p-3.5 border border-rose-200 text-xs text-rose-950 leading-relaxed font-medium">
                        {item.problemDescription?.trim() || presentation.beforeDescription}
                      </div>

                      {/* Pain Points List */}
                      {presentation.beforePainPoints && presentation.beforePainPoints.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-black text-rose-900 block">
                            چالش‌ها و معایب فرآیند قبلی:
                          </span>
                          <ul className="space-y-1.5 text-xs text-rose-900">
                            {presentation.beforePainPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2 bg-white/60 p-2 rounded-xl border border-rose-100">
                                <span className="text-rose-600 font-black shrink-0 mt-0.5">✕</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-rose-200/60 text-[11px] text-rose-700 font-bold flex items-center gap-1.5">
                      <span>⚠️ نتیجه روش قبل:</span>
                      <span>اتلاف زمان، خطای محاسباتی و نبود پیگیری شفاف</span>
                    </div>
                  </div>

                  {/* 🟢 AFTER (بعد از ایجاد فرم در ERA) */}
                  <div className="bg-[#F0FDF4] rounded-3xl p-5 border-2 border-[#BBF7D0] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-3 border-b border-[#86EFAC]/40">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            بعد
                          </span>
                          <div>
                            <h3 className="text-sm font-black text-[#166534]">
                              وضعیت کارها بعد از ایجاد فرم ERA
                            </h3>
                            <span className="text-[11px] text-emerald-700/80">فرآیند تمام مکانیزه و استاندارد</span>
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>

                      <div className="bg-white/80 rounded-2xl p-3.5 border border-emerald-200 text-xs text-emerald-950 leading-relaxed font-medium">
                        {item.solutionDescription?.trim() || presentation.afterDescription}
                      </div>

                      {/* Improvements & Values List */}
                      {(() => {
                        const customAchievements = item.achievements
                          || (typeof window !== 'undefined' ? localStorage.getItem(`era_achievements_${item.id}`) : null);
                        let customList: string[] = [];
                        if (customAchievements) {
                          if (Array.isArray(customAchievements)) {
                            customList = customAchievements.map(b => (typeof b === 'string' ? b.replace(/^[•\-\*✓\d\.]+\s*/, '').trim() : '')).filter(b => b.length > 0);
                          } else if (typeof customAchievements === 'string') {
                            customList = customAchievements.split('\n').map(l => l.replace(/^[•\-\*✓\d\.]+\s*/, '').trim()).filter(l => l.length > 0);
                          }
                        }
                        const finalImprovements = customList.length > 0 ? customList : (presentation.afterImprovements || []);

                        return finalImprovements.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <span className="text-xs font-black text-emerald-900 block">
                              بهبودها و دستاوردهای ثبت‌شده فرآیند:
                            </span>
                            <ul className="space-y-1.5 text-xs text-emerald-900">
                              {finalImprovements.map((imp, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-white/70 p-2 rounded-xl border border-emerald-100 font-medium">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                      <span>✨ دستاورد نهایی:</span>
                      <span>سرعت بالا، کنترل آنلاین و گزارش لحظه‌ای مدیریت</span>
                    </div>
                  </div>
                </div>

                {/* Quantifiable Impact Cards */}
                {presentation.quantifiableImpact && (
                  <div className="bg-white rounded-3xl p-5 border border-[#DDDBCF] shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#545D4B]" />
                      <h4 className="text-xs font-bold text-[#2D2C28]">
                        شاخص‌های کلیدی عملکرد و نتایج قابل سنجش (KPI Impact):
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-[#FAFAF7] rounded-2xl p-3.5 border border-[#E8E6DF] flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#75746E] font-bold block">بهبود زمان و سرعت فرآیند</span>
                          <span className="text-xs font-black text-blue-950">{presentation.quantifiableImpact.timeReduction}</span>
                        </div>
                      </div>

                      <div className="bg-[#FAFAF7] rounded-2xl p-3.5 border border-[#E8E6DF] flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#75746E] font-bold block">دقت و کاهش خطای انسانی</span>
                          <span className="text-xs font-black text-emerald-950">{presentation.quantifiableImpact.errorReduction}</span>
                        </div>
                      </div>

                      <div className="bg-[#FAFAF7] rounded-2xl p-3.5 border border-[#E8E6DF] flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                          <FileCheck2 className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-[#75746E] font-bold block">حذف کاغذ و شفافیت سازمانی</span>
                          <span className="text-xs font-black text-purple-950">{presentation.quantifiableImpact.paperElimination}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ========================================================================= */
              /* CASE 2: PROCESS FIX & REFORM MODE (مشکلات موجود -> راهکار -> رفع مشکل) */
              /* ========================================================================= */
              <div className="space-y-6">
                
                {/* Step 1: Problems identified in previous process */}
                <div className="bg-[#FFFBEB] rounded-3xl p-5 border-2 border-[#FDE68A] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                        ۱
                      </span>
                      <h3 className="text-sm font-black text-amber-900">
                        مشکلات و گلوگاه‌های شناسایی شده در فرآیند اولیه
                      </h3>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>

                  {item.problemDescription?.trim() ? (
                    <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 text-amber-950 text-xs font-medium leading-relaxed">
                      {item.problemDescription.trim()}
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {presentation.identifiedProblems?.map((prob, idx) => (
                        <li key={idx} className="bg-white/80 p-3 rounded-2xl border border-amber-200/80 text-amber-950 flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-medium leading-relaxed">{prob}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Step 2: Technical Solution Applied by IT */}
                <div className="bg-[#EFF6FF] rounded-3xl p-5 border-2 border-[#BFDBFE] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                        ۲
                      </span>
                      <h3 className="text-sm font-black text-blue-900">
                        اقدام اصلاحی و راهکار مهندسی اعمال شده توسط فناوری اطلاعات
                      </h3>
                    </div>
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>

                  <div className="bg-white/90 p-4 rounded-2xl border border-blue-200 text-xs text-blue-950 font-medium leading-relaxed">
                    {item.solutionDescription?.trim() || presentation.solutionApplied}
                  </div>
                </div>

                {/* Step 3: Problems Solved and Positive Outcomes */}
                <div className="bg-[#F0FDF4] rounded-3xl p-5 border-2 border-[#BBF7D0] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                        ۳
                      </span>
                      <h3 className="text-sm font-black text-emerald-900">
                        مشکلات حل شده و دستاوردهای حاصل از اصلاح فرآیند
                      </h3>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>

                  <ul className="space-y-2 text-xs">
                    {(() => {
                      const customAchievements = item.achievements
                        || (typeof window !== 'undefined' ? localStorage.getItem(`era_achievements_${item.id}`) : null);
                      let customList: string[] = [];
                      if (customAchievements) {
                        if (Array.isArray(customAchievements)) {
                          customList = customAchievements.map(b => (typeof b === 'string' ? b.replace(/^[•\-\*✓\d\.]+\s*/, '').trim() : '')).filter(b => b.length > 0);
                        } else if (typeof customAchievements === 'string') {
                          customList = customAchievements.split('\n').map(l => l.replace(/^[•\-\*✓\d\.]+\s*/, '').trim()).filter(l => l.length > 0);
                        }
                      }
                      const finalOutcomes = customList.length > 0 ? customList : (presentation.solvedOutcomes || []);
                      return finalOutcomes.map((outcome, idx) => (
                        <li key={idx} className="bg-white/90 p-3 rounded-2xl border border-emerald-200 text-emerald-950 flex items-start gap-2.5 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{outcome}</span>
                        </li>
                      ));
                    })()}
                  </ul>

                  {presentation.preventedIssues && (
                    <div className="mt-3 p-3 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2 font-bold">
                      <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>پیشگیری از تبعات: {presentation.preventedIssues}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manager Presentation Tips Box */}
            <div className="bg-[#FAFAF7] rounded-2xl p-4 border border-[#DDDBCF] text-xs flex items-start gap-3 text-[#5A5852]">
              <div className="p-2 rounded-xl bg-[#EFEFEA] text-[#545D4B] shrink-0 mt-0.5">
                <Presentation className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-[#2D2C28] block">💡 راهنمای ارائه در جلسه با مدیر:</span>
                <p className="leading-relaxed">
                  {isCreation
                    ? 'روی تصاویر فرم دیجیتال و صرفه‌جویی زمانی کارکنان، حذف چرخه کاغذی و کنترل آنلاین مدیران روی فرآیند تأکید کنید.'
                    : 'روی رفع قطعی خطای سیستمی، جلوگیری از دوباره‌کاری پرسنل و تسریع در گزارش‌گیری تمرکز نمایید.'}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-[#EFEFEA] px-6 py-3.5 border-t border-[#DDDBCF] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-[#75746E]">
              سامانه تحلیل فرآیندها و هوش تجاری IT • گزارش استاندارد مدیریتی ERA
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#E2E0D8] text-[#2D2C28] text-xs font-bold border border-[#DDDBCF] transition cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-[#545D4B]" />
                <span>کپی متن گزارش</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIGH-RES LIGHTBOX MODAL WITH ZOOM & PAN CONTROLS */}
      {/* ========================================================================= */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          
          {/* Lightbox Header Bar */}
          <div className="bg-slate-900/90 text-white px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{lightboxTitle}</h3>
                <span className="text-[11px] text-slate-400">سامانه ERA - واحد {item.orgUnit}</span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                title="بزرگ‌نمایی"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                title="کوچک‌نمایی"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setZoomLevel(1); setRotation(0); }}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition cursor-pointer"
                title="اندازه طبیعی (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                title="چرخش ۹۰ درجه"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <div className="h-5 w-px bg-slate-700 mx-1" />

              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                title="بستن (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 select-none">
            <div 
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={lightboxImageUrl}
                alt={lightboxTitle}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>
          </div>

          {/* Lightbox Footer Bar */}
          <div className="bg-slate-900/90 text-slate-400 px-6 py-2.5 flex items-center justify-between text-xs border-t border-slate-800 shrink-0">
            <span>برای بزرگ‌نمایی از دکمه‌های بالا یا کلیدهای جهت‌نما استفاده کنید</span>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = lightboxImageUrl;
                a.download = `ERA-Form-${item.processName}.png`;
                a.click();
              }}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>دانلود عکس اسکرین‌شات</span>
            </button>
          </div>

        </div>
      )}
    </>
  );
};
