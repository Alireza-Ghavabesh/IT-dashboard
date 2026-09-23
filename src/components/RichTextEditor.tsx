import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  List,
  ListOrdered,
  Palette,
  Highlighter,
  Type,
  Eraser,
  RotateCcw,
  RotateCw,
  ChevronDown
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  variant?: 'rose' | 'emerald' | 'default';
  className?: string;
}

const FONT_SIZES = [
  { label: '۱۰px (خیلی ریز)', size: '10px' },
  { label: '۱۲px (ریز)', size: '12px' },
  { label: '۱۳px (کوچک)', size: '13px' },
  { label: '۱۴px (استاندارد)', size: '14px' },
  { label: '۱۶px (برجسته)', size: '16px' },
  { label: '۱۸px (سرتیتر ۲)', size: '18px' },
  { label: '۲۲px (سرتیتر ۱)', size: '22px' },
  { label: '۲۶px (عنوان اصلی)', size: '26px' },
];

const TEXT_COLORS = [
  { label: 'مشکی ذغالی', color: '#1e293b' },
  { label: 'خاکستری سربی', color: '#475569' },
  { label: 'قرمز هشدار', color: '#dc2626' },
  { label: 'یاقوتی', color: '#e11d48' },
  { label: 'سبز موفقیت', color: '#16a34a' },
  { label: 'آبی سازمانی', color: '#2563eb' },
  { label: 'فیروزه‌ای', color: '#0d9488' },
  { label: 'بنفش مدیریتی', color: '#7c3aed' },
  { label: 'نارنجی تیره', color: '#ea580c' },
  { label: 'قهوه‌ای چوبی', color: '#78350f' },
];

const HIGHLIGHT_COLORS = [
  { label: 'بدون هایلایت', color: 'transparent' },
  { label: 'زرد ملایم', color: '#fef08a' },
  { label: 'سبز ملایم', color: '#bbf7d0' },
  { label: 'قرمز/صورتی ملایم', color: '#fecdd3' },
  { label: 'آبی ملایم', color: '#bfdbfe' },
  { label: 'بنفش ملایم', color: '#e9d5ff' },
  { label: 'خاکستری ملایم', color: '#f1f5f9' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'متن خود را اینجا وارد کنید...',
  minHeight = '110px',
  maxHeight = '240px',
  variant = 'default',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState('13px');

  // Sync incoming value to editor content if external value changed
  useEffect(() => {
    if (editorRef.current) {
      if (isUpdatingRef.current) {
        isUpdatingRef.current = false;
        return;
      }
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    // Normalize empty content
    if (html === '<br>' || html === '<p><br></p>' || html === '<div><br></div>') {
      onChange('');
    } else {
      onChange(html);
    }
  }, [onChange]);

  const exec = (command: string, arg: string | undefined = undefined) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, arg);
    handleInput();
  };

  const applyFontSize = (sizePx: string) => {
    setActiveFontSize(sizePx);
    setFontSizeMenuOpen(false);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      // Insert empty styled span for new text
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.selectNodeContents(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Wrap selection in span
      const fragment = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.appendChild(fragment);
      range.insertNode(span);

      range.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    handleInput();
  };

  const applyTextColor = (color: string) => {
    setColorMenuOpen(false);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    handleInput();
  };

  const applyHighlightColor = (color: string) => {
    setHighlightMenuOpen(false);
    document.execCommand('styleWithCSS', false, 'true');
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, undefined);
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    handleInput();
  };

  // Close menus on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rte-popover') && !target.closest('.rte-trigger')) {
        setFontSizeMenuOpen(false);
        setColorMenuOpen(false);
        setHighlightMenuOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const variantStyles = {
    rose: {
      wrapper: 'border-rose-200 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200/50 bg-white',
      toolbar: 'bg-rose-50/80 border-b border-rose-200/90',
      activeBtn: 'bg-rose-200/70 text-rose-900',
    },
    emerald: {
      wrapper: 'border-emerald-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200/50 bg-white',
      toolbar: 'bg-emerald-50/80 border-b border-emerald-200/90',
      activeBtn: 'bg-emerald-200/70 text-emerald-900',
    },
    default: {
      wrapper: 'border-[#DDDBCF] focus-within:border-[#545D4B] focus-within:ring-2 focus-within:ring-[#545D4B]/20 bg-white',
      toolbar: 'bg-[#F6F5F0] border-b border-[#DDDBCF]',
      activeBtn: 'bg-[#E5E3D8] text-[#2D2C28]',
    }
  };

  const currentTheme = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all shadow-xs flex flex-col ${currentTheme.wrapper} ${className}`}
      dir="rtl"
    >
      {/* Rich Text Toolbar */}
      <div
        className={`px-2 py-1.5 flex flex-wrap items-center gap-1 select-none shrink-0 ${currentTheme.toolbar}`}
      >
        {/* Font Size Selector */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setFontSizeMenuOpen(!fontSizeMenuOpen);
              setColorMenuOpen(false);
              setHighlightMenuOpen(false);
            }}
            className="rte-trigger flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D5D3C8] hover:bg-slate-50 text-[11px] font-bold text-[#2D2C28] transition cursor-pointer shadow-2xs"
            title="اندازه فونت"
          >
            <Type className="w-3.5 h-3.5 text-[#545D4B]" />
            <span>{FONT_SIZES.find(s => s.size === activeFontSize)?.label.split(' ')[0] || '۱۴px'}</span>
            <ChevronDown className="w-3 h-3 text-[#8A8880]" />
          </button>

          {fontSizeMenuOpen && (
            <div className="rte-popover absolute top-full mt-1 right-0 w-44 bg-white rounded-xl shadow-xl border border-[#DDDBCF] py-1 z-30">
              <div className="text-[10px] font-bold text-[#8A8880] px-2.5 py-1 border-b border-[#F0EFEA]">
                اندازه قلم:
              </div>
              <div className="max-h-48 overflow-y-auto py-0.5">
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.size}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFontSize(f.size);
                    }}
                    className={`w-full text-right px-2.5 py-1.5 text-xs font-bold hover:bg-[#F5F5F0] transition flex items-center justify-between cursor-pointer ${
                      activeFontSize === f.size ? 'bg-indigo-50 text-indigo-700' : 'text-[#2D2C28]'
                    }`}
                  >
                    <span style={{ fontSize: f.size }}>{f.label}</span>
                    {activeFontSize === f.size && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setColorMenuOpen(!colorMenuOpen);
              setFontSizeMenuOpen(false);
              setHighlightMenuOpen(false);
            }}
            className="rte-trigger flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D5D3C8] hover:bg-slate-50 text-[11px] font-bold text-[#2D2C28] transition cursor-pointer shadow-2xs"
            title="رنگ متن"
          >
            <Palette className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">رنگ متن</span>
            <ChevronDown className="w-3 h-3 text-[#8A8880]" />
          </button>

          {colorMenuOpen && (
            <div className="rte-popover absolute top-full mt-1 right-0 w-52 bg-white rounded-xl shadow-xl border border-[#DDDBCF] p-2 z-30">
              <div className="text-[10px] font-bold text-[#8A8880] mb-1.5 pb-1 border-b border-[#F0EFEA]">
                انتخاب رنگ نوشته:
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyTextColor(c.color);
                    }}
                    className="w-7 h-7 rounded-lg border border-slate-300 hover:scale-110 transition shadow-2xs flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#F0EFEA] text-[11px]">
                <span className="text-[#75746E]">رنگ دلخواه:</span>
                <input
                  type="color"
                  onChange={(e) => applyTextColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  title="پالت کامل رنگ"
                />
              </div>
            </div>
          )}
        </div>

        {/* Text Highlight Color */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setHighlightMenuOpen(!highlightMenuOpen);
              setFontSizeMenuOpen(false);
              setColorMenuOpen(false);
            }}
            className="rte-trigger flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D5D3C8] hover:bg-slate-50 text-[11px] font-bold text-[#2D2C28] transition cursor-pointer shadow-2xs"
            title="هایلایت و رنگ پس‌زمینه متن"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">هایلایت</span>
            <ChevronDown className="w-3 h-3 text-[#8A8880]" />
          </button>

          {highlightMenuOpen && (
            <div className="rte-popover absolute top-full mt-1 right-0 w-48 bg-white rounded-xl shadow-xl border border-[#DDDBCF] p-2 z-30">
              <div className="text-[10px] font-bold text-[#8A8880] mb-1.5 pb-1 border-b border-[#F0EFEA]">
                رنگ زمینه / هایلایت:
              </div>
              <div className="space-y-1">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.color}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlightColor(h.color);
                    }}
                    className="w-full text-right px-2 py-1 rounded-lg text-xs font-medium hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition"
                  >
                    <span
                      className="w-4 h-4 rounded-md border border-slate-300 shrink-0"
                      style={{ backgroundColor: h.color === 'transparent' ? '#ffffff' : h.color }}
                    />
                    <span className="text-[#2D2C28] text-[11px]">{h.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[#D5D3C8] mx-0.5" />

        {/* Basic Styles (Bold, Italic, Underline, Strikethrough) */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('bold');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded font-black text-xs transition cursor-pointer"
            title="ضخیم / Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('italic');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="مورب / Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('underline');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="زیرخط / Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('strikeThrough');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="خط‌خورده / Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('justifyRight');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="راست‌چین"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('justifyCenter');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="وسط‌چین"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('justifyLeft');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="چپ‌چین"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('justifyFull');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="تراز دوطرفه"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('insertUnorderedList');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="لیست گلوله‌ای / بالت‌دار"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('insertOrderedList');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer"
            title="لیست عددی / شماره‌دار"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Utilities: Clear formatting, Undo, Redo */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs mr-auto">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('removeFormat');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-rose-600 rounded text-xs transition cursor-pointer"
            title="پاک‌کردن تمام فرمت‌ها"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('undo');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#545D4B] rounded text-xs transition cursor-pointer"
            title="واگرد (Undo)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec('redo');
            }}
            className="p-1 hover:bg-[#EFEFEA] text-[#545D4B] rounded text-xs transition cursor-pointer"
            title="ازنو (Redo)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight, maxHeight }}
        className="w-full p-3.5 text-xs text-[#2D2C28] outline-none overflow-y-auto leading-relaxed font-medium transition empty:before:content-[attr(data-placeholder)] empty:before:text-[#9A9890] empty:before:pointer-events-none custom-scrollbar"
        data-placeholder={placeholder}
        dir="rtl"
      />
    </div>
  );
};
