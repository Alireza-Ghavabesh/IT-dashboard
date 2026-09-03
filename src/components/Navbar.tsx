import React from 'react';
import {
  FileSpreadsheet,
  Workflow,
  UploadCloud,
  RotateCcw,
  BarChart4,
  Database,
  CheckCircle2,
  RefreshCw,
  Settings,
  FilterX,
  Sparkles,
  Presentation
} from 'lucide-react';
import { formatNumber } from '../utils/parser';

interface NavbarProps {
  activeTab: 'removeEdit' | 'era' | 'slideshow';
  onTabChange: (tab: 'removeEdit' | 'era' | 'slideshow') => void;
  lettersCount: number;
  uniqueLettersCount: number;
  eraCount: number;
  slideSelectedCount?: number;
  rulesCount?: number;
  exclusionRulesCount?: number;
  excludedCount?: number;
  showAiButton?: boolean;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAiModal?: () => void;
  onResetData: () => void;
  isSyncing?: boolean;
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  lettersCount,
  uniqueLettersCount,
  eraCount,
  slideSelectedCount = 0,
  rulesCount = 0,
  exclusionRulesCount = 0,
  excludedCount = 0,
  showAiButton = false,
  onOpenUploadModal,
  onOpenSettingsModal,
  onOpenAiModal,
  onResetData,
  isSyncing = false,
  onRefreshData
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF7]/95 backdrop-blur-md border-b border-[#E2E0D8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between py-3 gap-3">
          {/* Logo & Main Title (Start in RTL) */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-start">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#545D4B] text-white shadow-xs shrink-0">
              <BarChart4 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-[#2D2C28] tracking-tight truncate">
                  آمار فعالیت واحد IT (نرم افزار)
                </h1>
                <span className="bg-[#EFEFEA] text-[#4B5344] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#DDDBCF] flex items-center gap-1 shrink-0">
                  <Database className="h-3 w-3 text-[#446347]" />
                  <span>SQLite</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center Tabs Navigation (Perfect Center Alignment) */}
          <div className="flex items-center justify-center w-full lg:w-auto">
            <div className="flex items-center bg-[#EAEAE4] p-1 rounded-2xl border border-[#DDDBCF] shadow-xs gap-1 max-w-full overflow-x-auto">
              {/* Tab 1: Remove & Edit Letters */}
              <button
                onClick={() => onTabChange('removeEdit')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'removeEdit'
                    ? 'bg-white text-[#2D2C28] shadow-xs'
                    : 'text-[#75746E] hover:text-[#2D2C28] hover:bg-[#F3F3ED]'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#545D4B]" />
                <span>حذف و ویرایش</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'removeEdit' ? 'bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF]' : 'bg-[#DDDBCF] text-[#5A5852]'
                }`}>
                  {formatNumber(uniqueLettersCount)}
                </span>
              </button>

              {/* Tab 2: Processes */}
              <button
                onClick={() => onTabChange('era')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'era'
                    ? 'bg-white text-[#2D2C28] shadow-xs'
                    : 'text-[#75746E] hover:text-[#2D2C28] hover:bg-[#F3F3ED]'
                }`}
              >
                <Workflow className="h-4 w-4 shrink-0 text-[#545D4B]" />
                <span>فرآیند ها</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'era' ? 'bg-[#EFEFEA] text-[#4B5344] border border-[#DDDBCF]' : 'bg-[#DDDBCF] text-[#5A5852]'
                }`}>
                  {formatNumber(eraCount)}
                </span>
              </button>

              {/* Tab 3: Slide Presentation (نمایش اسلایدی) */}
              <button
                onClick={() => onTabChange('slideshow')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'slideshow'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-xs'
                    : 'text-[#75746E] hover:text-[#2D2C28] hover:bg-[#F3F3ED]'
                }`}
              >
                <Presentation className={`h-4 w-4 shrink-0 ${activeTab === 'slideshow' ? 'text-white' : 'text-blue-600'}`} />
                <span>نمایش اسلایدی</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'slideshow' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {formatNumber(slideSelectedCount)}
                </span>
              </button>
            </div>
          </div>

          {/* End Actions: Settings Gear, Refresh, Upload JSON & Reset Seed (End in RTL) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            {/* Settings Gear Button (شامل تمام قوانین استثنا، عامل و دیتابیس) */}
            <button
              onClick={onOpenSettingsModal}
              title="تنظیمات سیستم: قوانین استثنا (تست)، موتور قوانین عامل و پایگاه داده"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2D2C28] bg-white hover:bg-[#EFEFEA] rounded-xl border border-[#DDDBCF] transition cursor-pointer shadow-xs active:scale-95 group"
            >
              <Settings className="h-4 w-4 text-[#545D4B] group-hover:rotate-45 transition-transform duration-300" />
              <span className="hidden sm:inline">تنظیمات</span>
              <span className="bg-[#EFEFEA] text-[#4B5344] text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#DDDBCF]">
                {formatNumber(rulesCount + exclusionRulesCount)}
              </span>
              {excludedCount > 0 && (
                <span className="bg-[#9C3A27] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full" title={`${excludedCount} نامه مستثنی‌شده`}>
                  {formatNumber(excludedCount)}
                </span>
              )}
            </button>

            {/* Upload Excel / JSON Button */}
            <button
              onClick={onOpenUploadModal}
              title="بارگذاری فایل‌های اکسل (.xlsx, .xls) و JSON"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#2D2C28] bg-white hover:bg-[#EFEFEA] rounded-xl border border-[#DDDBCF] transition cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span className="hidden sm:inline">بارگذاری اکسل / JSON</span>
            </button>

            {/* Re-Sync Database Button */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isSyncing}
                title="همگام‌سازی لحظه‌ای با SQLite"
                className="p-2 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF] transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-[#446347]' : ''}`} />
              </button>
            )}

            {/* Reset Initial Seed Button */}
            <button
              onClick={onResetData}
              title="بازنشانی پایگاه داده SQLite و بارگذاری داده‌های اولیه"
              className="p-2 rounded-xl text-[#75746E] hover:text-[#9C3A27] hover:bg-[#FAECE8] border border-transparent hover:border-[#F2D1CA] transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
