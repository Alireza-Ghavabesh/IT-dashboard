import React, { useState, useEffect } from 'react';
import { 
  X, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  Edit3, 
  Building2, 
  Calendar, 
  Tag, 
  FileText,
  Paperclip,
  Download
} from 'lucide-react';
import { ProcessedEraItem } from '../types';

interface RejectionReasonModalProps {
  isOpen: boolean;
  item: ProcessedEraItem | null;
  onClose: () => void;
  onEdit?: (item: ProcessedEraItem) => void;
}

export const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  // Retrieve rejection reason from item properties or localStorage fallback
  const rejectionReason = (
    item.rejectionReason ||
    (item as any)["دلیل رد"] ||
    (typeof window !== 'undefined' ? localStorage.getItem(`era_rej_reason_${item.id}`) : '') ||
    ''
  ).trim();

  const handleCopy = () => {
    if (!rejectionReason) return;
    navigator.clipboard.writeText(rejectionReason);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditClick = () => {
    onClose();
    if (onEdit) {
      onEdit(item);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-rose-200 overflow-hidden text-right font-sans transition-all transform animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-modal-title"
      >
        {/* Top Header Banner with Red / Rose Theme */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-4 sm:p-6 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-inner">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-100" />
              </div>
              <div className="min-w-0">
                <h3 id="rejection-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="truncate">دلیل رد فرآیند</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/20 text-rose-100 border border-white/30 whitespace-nowrap">
                    وضعیت: رد شده
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-rose-100/90 mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
                  علت ثبت‌شده برای عدم تأیید و رد این رکورد فرآیندی
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0"
              title="بستن (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-[#FCFCFA] overflow-y-auto min-w-0 flex-1 overscroll-contain">
          {/* Process Meta Box */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-[#E8E6DF] shadow-xs space-y-2 min-w-0">
            <div className="font-bold text-[#2D2C28] text-sm sm:text-base leading-snug break-words">
              {item.processName}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[#5A5852] pt-1 border-t border-[#F0EFEA]">
              {item.orgUnit && (
                <div className="flex items-center gap-1 bg-[#F5F5F0] px-2 sm:px-2.5 py-1 rounded-lg border border-[#E2E0D8] max-w-full">
                  <Building2 className="w-3.5 h-3.5 text-[#545D4B] shrink-0" />
                  <span className="truncate">واحد: <strong className="text-[#2D2C28]">{item.orgUnit}</strong></span>
                </div>
              )}

              {item.entityType && (
                <div className="flex items-center gap-1 bg-purple-50 text-purple-800 px-2 sm:px-2.5 py-1 rounded-lg border border-purple-200 max-w-full">
                  <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">موجودیت: <strong>{item.entityType}</strong></span>
                </div>
              )}

              {item.executionDate && (
                <div className="flex items-center gap-1 bg-[#F5F5F0] px-2 sm:px-2.5 py-1 rounded-lg border border-[#E2E0D8] max-w-full">
                  <Calendar className="w-3.5 h-3.5 text-[#545D4B] shrink-0" />
                  <span className="truncate">تاریخ: <strong className="font-mono text-[#2D2C28]">{item.executionDate}</strong></span>
                </div>
              )}

              {(item.noteFile || (item as any)["فایل یادداشت"]) && (
                (() => {
                  const f = item.noteFile || (item as any)["فایل یادداشت"];
                  return (
                    <a
                      href={f.data}
                      download={f.name || 'note_attachment'}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-300 max-w-full font-bold transition shadow-2xs"
                      title={`دانلود فایل یادداشت: ${f.name}\nحجم: ${(f.size / 1024).toFixed(1)} KB`}
                    >
                      <Paperclip className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate dir-ltr">فایل یادداشت: {f.name}</span>
                      <Download className="w-3 h-3 text-amber-700 shrink-0" />
                    </a>
                  );
                })()
              )}
            </div>
          </div>

          {/* Prominent Rejection Reason Box */}
          <div className="bg-rose-50/70 border-2 border-rose-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs relative min-w-0">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3 gap-2">
              <div className="flex items-center gap-1.5 font-black text-rose-950 text-xs sm:text-sm shrink-0">
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span>شرح علت رد:</span>
              </div>

              {rejectionReason && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer shrink-0"
                  title="کپی متن علت رد"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-rose-600" />
                      <span>کپی متن</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {rejectionReason ? (
              <div className="bg-white/95 rounded-xl p-3 sm:p-3.5 border border-rose-200/80 text-rose-950 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text font-medium shadow-2xs min-h-[70px] max-h-60 sm:max-h-72 overflow-y-auto">
                {rejectionReason}
              </div>
            ) : (
              <div className="bg-white/70 rounded-xl p-4 border border-rose-200/60 text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                <p className="text-xs text-rose-900 font-bold">
                  متن دلیلی برای رد این فرآیند ثبت نشده است.
                </p>
                <p className="text-[11px] text-[#7A7870]">
                  جهت درج دلیل رد یا تغییر وضعیت، می‌توانید فرآیند را ویرایش کنید.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F8F8F5] border-t border-[#EAE8E0] px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#5A5852] bg-white border border-[#DDDBCF] hover:bg-[#EFEFEA] hover:text-[#2D2C28] rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            بستن
          </button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white bg-[#545D4B] hover:bg-[#434B3C] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایش فرآیند</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
