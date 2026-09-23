import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Presentation,
  Building2,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  MoveHorizontal,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProcessedEraItem } from '../types';
import { api } from '../services/api';
import { RichTextDisplay } from './RichTextDisplay';

interface EraSlideHoverPreviewProps {
  item: ProcessedEraItem;
  slideBeforeAfterUnderImage?: boolean;
  onOpenFullscreen: () => void;
  onClose: () => void;
}

export const EraSlideHoverPreview: React.FC<EraSlideHoverPreviewProps> = ({
  item,
  slideBeforeAfterUnderImage = true,
  onOpenFullscreen,
  onClose
}) => {
  const [formImages, setFormImages] = useState<string[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0); // 1 = next (left), -1 = prev (right)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverSubTab, setHoverSubTab] = useState<'visual' | 'comparison'>('visual');
  
  const modalRef = useRef<HTMLDivElement>(null);

  // Global mouseup/pointerup safety handler to ensure drag state never gets stuck
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('mouseup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('mouseup', handleGlobalPointerUp);
    };
  }, []);

  useEffect(() => {
    // Initial images from item props
    let initialImgs: string[] = [];
    if (item.formImages && Array.isArray(item.formImages) && item.formImages.length > 0) {
      initialImgs = item.formImages.filter(Boolean);
    } else if (item.formImageUrl) {
      initialImgs = [item.formImageUrl];
    }

    setFormImages(initialImgs);
    setActiveImageIdx(0);

    // Asynchronously fetch latest images directly from database table for this process
    if (item.id) {
      api.getProcessImages(item.id).then(imgs => {
        if (imgs && imgs.length > 0) {
          setFormImages(imgs);
        }
      }).catch(() => {});
    }
  }, [item]);

  // Keyboard navigation for images & escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && formImages.length > 1) {
        setDirection(-1);
        setActiveImageIdx(p => (p > 0 ? p - 1 : formImages.length - 1));
      } else if (e.key === 'ArrowLeft' && formImages.length > 1) {
        setDirection(1);
        setActiveImageIdx(p => (p < formImages.length - 1 ? p + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formImages.length, onClose]);

  // Extract purely database/record-driven before and after texts
  const beforeText = item.problemDescription?.trim() || '';
  const afterSolutionText = item.solutionDescription?.trim() || item.description?.trim() || '';

  // Extract achievements strictly from database/record if saved
  const customAchievements = item.achievements || (typeof window !== 'undefined' ? localStorage.getItem(`era_achievements_${item.id}`) : null);
  let achievementsList: string[] = [];
  if (customAchievements) {
    if (Array.isArray(customAchievements)) {
      achievementsList = customAchievements
        .map(b => (typeof b === 'string' ? b.replace(/^[•\-\*✓\d\.]+\s*/, '').trim() : ''))
        .filter(b => b.length > 0);
    } else if (typeof customAchievements === 'string') {
      achievementsList = customAchievements
        .split('\n')
        .map(l => l.replace(/^[•\-\*✓\d\.]+\s*/, '').trim())
        .filter(l => l.length > 0);
    }
  }

  const isAuto = item.operationType === 'اتوماتیک‌سازی' || item.operationType === 'اتوماتیک سازی';
  const isCreation = item.operationType === 'جدید';

  // Smooth swipe drag end handler with inverted direction (Drag right -> next image, Drag left -> previous image)
  const handleDragEnd = useCallback((_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    setIsDragging(false);
    if (formImages.length <= 1) return;
    
    const swipeThreshold = 40;
    const vx = info.velocity.x;
    const ox = info.offset.x;

    // Dragging right (ox > 0) -> Go to next image (عکس بعدی)
    if (ox > swipeThreshold || vx > 200) {
      setDirection(-1);
      setActiveImageIdx(p => (p < formImages.length - 1 ? p + 1 : 0));
    } 
    // Dragging left (ox < 0) -> Go to previous image (عکس قبلی)
    else if (ox < -swipeThreshold || vx < -200) {
      setDirection(1);
      setActiveImageIdx(p => (p > 0 ? p - 1 : formImages.length - 1));
    }
  }, [formImages.length]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0,
      opacity: 0.2,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : dir < 0 ? '100%' : 0,
      opacity: 0.2,
      scale: 0.95
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-3"
      dir="rtl"
      onMouseMove={(e) => {
        if (!isDragging && modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      onClick={(e) => {
        if (!isDragging && modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      {/* 80% Screen Width and 95% Screen Height Container with Smooth Spring & Exit Animation */}
      <motion.div
        ref={modalRef}
        onMouseLeave={() => {
          if (!isDragging) {
            onClose();
          }
        }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1]
        }}
        className="w-[80vw] h-[95vh] min-w-[320px] bg-[#F9F8F6] text-[#2D2C28] rounded-3xl shadow-2xl border-2 border-[#DDDBCF] overflow-hidden flex flex-col relative select-none"
      >
        {/* Compact Header: Process Info, Org Unit, Actions */}
        <div className="bg-[#545D4B] text-white px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 border-b border-[#434A3C] shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-xl bg-white/15 border border-white/25 text-white shrink-0">
              <Presentation className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shrink-0">
                {isAuto ? 'اتوماتیک‌سازی هوشمند' : isCreation ? 'ایجاد فرآیند جدید' : 'اصلاح و توسعه فرآیند'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate" title={item.processName}>
                {item.processName}
              </h3>
              <span className="text-xs text-white/80 flex items-center gap-1 shrink-0">
                <Building2 className="h-3.5 w-3.5 text-white/70" />
                <span className="font-bold">{item.orgUnit}</span>
              </span>
              {item.executionDate && (
                <span className="text-xs text-white/70 flex items-center gap-1 font-mono shrink-0 hidden md:flex">
                  <Calendar className="h-3.5 w-3.5 text-white/60" />
                  <span>{item.executionDate}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!slideBeforeAfterUnderImage && (
              <div className="flex items-center bg-black/20 p-0.5 rounded-xl border border-white/20 text-xs">
                <button
                  type="button"
                  onClick={() => setHoverSubTab('visual')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                    hoverSubTab === 'visual'
                      ? 'bg-white text-[#2D2C28] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>اسکرین‌شات‌ها</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHoverSubTab('comparison')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
                    hoverSubTab === 'comparison'
                      ? 'bg-white text-[#2D2C28] shadow-xs'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>مقایسه قبل و بعد</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white text-white hover:text-[#545D4B] text-xs font-bold border border-white/30 transition cursor-pointer shadow-xs"
              title="مشاهده اسلاید کامل با ابزارهای ویرایش، چاپ و کپی"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">مشاهده تمام‌صفحه</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white text-white/80 transition cursor-pointer"
              title="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: 85% Height for Images + 15% Height for Before/After */}
        <div className="flex-1 p-3 sm:p-3.5 overflow-hidden flex flex-col gap-2.5">
          
          {/* TOP SECTION: IMAGES VIEWER */}
          {(slideBeforeAfterUnderImage || hoverSubTab === 'visual') && (
            <div className={`${slideBeforeAfterUnderImage ? 'h-[85%]' : 'h-full'} bg-white rounded-2xl p-2.5 sm:p-3 border border-[#DDDBCF] shadow-xs flex flex-col overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#E8E6DF] mb-1.5 shrink-0">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#545D4B]" />
                  <span className="text-xs font-bold text-[#2D2C28]">
                    مستندات تصویری و اسکرین‌شات‌های فرآیند
                  </span>
                  {formImages.length > 1 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#75746E] bg-[#F0EDE6] px-2 py-0.5 rounded-md">
                      <MoveHorizontal className="h-3 w-3" />
                      <span>کشیدن با ماوس یا لمس (Swipe) برای تغییر تصویر</span>
                    </span>
                  )}
                </div>
                {formImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      تصویر {activeImageIdx + 1} از {formImages.length}
                    </span>
                    {formImages.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDirection(-1);
                            setActiveImageIdx(p => (p > 0 ? p - 1 : formImages.length - 1));
                          }}
                          className="p-1 rounded-lg bg-[#F0EDE6] hover:bg-[#545D4B] text-[#2D2C28] hover:text-white transition cursor-pointer border border-[#DDDBCF]"
                          title="تصویر قبلی"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirection(1);
                            setActiveImageIdx(p => (p < formImages.length - 1 ? p + 1 : 0));
                          }}
                          className="p-1 rounded-lg bg-[#F0EDE6] hover:bg-[#545D4B] text-[#2D2C28] hover:text-white transition cursor-pointer border border-[#DDDBCF]"
                          title="تصویر بعدی"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Main Image Display Box with Smooth AnimatePresence Transition & Drag */}
              {formImages.length > 0 ? (
                <div className="flex-1 relative rounded-xl overflow-hidden bg-[#F0EDE6] border border-[#DDDBCF] group min-h-0 touch-pan-y select-none">
                  <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                      key={activeImageIdx}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 350, damping: 35, mass: 0.8 },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 }
                      }}
                      drag={formImages.length > 1 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={handleDragEnd}
                      className={`absolute inset-0 flex items-center justify-center p-2.5 ${
                        formImages.length > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                      }`}
                    >
                      <img
                        src={formImages[activeImageIdx]}
                        alt={`${item.processName} - ${activeImageIdx + 1}`}
                        draggable={false}
                        className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md select-none rounded-lg"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Floating Navigation Arrows */}
                  {formImages.length > 1 && (
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDirection(-1);
                          setActiveImageIdx(p => (p > 0 ? p - 1 : formImages.length - 1));
                        }}
                        className="p-2 rounded-full bg-white/90 text-[#2D2C28] hover:bg-[#545D4B] hover:text-white pointer-events-auto transition cursor-pointer shadow-md border border-[#DDDBCF]"
                        title="تصویر قبلی"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDirection(1);
                          setActiveImageIdx(p => (p < formImages.length - 1 ? p + 1 : 0));
                        }}
                        className="p-2 rounded-full bg-white/90 text-[#2D2C28] hover:bg-[#545D4B] hover:text-white pointer-events-auto transition cursor-pointer shadow-md border border-[#DDDBCF]"
                        title="تصویر بعدی"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Thumbnail / Dot indicator bar */}
                  {formImages.length > 1 && (
                    <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none z-20">
                      <div className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-auto">
                        {formImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDirection(idx > activeImageIdx ? 1 : -1);
                              setActiveImageIdx(idx);
                            }}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              activeImageIdx === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-white/60 hover:bg-white'
                            }`}
                            title={`تصویر ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#75746E] bg-[#F9F8F6] border-2 border-dashed border-[#DDDBCF] rounded-xl">
                  <ImageIcon className="h-8 w-8 text-[#A8A69E] mb-1.5" />
                  <p className="font-bold text-xs text-[#4A4944]">تصویری برای این فرآیند ثبت نشده است</p>
                  <p className="text-[11px] text-[#8A8880] mt-0.5">
                    با کلیک روی «مشاهده تمام‌صفحه» می‌توانید تصاویر فرم را بارگذاری فرمایید.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM OR SEPARATE SECTION: BEFORE & AFTER CONTENT */}
          {(slideBeforeAfterUnderImage || hoverSubTab === 'comparison') && (
            <div className={`${slideBeforeAfterUnderImage ? 'h-[15%]' : 'h-full'} grid grid-cols-1 md:grid-cols-2 gap-2.5 shrink-0 overflow-hidden`}>
              {/* Before (قبل از اقدام) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#FFF8F7] border border-[#F5C2C7] space-y-0.5 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center gap-1.5 text-rose-800 font-black text-[11px] border-b border-rose-200 pb-0.5 shrink-0">
                  <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                  <span>وضعیت قبل از اقدام:</span>
                </div>
                <div className="flex-1">
                  <RichTextDisplay
                    content={beforeText}
                    className={`${slideBeforeAfterUnderImage ? 'text-[11px]' : 'text-xs sm:text-sm'} text-[#4A4944] font-medium`}
                    fallbackText="موردی برای قبل از اقدام ثبت نشده است."
                  />
                </div>
              </div>

              {/* After (بعد از اقدام) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-0.5 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[11px] border-b border-emerald-200 pb-0.5 shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>وضعیت بعد از اقدام:</span>
                </div>
                <div className="flex-1">
                  {afterSolutionText || achievementsList.length > 0 ? (
                    <div className="space-y-0.5">
                      {afterSolutionText && (
                        <RichTextDisplay
                          content={afterSolutionText}
                          className={`${slideBeforeAfterUnderImage ? 'text-[11px]' : 'text-xs sm:text-sm'} text-[#4A4944] font-medium`}
                        />
                      )}
                      {achievementsList.length > 0 && (
                        <ul className="space-y-0.5 pt-0.5">
                          {achievementsList.map((imp, idx) => (
                            <li key={idx} className="flex items-start gap-1 text-[10px] sm:text-xs text-emerald-900 font-medium">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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

        {/* Sleek Bottom Bar with Fullscreen CTA */}
        <div className="bg-[#EFEFEA] px-5 py-2 border-t border-[#DDDBCF] flex items-center justify-end text-xs shrink-0">
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#545D4B] hover:bg-[#434A3C] text-white font-bold transition cursor-pointer shadow-xs text-xs"
          >
            <span>نمایش اسلاید تمام‌صفحه</span>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
