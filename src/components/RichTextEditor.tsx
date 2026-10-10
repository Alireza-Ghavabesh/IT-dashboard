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
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Heading,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  GripHorizontal
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
  { label: '۱۰px (بسیار ریز)', size: '10px' },
  { label: '۱۲px (ریز)', size: '12px' },
  { label: '۱۳px (کوچک)', size: '13px' },
  { label: '۱۴px (استاندارد)', size: '14px' },
  { label: '۱۶px (متوسط/برجسته)', size: '16px' },
  { label: '۱۸px (بزرگ)', size: '18px' },
  { label: '۲۲px (خیلی بزرگ)', size: '22px' },
  { label: '۲۶px (عنوان اصلی)', size: '26px' },
];

const HEADINGS = [
  { label: 'سرتیتر ۱ (عنوان بزرگ)', tag: 'h1', desc: 'اندازه بزرگ و ضخیم برای تیترهای اصلی' },
  { label: 'سرتیتر ۲ (عنوان متوسط)', tag: 'h2', desc: 'اندازه متوسط برای بخش‌بندی مطالب' },
  { label: 'سرتیتر ۳ (زیرعنوان)', tag: 'h3', desc: 'برای عناوین کوچک و نکات مهم' },
  { label: 'متن عادی (پاراگراف)', tag: 'p', desc: 'متن معمولی بدون حالت سرتیتر' },
] as const;

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
  placeholder = 'متن خود را اینجا بنویسید (می‌توانید با دکمه‌های بالا سرتیتر، لیست نقطه‌ای یا شماره‌دار اضافه کنید)...',
  minHeight = '140px',
  maxHeight = 'none',
  variant = 'default',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const savedRangeRef = useRef<Range | null>(null);

  const initialHeightNumber = parseInt(minHeight, 10) || 140;
  const [editorHeight, setEditorHeight] = useState<number>(initialHeightNumber);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState('14px');

  // Save current selection inside contentEditable
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore saved selection before executing format commands
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    } else if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  // Sync external value to editor HTML
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
    saveSelection();
    const html = editorRef.current.innerHTML;
    // Normalize empty content
    if (
      html === '<br>' ||
      html === '<p><br></p>' ||
      html === '<div><br></div>' ||
      html === '<h1><br></h1>' ||
      html === '<h2><br></h2>' ||
      html === '<h3><br></h3>'
    ) {
      onChange('');
    } else {
      onChange(html);
    }
  }, [onChange, saveSelection]);

  const exec = (command: string, arg: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, arg);
    saveSelection();
    handleInput();
  };

  // Dedicated reliable Heading Formatter (سرتیتر ۱، ۲، ۳ یا متن عادی)
  const applyHeading = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    setHeadingMenuOpen(false);
    restoreSelection();

    let success = false;
    try {
      success = document.execCommand('formatBlock', false, `<${tag}>`);
    } catch {
      success = false;
    }

    if (!success) {
      try {
        success = document.execCommand('formatBlock', false, tag);
      } catch {
        success = false;
      }
    }

    // Fallback: If formatBlock didn't apply (e.g. nested structure), wrap or convert
    if (!success) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const headingEl = document.createElement(tag);
        if (range.collapsed) {
          headingEl.innerHTML = '&#8203;';
          range.insertNode(headingEl);
          range.selectNodeContents(headingEl);
          range.collapse(false);
        } else {
          headingEl.appendChild(range.extractContents());
          range.insertNode(headingEl);
          range.selectNodeContents(headingEl);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    saveSelection();
    handleInput();
  };

  // Dedicated reliable List Formatter (لیست نقطه‌ای / لیست شماره‌دار مانند ورد)
  const applyList = (type: 'unordered' | 'ordered') => {
    restoreSelection();
    const cmd = type === 'unordered' ? 'insertUnorderedList' : 'insertOrderedList';
    document.execCommand(cmd, false);
    saveSelection();
    handleInput();
  };

  const applyFontSize = (sizePx: string) => {
    setActiveFontSize(sizePx);
    setFontSizeMenuOpen(false);
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.selectNodeContents(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const fragment = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.appendChild(fragment);
      range.insertNode(span);
      range.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    saveSelection();
    handleInput();
  };

  const applyTextColor = (color: string) => {
    setColorMenuOpen(false);
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    saveSelection();
    handleInput();
  };

  const applyHighlightColor = (color: string) => {
    setHighlightMenuOpen(false);
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, undefined);
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    saveSelection();
    handleInput();
  };

  // Close popup menus on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rte-popover') && !target.closest('.rte-trigger')) {
        setHeadingMenuOpen(false);
        setFontSizeMenuOpen(false);
        setColorMenuOpen(false);
        setHighlightMenuOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Draggable height resize handler
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorRef.current ? editorRef.current.offsetHeight : editorHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newH = Math.max(90, Math.min(800, startHeight + deltaY));
      setEditorHeight(newH);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const increaseHeight = () => {
    setEditorHeight(prev => Math.min(800, prev + 60));
  };

  const decreaseHeight = () => {
    setEditorHeight(prev => Math.max(100, prev - 60));
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  const variantStyles = {
    rose: {
      wrapper: 'border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200/60 bg-white',
      toolbar: 'bg-[#FFF8F7] border-b border-rose-200',
      activeBtn: 'bg-rose-200 text-rose-950 font-bold',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      bottomBar: 'bg-[#FFF5F4] border-t border-rose-200/80 text-rose-800',
    },
    emerald: {
      wrapper: 'border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200/60 bg-white',
      toolbar: 'bg-[#F0FDF4] border-b border-emerald-200',
      activeBtn: 'bg-emerald-200 text-emerald-950 font-bold',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bottomBar: 'bg-[#EBFDF0] border-t border-emerald-200/80 text-emerald-800',
    },
    default: {
      wrapper: 'border-[#DDDBCF] focus-within:border-[#545D4B] focus-within:ring-2 focus-within:ring-[#545D4B]/20 bg-white',
      toolbar: 'bg-[#F6F5F0] border-b border-[#DDDBCF]',
      activeBtn: 'bg-[#E5E3D8] text-[#2D2C28]',
      badge: 'bg-[#EFEFEA] text-[#2D2C28] border-[#DDDBCF]',
      bottomBar: 'bg-[#F6F5F0] border-t border-[#DDDBCF] text-[#75746E]',
    }
  };

  const currentTheme = variantStyles[variant] || variantStyles.default;

  const currentEffectiveHeight = isExpanded ? 380 : editorHeight;

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border overflow-hidden transition-all shadow-xs flex flex-col ${currentTheme.wrapper} ${className}`}
      dir="rtl"
    >
      {/* Rich Text Toolbar */}
      <div
        className={`px-2 py-1.5 flex flex-wrap items-center gap-1 select-none shrink-0 ${currentTheme.toolbar}`}
      >
        {/* 1. سرتیترها (Heading 1, 2, 3, Paragraph) */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setHeadingMenuOpen(!headingMenuOpen);
              setFontSizeMenuOpen(false);
              setColorMenuOpen(false);
              setHighlightMenuOpen(false);
            }}
            className="rte-trigger flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5D3C8] hover:bg-slate-50 text-[11px] font-black text-[#1E293B] transition cursor-pointer shadow-2xs"
            title="انتخاب سبک متن و سرتیتر (سرتیتر ۱، ۲، ۳ یا متن عادی مانند ورد)"
          >
            <Heading className="w-3.5 h-3.5 text-indigo-600" />
            <span>سرتیترها</span>
            <ChevronDown className="w-3 h-3 text-[#8A8880]" />
          </button>

          {headingMenuOpen && (
            <div className="rte-popover absolute top-full mt-1 right-0 w-56 bg-white rounded-xl shadow-xl border border-[#DDDBCF] py-1.5 z-40 animate-in fade-in-50 zoom-in-95">
              <div className="text-[10px] font-bold text-[#8A8880] px-3 py-1 border-b border-[#F0EFEA] mb-1">
                سبک‌های سرتیتر و متن (مانند ورد):
              </div>
              <div className="space-y-0.5 px-1">
                {HEADINGS.map((h) => (
                  <button
                    key={h.tag}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHeading(h.tag);
                    }}
                    className="w-full text-right px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-900 transition flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className={`font-bold ${
                        h.tag === 'h1' ? 'text-sm text-indigo-950 font-black' :
                        h.tag === 'h2' ? 'text-xs text-indigo-900 font-bold' :
                        h.tag === 'h3' ? 'text-xs text-slate-800 font-semibold' : 'text-xs text-slate-700'
                      }`}>
                        {h.label}
                      </span>
                      <span className="text-[9px] text-[#8A8880] group-hover:text-indigo-600">
                        {h.desc}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-slate-100 group-hover:bg-indigo-200 text-slate-600 group-hover:text-indigo-900 px-1.5 py-0.5 rounded font-bold">
                      {h.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. اندازه فونت (Font Size Selector) */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setFontSizeMenuOpen(!fontSizeMenuOpen);
              setHeadingMenuOpen(false);
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
            <div className="rte-popover absolute top-full mt-1 right-0 w-44 bg-white rounded-xl shadow-xl border border-[#DDDBCF] py-1 z-40 animate-in fade-in-50 zoom-in-95">
              <div className="text-[10px] font-bold text-[#8A8880] px-2.5 py-1 border-b border-[#F0EFEA]">
                اندازه قلم:
              </div>
              <div className="max-h-48 overflow-y-auto py-0.5 custom-scrollbar">
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

        {/* 3. دکمه‌های لیست نقطه‌ای و شماره‌دار (Bullets & Numbering like Word) */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyList('unordered');
            }}
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer font-bold"
            title="لیست نقطه‌ای / بالت‌دار (نقطه پشت متن مانند ورد)"
          >
            <List className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[10px] hidden sm:inline">نقطه‌ای (•)</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyList('ordered');
            }}
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-xs transition cursor-pointer font-bold"
            title="لیست عددی / شماره‌دار (شماره ۱، ۲، ۳ پشت متن مانند ورد)"
          >
            <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] hidden sm:inline">شماره‌دار (۱.)</span>
          </button>
        </div>

        {/* 4. رنگ متن */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setColorMenuOpen(!colorMenuOpen);
              setHeadingMenuOpen(false);
              setFontSizeMenuOpen(false);
              setHighlightMenuOpen(false);
            }}
            className="rte-trigger flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#D5D3C8] hover:bg-slate-50 text-[11px] font-bold text-[#2D2C28] transition cursor-pointer shadow-2xs"
            title="رنگ متن"
          >
            <Palette className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">رنگ</span>
            <ChevronDown className="w-3 h-3 text-[#8A8880]" />
          </button>

          {colorMenuOpen && (
            <div className="rte-popover absolute top-full mt-1 right-0 w-52 bg-white rounded-xl shadow-xl border border-[#DDDBCF] p-2 z-40 animate-in fade-in-50 zoom-in-95">
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

        {/* 5. هایلایت متن */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setHighlightMenuOpen(!highlightMenuOpen);
              setHeadingMenuOpen(false);
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
            <div className="rte-popover absolute top-full mt-1 right-0 w-48 bg-white rounded-xl shadow-xl border border-[#DDDBCF] p-2 z-40 animate-in fade-in-50 zoom-in-95">
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

        {/* 6. استایل‌های اصلی (Bold, Italic, Underline, Strikethrough) */}
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

        {/* 7. تراز متن (Alignments) */}
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

        {/* 8. پاک‌کردن، واگرد، ازنو */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs">
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

        {/* 9. دکمه‌های بزرگ‌تر و کوچک‌تر کردن کادر ویرایشگر (تغییر ارتفاع) */}
        <div className="flex items-center gap-0.5 bg-white border border-[#D5D3C8] rounded-lg p-0.5 shadow-2xs mr-auto">
          <button
            type="button"
            onClick={increaseHeight}
            className="px-1.5 py-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
            title="بزرگ‌تر کردن کادر ویرایشگر (افزایش ارتفاع)"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span className="hidden md:inline text-[10px]">بزرگ‌تر</span>
          </button>
          <button
            type="button"
            onClick={decreaseHeight}
            className="px-1.5 py-1 hover:bg-[#EFEFEA] text-[#2D2C28] rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
            title="کوچک‌تر کردن ارتفاع کادر"
          >
            <Minus className="w-3 h-3 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={toggleExpand}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              isExpanded ? 'bg-indigo-100 text-indigo-800 font-bold' : 'hover:bg-[#EFEFEA] text-[#545D4B]'
            }`}
            title={isExpanded ? 'بازگشت به اندازه عادی' : 'گسترش تمام‌صفحه / بزرگ‌نمایی کادر برای نوشتن متن طولانی'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        style={{
          minHeight: `${currentEffectiveHeight}px`,
          height: `${currentEffectiveHeight}px`,
          maxHeight: isExpanded ? '600px' : 'none',
          resize: 'vertical'
        }}
        className="rich-text-editor-canvas rich-text-content w-full p-3.5 text-xs text-[#2D2C28] outline-none overflow-y-auto leading-relaxed font-medium transition empty:before:content-[attr(data-placeholder)] empty:before:text-[#9A9890] empty:before:pointer-events-none custom-scrollbar"
        data-placeholder={placeholder}
        dir="rtl"
      />

      {/* Resizable Bottom Handle Bar */}
      <div
        onMouseDown={handleStartResize}
        className={`px-3 py-1 text-[10px] font-medium flex items-center justify-between cursor-ns-resize select-none border-t ${currentTheme.bottomBar}`}
        title="برای بزرگ‌تر یا کوچک‌تر کردن کادر متن، کلیک کنید و به بالا یا پایین بکشید"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-4 h-4 opacity-70" />
          <span className="hidden sm:inline">برای تغییر ارتفاع کادر بکشید</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ارتفاع: {currentEffectiveHeight}px</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              increaseHeight();
            }}
            className="hover:underline font-bold text-[10px] cursor-pointer"
          >
            + بزرگ‌تر
          </button>
        </div>
      </div>
    </div>
  );
};
