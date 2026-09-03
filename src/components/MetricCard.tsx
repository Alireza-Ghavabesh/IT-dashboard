import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatNumber } from '../utils/parser';

interface MetricCardProps {
  id?: string;
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'indigo' | 'rose' | 'emerald' | 'amber' | 'cyan' | 'purple' | 'brown' | 'blue';
  badgeText?: string;
  secondaryValue?: {
    label: string;
    value: string | number;
  };
}

const colorStyles = {
  indigo: {
    bg: 'bg-[#FAFAF7] border-[#E2E0D8]',
    iconBg: 'bg-[#545D4B] text-white shadow-sm',
    text: 'text-[#2D2C28]',
    accent: 'text-[#545D4B]',
    badge: 'bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF]'
  },
  rose: {
    bg: 'bg-[#FAF7F6] border-[#EBDCD7]',
    iconBg: 'bg-[#9C3A27] text-white shadow-sm',
    text: 'text-[#4A1D15]',
    accent: 'text-[#9C3A27]',
    badge: 'bg-[#FAECE8] text-[#8A2E1D] border border-[#F2D1CA]'
  },
  emerald: {
    bg: 'bg-[#F7F9F6] border-[#DCE4DB]',
    iconBg: 'bg-[#446347] text-white shadow-sm',
    text: 'text-[#213523]',
    accent: 'text-[#446347]',
    badge: 'bg-[#EDF2EB] text-[#2E462C] border border-[#D4DFD1]'
  },
  amber: {
    bg: 'bg-[#FAF8F3] border-[#EDE4D2]',
    iconBg: 'bg-[#8A6224] text-white shadow-sm',
    text: 'text-[#473210]',
    accent: 'text-[#8A6224]',
    badge: 'bg-[#F7F2E7] text-[#704E19] border border-[#EADEC2]'
  },
  brown: {
    bg: 'bg-[#FDF8F5] border-[#EADBD1]',
    iconBg: 'bg-[#7C3E1D] text-white shadow-sm',
    text: 'text-[#451A03]',
    accent: 'text-[#7C3E1D]',
    badge: 'bg-[#F5EBE4] text-[#7C3E1D] border border-[#DFC9BA]'
  },
  blue: {
    bg: 'bg-[#F4F8FD] border-[#D3E2F8]',
    iconBg: 'bg-[#2563EB] text-white shadow-sm',
    text: 'text-[#1E3A8A]',
    accent: 'text-[#2563EB]',
    badge: 'bg-[#EBF3FE] text-[#1D4ED8] border border-[#C8DCF9]'
  },
  cyan: {
    bg: 'bg-[#F5F8F8] border-[#D8E3E3]',
    iconBg: 'bg-[#436465] text-white shadow-sm',
    text: 'text-[#1F3334]',
    accent: 'text-[#436465]',
    badge: 'bg-[#EBF2F2] text-[#2F4A4B] border border-[#D3E0E0]'
  },
  purple: {
    bg: 'bg-[#F9F7F5] border-[#E6DFD9]',
    iconBg: 'bg-[#6B5A4E] text-white shadow-sm',
    text: 'text-[#3B2F27]',
    accent: 'text-[#6B5A4E]',
    badge: 'bg-[#EFECE8] text-[#52443A] border border-[#DED7CE]'
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  badgeText,
  secondaryValue
}) => {
  const styles = colorStyles[colorScheme] || colorStyles.indigo;

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${styles.bg}`}
    >
      {/* Top Header & Stat Value */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#75746E] truncate">{title}</span>
            {badgeText && (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold text-[10px] whitespace-nowrap shrink-0 ${styles.badge}`}>
                {badgeText}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${styles.text}`}>
              {formatNumber(value)}
            </span>
            <span className="text-xs font-medium text-[#8A8880]">مورد</span>
          </div>
        </div>
        <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl shadow-xs shrink-0 ${styles.iconBg}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Bottom Footer Section: Subtitle & Secondary Value */}
      {(subtitle || secondaryValue) && (
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#E8E6DF] pt-2.5 text-xs min-h-[30px]">
          {subtitle && (
            <span
              className="text-[#75746E] font-normal text-[11px] sm:text-xs truncate flex-1 min-w-0"
              title={subtitle}
            >
              {subtitle}
            </span>
          )}

          {secondaryValue && (
            <div className={`flex items-center gap-1.5 text-[11px] sm:text-xs text-[#5A5852] bg-white/90 px-2.5 py-1 rounded-xl border border-[#E2E0D8] shadow-2xs ${
              subtitle ? 'shrink-0 whitespace-nowrap' : 'w-full justify-between'
            }`}>
              <span className="text-[#75746E] font-medium">{secondaryValue.label}:</span>
              <span className="font-bold text-[#2D2C28]">
                {typeof secondaryValue.value === 'number'
                  ? formatNumber(secondaryValue.value)
                  : secondaryValue.value}
                {typeof secondaryValue.value === 'number' && secondaryValue.label.includes('درصد') ? '٪' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
