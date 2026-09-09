import React, { useState, useEffect, useCallback } from 'react';
import {
  GripVertical,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Building2,
  Calendar,
  Image as ImageIcon,
  Check,
  Sparkles
} from 'lucide-react';
import { ProcessedEraItem } from '../types';

interface SlideReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcessedEraItem[]; // All or active items passed from slideshow
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  onReorder: (newOrders: { id: string; slideNumber: number }[], reorderedItems: ProcessedEraItem[]) => void;
  onToggleSlideItem?: (itemId: string, selected: boolean) => void;
}

const toPersianDigits = (n: number | string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => farsiDigits[+w]);
};

export const SlideReorderModal: React.FC<SlideReorderModalProps> = ({
  isOpen,
  onClose,
  items,
  currentIndex,
  onSelectSlide,
  onReorder,
  onToggleSlideItem
}) => {
  const [filterMode, setFilterMode] = useState<'selected' | 'all'>('selected');
  const [activeList, setActiveList] = useState<ProcessedEraItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync internal list whenever items or filterMode changes
  useEffect(() => {
    if (!Array.isArray(items)) {
      setActiveList([]);
      return;
    }

    let filtered = items;
    if (filterMode === 'selected') {
      const selectedOnly = items.filter(it => it.isSelectedForSlide);
      filtered = selectedOnly.length > 0 ? selectedOnly : items;
    }

    // Sort by slideNumber or slideOrder
    const sorted = [...filtered].sort((a, b) => {
      const numA = a.slideNumber ?? a.slideOrder ?? 999999;
      const numB = b.slideNumber ?? b.slideOrder ?? 999999;
      return numA - numB;
    });

    setActiveList(sorted);
  }, [items, filterMode]);

  // Flash toast message
  const triggerToast = useCallback((msg: string) => {
    setSaveToast(msg);
    const t = setTimeout(() => setSaveToast(null), 2500);
    return () => clearTimeout(t);
  }, []);

  // Perform reorder logic
  const performReorder = useCallback((newList: ProcessedEraItem[], feedbackMsg?: string) => {
    // Assign 1-based sequential slide numbers
    const updatedOrders: { id: string; slideNumber: number }[] = [];
    const updatedItems = newList.map((item, idx) => {
      const newNum = idx + 1;
      updatedOrders.push({ id: item.id, slideNumber: newNum });
      return {
        ...item,
        slideNumber: newNum,
        slideOrder: newNum
      };
    });

    setActiveList(updatedItems);
    onReorder(updatedOrders, updatedItems);
    triggerToast(feedbackMsg || 'ترتیب اسلایدها ذخیره شد.');
  }, [onReorder, triggerToast]);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextList = [...activeList];
    const [movedItem] = nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    performReorder(nextList, `اسلاید «${movedItem.processName}» به رتبه ${toPersianDigits(targetIndex + 1)} منتقل شد.`);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move up / down by 1 step
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const nextList = [...activeList];
    const [movedItem] = nextList.splice(index, 1);
    nextList.splice(index - 1, 0, movedItem);
    performReorder(nextList, `اسلاید یک پله بالاتر قرار گرفت.`);
  };

  const handleMoveDown = (index: number) => {
    if (index >= activeList.length - 1) return;
    const nextList = [...activeList];
    const [movedItem] = nextList.splice(index, 1);
    nextList.splice(index + 1, 0, movedItem);
    performReorder(nextList, `اسلاید یک پله پایین‌تر قرار گرفت.`);
  };

  // Reverse list order
  const handleReverseOrder = () => {
    if (activeList.length < 2) return;
    const reversed = [...activeList].reverse();
    performReorder(reversed, 'ترتیب اسلایدها معکوس شد.');
  };

  // Reset order to default
  const handleResetOrder = () => {
    const sortedDefault = [...activeList].sort((a, b) => a.processName.localeCompare(b.processName, 'fa'));
    performReorder(sortedDefault, 'ترتیب اسلایدها به حالت پیش‌فرض الفبایی مرتب شد.');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100050] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#DDDBCF] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E6DF] bg-[#FAF9F5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#545D4B] text-white shadow-xs">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#2D2C28]">
                  چیدمان و تغییر ترتیب اسلایدها (Drag & Drop)
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF]">
                  {toPersianDigits(activeList.length)} اسلاید
                </span>
              </div>
              <p className="text-xs text-[#75746E] mt-0.5">
                کارت‌ها را با ماوس یا لمس بگیرید و بکشید (درگ و دراپ) تا اولویت پخش اسلایدها تغییر کند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            <button
              onClick={handleReverseOrder}
              disabled={activeList.length < 2}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF] text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              title="معکوس کردن ترتیب کلی اسلایدها"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">معکوس کردن</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] transition cursor-pointer shadow-xs"
              title="بستن پنجره"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Status Toast */}
        <div className="px-4 py-3 bg-white border-b border-[#E8E6DF] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#75746E] font-medium hidden sm:inline">نمایش:</span>
            <div className="flex items-center p-1 bg-[#F4F3EE] rounded-xl border border-[#E8E6DF]">
              <button
                onClick={() => setFilterMode('selected')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterMode === 'selected'
                    ? 'bg-white text-[#2D2C28] shadow-xs'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <span>فقط اسلایدهای فعال</span>
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-[#2D2C28] shadow-xs'
                    : 'text-[#75746E] hover:text-[#2D2C28]'
                }`}
              >
                <span>همه فرآیندها ({toPersianDigits(items.length)})</span>
              </button>
            </div>
          </div>

          {/* Auto-Save & Notification Badge */}
          <div className="flex items-center gap-2">
            {saveToast ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold animate-in fade-in zoom-in duration-150">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{saveToast}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#75746E] font-medium">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>ترتیب جدید به صورت آنی ذخیره می‌شود</span>
              </span>
            )}
          </div>
        </div>

        {/* Draggable Slide Cards Grid / List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F5] space-y-2.5">
          {activeList.length === 0 ? (
            <div className="p-12 text-center text-[#75746E] bg-white rounded-2xl border border-[#DDDBCF]">
              <Layers className="h-10 w-10 mx-auto text-[#C7C5BB] mb-2" />
              <p className="font-bold text-sm">هیچ اسلایدی برای مرتب‌سازی یافت نشد.</p>
              <p className="text-xs mt-1">
                لطفاً ابتدا از تب «فرآیندهای اصلاحی و توسعه‌ای»، فرآیندهای مورد نظر خود را برای نمایش اسلایدی تیک بزنید.
              </p>
            </div>
          ) : (
            activeList.map((item, idx) => {
              const isCurrent = currentIndex === idx;
              const isBeingDragged = draggedIndex === idx;
              const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;
              const firstImage = item.formImages?.[0] || item.formImageUrl;

              return (
                <div
                  key={`reorder-card-${item.id || idx}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-2xl border transition-all duration-150 p-3 sm:p-3.5 flex items-center justify-between gap-3 select-none ${
                    isBeingDragged
                      ? 'opacity-30 scale-[0.98] border-dashed border-[#545D4B] bg-[#EFEFEA] shadow-inner'
                      : isDropTarget
                      ? 'bg-emerald-50/80 border-[#545D4B] ring-2 ring-[#545D4B] scale-[1.01] shadow-md'
                      : isCurrent
                      ? 'bg-white border-[#545D4B] ring-1 ring-[#545D4B]/30 shadow-sm'
                      : 'bg-white hover:bg-[#FAF9F5] border-[#DDDBCF] hover:border-[#C7C5BB] shadow-2xs'
                  }`}
                >
                  {/* Right Side: Drag Handle, Number Badge & Thumbnail */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Visual Drag Handle */}
                    <div
                      className="p-1.5 rounded-lg text-[#C7C5BB] group-hover:text-[#545D4B] hover:bg-[#EFEFEA] transition cursor-grab active:cursor-grabbing shrink-0"
                      title="بگیرید و به بالا یا پایین بکشید"
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Order Number Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 min-w-[36px]">
                      <span className="w-8 h-8 rounded-xl bg-[#F4F3EE] group-hover:bg-[#545D4B] group-hover:text-white text-[#2D2C28] font-black text-sm flex items-center justify-center border border-[#DDDBCF] transition shadow-2xs">
                        {toPersianDigits(idx + 1)}
                      </span>
                      <span className="text-[9px] text-[#75746E] font-medium mt-0.5">اولویت</span>
                    </div>

                    {/* Thumbnail Image or Process Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#DDDBCF] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={item.processName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-[#8A8880]" />
                      )}
                    </div>

                    {/* Process Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-[#2D2C28] truncate max-w-xs sm:max-w-md">
                          {item.processName}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                            در حال نمایش
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-[#75746E] mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Building2 className="h-3 w-3 text-[#545D4B]" />
                          <span>{item.orgUnit}</span>
                        </span>
                        {item.executionDate && (
                          <span className="hidden sm:flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3 text-[#545D4B]" />
                            <span>{toPersianDigits(item.executionDate)}</span>
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EFEFEA] text-[#545D4B] font-medium">
                          {item.operationType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left Side: Step Movement Buttons & Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Slide Active Checkbox (if in 'all' filter mode) */}
                    {filterMode === 'all' && onToggleSlideItem && (
                      <button
                        onClick={() => onToggleSlideItem(item.id, !item.isSelectedForSlide)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          item.isSelectedForSlide
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-[#F4F3EE] text-[#75746E] border-[#DDDBCF] hover:bg-[#EFEFEA]'
                        }`}
                        title={item.isSelectedForSlide ? 'حذف از اسلایدشو' : 'افزودن به اسلایدشو'}
                      >
                        <Check className={`h-3.5 w-3.5 ${item.isSelectedForSlide ? 'opacity-100' : 'opacity-40'}`} />
                        <span className="hidden sm:inline text-[10px]">
                          {item.isSelectedForSlide ? 'فعال' : 'غیرفعال'}
                        </span>
                      </button>
                    )}

                    {/* Quick Move Up Button */}
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                      title="یک رتبه بالاتر"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    {/* Quick Move Down Button */}
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === activeList.length - 1}
                      className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                      title="یک رتبه پایین‌تر"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    {/* Jump To Slide in Presentation */}
                    <button
                      onClick={() => {
                        onSelectSlide(idx);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                      title="نمایش این اسلاید در پرزنتیشن"
                    >
                      <Eye className="h-3.5 w-3.5 text-white/90" />
                      <span className="hidden md:inline">نمایش</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E8E6DF] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#75746E]">
            <Sparkles className="h-4 w-4 text-[#545D4B]" />
            <span>ترتیب جدید بلافاصله در فایل خروجی HTML و پرزنتیشن لحاظ می‌شود.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetOrder}
              className="px-3 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EFEFEA] text-[#75746E] hover:text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition cursor-pointer"
            >
              مرتب‌سازی الفبایی
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
            >
              تأیید و بازگشت به ارائه
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
