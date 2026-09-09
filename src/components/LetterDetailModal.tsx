import React from 'react';
import { X, Calendar, User, Tag, FileText, CheckCircle2, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { ProcessedLetter } from '../types';
import { resolveLetterCreatorAndUnit } from '../utils/parser';

interface LetterDetailModalProps {
  letter: ProcessedLetter | null;
  onClose: () => void;
}

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({ letter, onClose }) => {
  if (!letter) return null;

  const isDelete = letter.actionType === 'حذف';
  const cleanInfo = resolveLetterCreatorAndUnit(letter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2C28]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#FAFAF7] p-6 shadow-2xl border border-[#DDDBCF] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8E6DF] pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isDelete ? 'bg-[#FAECE8] text-[#8A2E1D] border border-[#F2D1CA]' : 'bg-[#EDF2EB] text-[#2E462C] border border-[#D4DFD1]'}`}>
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isDelete ? 'bg-[#FAECE8] text-[#8A2E1D] border border-[#F2D1CA]' : 'bg-[#EDF2EB] text-[#2E462C] border border-[#D4DFD1]'
                }`}>
                  نوع نامه: {letter.actionType}
                </span>

                {/* Cause Badge */}
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-black text-white shadow-2xs"
                  style={{ backgroundColor: letter.causeColor || (letter.cause === 'بانکی' ? '#2563EB' : '#6B7280') }}
                >
                  عامل: {letter.cause || 'نامشخص'}
                </span>

                <span className="text-xs font-semibold text-[#75746E]">
                  شناسه: {letter.letterId ?? letter.id}
                </span>
                {letter.registrationNumber && (
                  <span className="bg-[#EFEFEA] text-[#2D2C28] text-[11px] px-2 py-0.5 rounded-md font-mono border border-[#DDDBCF]">
                    شماره ثبت: {letter.registrationNumber}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-[#2D2C28] mt-1 line-clamp-2">
                {letter.subject}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#8A8880] hover:bg-[#EFEFEA] hover:text-[#2D2C28] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Details Grid */}
        <div className="py-5 space-y-4 text-xs">
          {/* Cause Analysis Banner if matched */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#DDDBCF] flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: letter.causeColor || (letter.cause === 'بانکی' ? '#2563EB' : '#6B7280') }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#75746E] font-medium">عامل تعیین شده:</span>
                  <span className="font-extrabold text-[#2D2C28]">{letter.cause || 'نامشخص'}</span>
                </div>
                {letter.causeReason && (
                  <span className="text-[11px] text-[#75746E]">
                    {letter.causeReason}
                  </span>
                )}
              </div>
            </div>
            {letter.cause === 'بانکی' && (
              <span className="text-[11px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-1 rounded-xl border border-[#BFDBFE]">
                عدم کسر وجه توسط بانک (غیرمرتبط با خطای کارمند)
              </span>
            )}
          </div>
          {/* Main Key-Value Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#F5F5F0] p-4 rounded-2xl border border-[#DDDBCF]">
            <div className="flex items-center gap-2 text-[#2D2C28]">
              <User className="h-4 w-4 text-[#8A8880] shrink-0" />
              <span className="text-[#75746E] font-medium">واحد سازمانی:</span>
              <span className="font-bold text-[#2D2C28] bg-white px-2 py-0.5 rounded-md border border-[#DDDBCF]">
                {cleanInfo.unit}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#2D2C28]">
              <Calendar className="h-4 w-4 text-[#8A8880] shrink-0" />
              <span className="text-[#75746E] font-medium">تاریخ ثبت / مشاهده:</span>
              <span className="font-bold text-[#2D2C28]">{letter.dateStr}</span>
              <span className="text-[10px] text-[#75746E]">({letter.monthName})</span>
            </div>

            <div className="flex items-center gap-2 text-[#2D2C28]">
              <Tag className="h-4 w-4 text-[#8A8880] shrink-0" />
              <span className="text-[#75746E] font-medium">ایجاد کننده نامه:</span>
              <span className="font-semibold text-[#2D2C28] truncate" title={letter.creatorRaw || cleanInfo.name}>
                {cleanInfo.name} {cleanInfo.role ? `(${cleanInfo.role})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#2D2C28]">
              <ShieldAlert className="h-4 w-4 text-[#8A8880] shrink-0" />
              <span className="text-[#75746E] font-medium">فوریت / وضعیت:</span>
              <span className="font-semibold text-[#2D2C28]">
                {letter.urgency} - {letter.status || 'ثبت شده'}
              </span>
            </div>
          </div>

          {/* Senders & Receivers */}
          <div className="space-y-2">
            <div className="p-3 bg-[#FAFAF7] rounded-xl border border-[#DDDBCF] space-y-1.5">
              <div className="flex items-center justify-between text-[#75746E] font-medium">
                <span className="flex items-center gap-1.5 text-[#2D2C28] font-semibold">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-[#545D4B]" />
                  فرستنده:
                </span>
                <span className="text-[#2D2C28] font-normal">{letter.sender}</span>
              </div>
              <div className="flex items-center justify-between text-[#75746E] font-medium border-t border-[#E8E6DF] pt-1.5">
                <span className="flex items-center gap-1.5 text-[#2D2C28] font-semibold">
                  <User className="h-3.5 w-3.5 text-[#446347]" />
                  گیرنده:
                </span>
                <span className="text-[#2D2C28] font-normal truncate max-w-md text-left" dir="rtl">{letter.receiver}</span>
              </div>
            </div>
          </div>

          {/* Full Subject & Description */}
          {letter.originalSubject && (
            <div className="space-y-1">
              <span className="font-semibold text-[#2D2C28]">موضوع کامل مکاتبه:</span>
              <div className="p-3 bg-[#F5F5F0] rounded-xl text-[#2D2C28] font-medium leading-relaxed border border-[#E8E6DF]">
                {letter.originalSubject}
              </div>
            </div>
          )}

          {letter.raw.شرح && (
            <div className="space-y-1">
              <span className="font-semibold text-[#2D2C28]">شرح مکاتبه:</span>
              <div
                className="p-3 bg-[#F5F5F0] rounded-xl text-[#2D2C28] border border-[#DDDBCF] leading-relaxed max-h-36 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: letter.raw.شرح }}
              />
            </div>
          )}

          {(letter.note || letter.raw?.یادداشت || letter.raw?.['یادداشت نامه']) && (
            <div className="space-y-1">
              <span className="font-semibold text-[#8A6224]">یادداشت ثبت شده:</span>
              <div className="p-3 bg-[#FAF6EC] text-[#8A6224] border border-[#EADBBD] rounded-xl leading-relaxed">
                {letter.note || letter.raw?.یادداشت || letter.raw?.['یادداشت نامه']}
              </div>
            </div>
          )}

          {/* Raw Data Toggle View */}
          <details className="mt-4 border border-[#DDDBCF] rounded-xl bg-[#F5F5F0] p-2.5">
            <summary className="cursor-pointer font-semibold text-[#5A5852] hover:text-[#2D2C28]">
              مشاهده تمامی فیلدهای خام JSON
            </summary>
            <pre className="mt-2 p-3 bg-[#2D2C28] text-[#F5F5F0] rounded-lg text-[11px] font-mono overflow-x-auto max-h-48" dir="ltr">
              {JSON.stringify(letter.raw, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#E8E6DF] pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#2D2C28] bg-[#EFEFEA] hover:bg-[#E2E0D8] rounded-xl border border-[#DDDBCF] transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
