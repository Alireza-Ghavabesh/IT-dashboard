import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { formatNumber } from '../utils/parser';

export interface SearchableOption {
  value: string;
  label: string;
  count?: number;
  badge?: string;
  subtext?: string;
}

interface SearchableSelectProps {
  id?: string;
  options: (string | SearchableOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allOptionLabel?: string;
  includeAllOption?: boolean;
  className?: string;
  disabled?: boolean;
  onEnterSelectAndSubmit?: (value: string) => void;
  showCounts?: boolean;
  countsMap?: Record<string, number>;
  compact?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید...',
  searchPlaceholder = 'جستجو در موارد (تایپ کنید)...',
  emptyText = 'موردی یافت نشد',
  allOptionLabel,
  includeAllOption = false,
  className = '',
  disabled = false,
  onEnterSelectAndSubmit,
  showCounts = false,
  countsMap = {},
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options to uniform structure
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = [];

    if (includeAllOption && allOptionLabel) {
      list.push({
        value: 'all',
        label: allOptionLabel,
        count: countsMap['all']
      });
    }

    options.forEach(opt => {
      if (typeof opt === 'string') {
        list.push({
          value: opt,
          label: opt,
          count: countsMap[opt]
        });
      } else {
        list.push({
          ...opt,
          count: opt.count !== undefined ? opt.count : countsMap[opt.value]
        });
      }
    });

    return list;
  }, [options, includeAllOption, allOptionLabel, countsMap]);

  // Filter options by search term (case-insensitive, normalized Persian/Arabic)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return normalizedOptions;
    }
    const q = searchTerm.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    return normalizedOptions.filter(opt => {
      const normalizedLabel = opt.label.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      const normalizedValue = opt.value.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      return normalizedLabel.includes(q) || normalizedValue.includes(q);
    });
  }, [normalizedOptions, searchTerm]);

  // Selected item label
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(o => o.value === value);
  }, [normalizedOptions, value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
    if (onEnterSelectAndSubmit) {
      onEnterSelectAndSubmit(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Helper to highlight matching text in labels
  const renderHighlightedLabel = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const cleanHighlight = highlight.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    const cleanText = text.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    const index = cleanText.indexOf(cleanHighlight);
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + highlight.trim().length);
    const after = text.substring(index + highlight.trim().length);

    return (
      <span>
        {before}
        <span className="bg-[#FEF08A] text-[#854D0E] font-extrabold px-0.5 rounded-xs">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 text-right transition cursor-pointer border rounded-xl ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${
          isOpen
            ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
            : 'bg-white hover:bg-[#FAF9F5] border-[#DDDBCF] text-[#2D2C28]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-[#F5F5F0]' : ''}`}
      >
        <span className="truncate flex-1 font-medium">
          {selectedOption ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-[#2D2C28] font-bold truncate">{selectedOption.label}</span>
              {(showCounts || selectedOption.count !== undefined) && selectedOption.count !== undefined && (
                <span className="text-[11px] text-[#75746E] font-normal shrink-0">
                  ({formatNumber(selectedOption.count)} نامه)
                </span>
              )}
            </span>
          ) : (
            <span className="text-[#75746E]">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-[#75746E]">
          {value && value !== 'all' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              title="پاک کردن انتخاب"
              className="p-0.5 hover:bg-[#EAE8DE] hover:text-[#9C3A27] rounded-md transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#2563EB]' : ''}`}
          />
        </div>
      </button>

      {/* Floating Searchable Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-white rounded-xl shadow-xl border border-[#DDDBCF] overflow-hidden animate-in fade-in zoom-in-95 duration-100 right-0">
          {/* Search Box Header */}
          <div className="p-2 border-b border-[#E8E6DF] bg-[#FAF9F5]">
            <div className="relative flex items-center">
              <Search className="h-3.5 w-3.5 absolute right-2.5 text-[#75746E] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pr-8 pl-7 py-1.5 text-xs bg-white border border-[#DDDBCF] rounded-lg text-[#2D2C28] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    inputRef.current?.focus();
                  }}
                  className="absolute left-2 p-0.5 text-[#75746E] hover:text-[#2D2C28] rounded-md transition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {searchTerm.trim() && (
              <div className="text-[10px] text-[#75746E] mt-1 px-1 flex justify-between items-center">
                <span>یافت شده: {formatNumber(filteredOptions.length)} مورد</span>
                <span className="text-[#2563EB]">کلید Enter برای انتخاب</span>
              </div>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1 divide-y divide-[#F5F5F0]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#75746E]">
                <p className="font-medium">{emptyText}</p>
                {searchTerm && (
                  <p className="text-[11px] text-[#A8A69E] mt-1">
                    عبارتی شبیه به «{searchTerm}» یافت نشد
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#EFF6FF] text-[#1E40AF] font-bold'
                        : isHighlighted
                        ? 'bg-[#FAF9F5] text-[#2D2C28]'
                        : 'text-[#2D2C28] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      ) : (
                        <div className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">
                        {renderHighlightedLabel(opt.label, searchTerm)}
                      </span>
                    </div>

                    {(showCounts || opt.count !== undefined) && opt.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                          isSelected
                            ? 'bg-[#DBEAFE] text-[#1E40AF] font-bold'
                            : 'bg-[#F0EFEA] text-[#75746E]'
                        }`}
                      >
                        {formatNumber(opt.count)} نامه
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
