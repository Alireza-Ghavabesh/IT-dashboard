import React, { useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.js';
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css';

interface JalaliDateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}

export const JalaliDateInput: React.FC<JalaliDateInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '۱۴۰X/MM/DD',
  className = '',
  inputClassName = '',
  disabled = false,
  min,
  max,
  showClearButton = true,
  onClear,
  onEnter,
  autoFocus = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Ensure jalaliDatepicker is initialized and watching data-jdp attributes
    if (typeof window !== 'undefined' && (window as any).jalaliDatepicker) {
      try {
        (window as any).jalaliDatepicker.startWatch({
          minDate: 'attr',
          maxDate: 'attr',
          time: false,
          date: true,
          separator: '/',
          zIndex: 9999999
        });
      } catch (err) {
        console.warn('jalaliDatepicker init:', err);
      }
    }
  }, []);

  // Sync native change, input, jdp:change, and blur events to React state seamlessly
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleNativeChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.value !== undefined) {
        onChange(target.value);
      }
    };

    el.addEventListener('change', handleNativeChange);
    el.addEventListener('input', handleNativeChange);
    el.addEventListener('jdp:change', handleNativeChange);
    el.addEventListener('blur', handleNativeChange);

    return () => {
      el.removeEventListener('change', handleNativeChange);
      el.removeEventListener('input', handleNativeChange);
      el.removeEventListener('jdp:change', handleNativeChange);
      el.removeEventListener('blur', handleNativeChange);
    };
  }, [onChange]);

  const handleOpenPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled || !inputRef.current) return;
    inputRef.current.focus();
    if (typeof window !== 'undefined' && (window as any).jalaliDatepicker) {
      try {
        (window as any).jalaliDatepicker.show(inputRef.current);
      } catch (err) {
        console.warn('Error showing jalaliDatepicker:', err);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (onClear) onClear();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        ref={inputRef}
        id={id}
        data-jdp
        data-jdp-min-date={min}
        data-jdp-max-date={max}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        dir="ltr"
        className={`w-full bg-white border border-[#DDDBCF] focus:border-[#545D4B] rounded-xl px-3 py-2 text-xs text-[#2D2C28] text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#545D4B] transition pr-8 pl-8 ${
          disabled ? 'opacity-60 cursor-not-allowed bg-[#F5F5F0]' : 'cursor-pointer'
        } ${inputClassName}`}
      />
      
      {/* Calendar Icon to trigger picker */}
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={disabled}
        className="absolute right-2.5 text-[#75746E] hover:text-[#2D2C28] transition p-0.5 rounded cursor-pointer"
        title="باز کردن تقویم جلالی"
      >
        <CalendarIcon className="h-4 w-4" />
      </button>

      {/* Clear Button */}
      {showClearButton && value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-2.5 text-[#8A8880] hover:text-[#2D2C28] hover:bg-[#EAEAE5] p-0.5 rounded-full transition cursor-pointer"
          title="پاک کردن تاریخ"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

