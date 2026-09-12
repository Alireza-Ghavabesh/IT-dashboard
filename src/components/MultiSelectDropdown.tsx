import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, CheckSquare, Square } from 'lucide-react';
import { formatNumber } from '../utils/parser';

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectDropdownProps {
  id?: string;
  options: (string | MultiSelectOption)[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  showCounts?: boolean;
  countsMap?: Record<string, number>;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  options,
  selectedValues,
  onChange,
  placeholder = 'انتخاب واحدها...',
  allLabel = 'همه واحدها',
  showCounts = true,
  countsMap = {},
  compact = false,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: MultiSelectOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return {
          value: opt,
          label: opt,
          count: countsMap[opt]
        };
      }
      return {
        ...opt,
        count: opt.count !== undefined ? opt.count : countsMap[opt.value]
      };
    });
  }, [options, countsMap]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const q = searchTerm.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    return normalizedOptions.filter(opt => {
      const normalizedLabel = opt.label.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      const normalizedValue = opt.value.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      return normalizedLabel.includes(q) || normalizedValue.includes(q);
    });
  }, [normalizedOptions, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle single value
  const handleToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  // Select all filtered or all options
  const handleSelectAll = () => {
    const allVals = normalizedOptions.map(o => o.value);
    onChange(allVals);
  };

  // Clear all
  const handleClearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange([]);
  };

  // Compute button display text
  const buttonDisplayText = useMemo(() => {
    if (selectedValues.length === 0) {
      return `${allLabel} (${normalizedOptions.length})`;
    }
    if (selectedValues.length === 1) {
      const found = normalizedOptions.find(o => o.value === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    if (selectedValues.length === 2) {
      return `${selectedValues[0]}، ${selectedValues[1]}`;
    }
    return `${formatNumber(selectedValues.length)} واحد انتخاب‌شده`;
  }, [selectedValues, allLabel, normalizedOptions]);

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer text-right select-none ${
          isOpen
            ? 'bg-white border-[#545D4B] ring-2 ring-[#545D4B]/20'
            : selectedValues.length > 0
            ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
            : 'bg-white border-[#DDDBCF] text-[#2D2C28] hover:border-[#8A8880]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selectedValues.length > 0 ? (
            <span className="w-2 h-2 rounded-full bg-[#9C3A27] shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#545D4B] shrink-0" />
          )}
          <span className="truncate" title={selectedValues.length > 0 ? selectedValues.join('، ') : allLabel}>
            {buttonDisplayText}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              className="p-0.5 hover:bg-amber-200/80 rounded-md text-amber-900 transition"
              title="پاک کردن انتخاب‌ها"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#8A8880] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#545D4B]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#DDDBCF] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 bg-[#F5F5F0] border-b border-[#DDDBCF] space-y-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-[#8A8880]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="جستجوی واحد سازمانی..."
                className="w-full bg-white border border-[#DDDBCF] rounded-xl pr-8 pl-7 py-1.5 text-xs text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-2 focus:ring-[#545D4B]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-2 text-[#8A8880] hover:text-[#2D2C28]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between text-[11px] font-bold px-1">
              <span className="text-[#75746E]">
                {selectedValues.length === 0
                  ? 'همه واحدها (بدون فیلتر)'
                  : `${formatNumber(selectedValues.length)} از ${formatNumber(normalizedOptions.length)} انتخاب شده`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-700 hover:text-blue-900 transition cursor-pointer"
                >
                  انتخاب همه
                </button>
                <span className="text-[#DDDBCF]">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[#9C3A27] hover:text-[#8A2E1D] transition cursor-pointer"
                >
                  لغو همه
                </button>
              </div>
            </div>
          </div>

          {/* List of Options */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {/* "All Units" Toggle Row */}
            <div
              onClick={handleClearAll}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer select-none ${
                selectedValues.length === 0
                  ? 'bg-[#545D4B]/10 text-[#545D4B] font-bold'
                  : 'text-[#2D2C28] hover:bg-[#F5F5F0]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedValues.length === 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#545D4B]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8A8880]" />
                )}
                <span>{allLabel} (نمایش همه)</span>
              </div>
              <span className="text-[10px] bg-[#EFEFEA] text-[#75746E] px-1.5 py-0.5 rounded-md font-medium">
                {formatNumber(normalizedOptions.length)}
              </span>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8A8880]">
                واحدی با این عنوان یافت نشد
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-amber-100/70 text-amber-950 font-bold'
                        : 'text-[#2D2C28] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-800 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8A8880] shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-medium ${
                          isSelected ? 'bg-amber-200/80 text-amber-900' : 'bg-[#EFEFEA] text-[#75746E]'
                        }`}
                      >
                        {formatNumber(opt.count)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with OK button */}
          <div className="p-2 bg-[#F5F5F0] border-t border-[#DDDBCF] flex justify-between items-center text-xs">
            <span className="text-[11px] text-[#75746E]">
              {selectedValues.length > 0
                ? `${formatNumber(selectedValues.length)} واحد فیلتر شد`
                : 'بدون محدودیت واحد'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#545D4B] hover:bg-[#434A3C] text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
            >
              تایید و اعمال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
