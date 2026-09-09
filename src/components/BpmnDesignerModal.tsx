import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Sparkles,
  FileCode,
  Image as ImageIcon,
  Check,
  AlertCircle,
  FolderOpen,
  Info,
  Maximize,
  Workflow,
  Palette,
  Type
} from 'lucide-react';
// @ts-ignore
import BpmnModeler from 'bpmn-js/lib/Modeler.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import { ProcessedEraItem } from '../types';
import {
  generateStandardBpmnXml,
  generateApprovalBpmnXml,
  generateSimpleBpmnXml,
  generateBlankBpmnXml
} from '../utils/bpmnTemplates';

interface BpmnDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProcessedEraItem | null;
  onSaveBpmn: (itemId: string, bpmnXml: string, bpmnSvg?: string) => Promise<void> | void;
}

const COLOR_PALETTE = [
  { label: 'آبی سازمانی', stroke: '#0284c7', fill: '#e0f2fe', dot: 'bg-sky-500' },
  { label: 'سبز تایید', stroke: '#16a34a', fill: '#dcfce7', dot: 'bg-emerald-500' },
  { label: 'نارنجی بررسی', stroke: '#d97706', fill: '#fef3c7', dot: 'bg-amber-500' },
  { label: 'قرمز خاتمه/رد', stroke: '#dc2626', fill: '#fee2e2', dot: 'bg-rose-500' },
  { label: 'بنفش مدیریتی', stroke: '#7c3aed', fill: '#ede9fe', dot: 'bg-purple-500' },
  { label: 'فیروزه‌ای عملیات', stroke: '#0d9488', fill: '#ccfbf1', dot: 'bg-teal-500' },
  { label: 'خاکستری تیره', stroke: '#475569', fill: '#f1f5f9', dot: 'bg-slate-600' },
  { label: 'سفید کلاسیک', stroke: '#1e293b', fill: '#ffffff', dot: 'bg-white border border-slate-400' },
];

function removeBpmnWatermark(container: HTMLElement | null) {
  if (!container) return;
  const logos = container.querySelectorAll('.bjs-powered-by, a.bjs-powered-by, a[href*="bpmn.io"], [class*="bjs-powered-by"]');
  logos.forEach(el => el.remove());
}

/**
 * Scans the diagram canvas SVG and ensures all connection/sequence-flow labels
 * (and any external diagram labels) have an opaque, rounded Microsoft Visio-style
 * background badge.
 *
 * This completely masks the connector line behind the label text (such as "تایید"),
 * preventing lines from crossing through words and giving a clean enterprise Visio look.
 */
function applyVisioLabelBadges(container: HTMLElement | null) {
  if (!container) return;
  removeBpmnWatermark(container);

  // Select all BPMN label text elements and connection labels in the canvas SVG
  const textElements = container.querySelectorAll<SVGTextElement>(
    '.djs-shape.djs-label text, .djs-connection .djs-label text, g[data-element-id*="_label"] text, .djs-connection text, text.djs-label'
  );

  textElements.forEach((textEl) => {
    const parent = textEl.parentNode as SVGElement | null;
    if (!parent) return;

    const textContent = textEl.textContent?.trim() || '';
    let badge = parent.querySelector(':scope > .visio-label-badge') as SVGRectElement | null;

    // If text is empty or blank, remove any stale badge
    if (!textContent) {
      if (badge) badge.remove();
      return;
    }

    // Measure the exact bounding box of the rendered text
    let bbox: DOMRect | SVGRect | null = null;
    try {
      bbox = textEl.getBBox();
    } catch {
      // Element might be detached or not yet rendered in layout
    }

    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;

    const padX = 12;
    const padY = 5;

    if (bbox && bbox.width > 0 && bbox.height > 0) {
      x = Math.round(bbox.x - padX);
      y = Math.round(bbox.y - padY);
      width = Math.round(bbox.width + padX * 2);
      height = Math.round(bbox.height + padY * 2);
    } else {
      // Robust fallback sizing for Persian typography
      const approxW = Math.max(textContent.length * 12 + 24, 48);
      const approxH = 26;
      x = -approxW / 2;
      y = -approxH / 2;
      width = approxW;
      height = approxH;
    }

    // Smart contextual border & background styling based on Persian workflow terms
    let strokeColor = '#94A3B8'; // Refined Visio slate border
    let fillColor = '#FFFFFF';
    const lower = textContent.toLowerCase();

    if (
      lower.includes('تایید') ||
      lower.includes('تأیید') ||
      lower.includes('موافق') ||
      lower.includes('قبول') ||
      lower.includes('بله')
    ) {
      strokeColor = '#10B981'; // Emerald border
      fillColor = '#FFFFFF';
    } else if (
      lower.includes('رد') ||
      lower.includes('عدم') ||
      lower.includes('مخالف') ||
      lower.includes('لغو') ||
      lower.includes('خیر')
    ) {
      strokeColor = '#EF4444'; // Rose / Red border
      fillColor = '#FFFFFF';
    } else if (
      lower.includes('بررسی') ||
      lower.includes('اصلاح') ||
      lower.includes('کنترل') ||
      lower.includes('بازنگری')
    ) {
      strokeColor = '#F59E0B'; // Amber border
      fillColor = '#FFFFFF';
    }

    if (!badge) {
      badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      badge.setAttribute('class', 'visio-label-badge');
      badge.setAttribute('rx', '6');
      badge.setAttribute('ry', '6');
      badge.setAttribute('pointer-events', 'none'); // Crucial: clicks pass straight through to text for inline editing
      badge.style.filter = 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))';

      // Insert immediately BEFORE <text> in DOM so it renders underneath the text and above the line
      parent.insertBefore(badge, textEl);
    }

    badge.setAttribute('x', String(x));
    badge.setAttribute('y', String(y));
    badge.setAttribute('width', String(width));
    badge.setAttribute('height', String(height));
    badge.setAttribute('fill', fillColor);
    badge.setAttribute('stroke', strokeColor);
    badge.setAttribute('stroke-width', '1.4');

    // Apply inline white halo stroke to text & tspans as an unbreachable secondary barrier
    textEl.style.paintOrder = 'stroke fill';
    textEl.style.stroke = '#ffffff';
    textEl.style.strokeWidth = '9px';
    textEl.style.strokeLinejoin = 'round';
    textEl.style.strokeLinecap = 'round';

    textEl.querySelectorAll('tspan').forEach((ts) => {
      ts.style.paintOrder = 'stroke fill';
      ts.style.stroke = '#ffffff';
      ts.style.strokeWidth = '9px';
      ts.style.strokeLinejoin = 'round';
      ts.style.strokeLinecap = 'round';
    });
  });
}

export const BpmnDesignerModal: React.FC<BpmnDesignerModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveBpmn
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedElementsCount, setSelectedElementsCount] = useState(0);

  // Resize canvas when toggling fullscreen
  useEffect(() => {
    if (!modelerRef.current) return;
    const timer = setTimeout(() => {
      try {
        const canvas = modelerRef.current.get('canvas');
        if (canvas) {
          canvas.resized();
          canvas.zoom('fit-viewport');
        }
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Reliable, direct close handler (no blocking confirm)
  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  }, [onClose]);

  // Keyboard shortcut listener: ESC to close with capture
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleClose]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.bpmn-menu-popover') && !target.closest('.bpmn-menu-trigger')) {
        setColorMenuOpen(false);
        setTemplateMenuOpen(false);
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Auto-colorize all diagram elements with standard enterprise color scheme
  const handleAutoColorize = useCallback(() => {
    if (!modelerRef.current) return;
    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      const modeling = modelerRef.current.get('modeling');
      if (!elementRegistry || !modeling) return;

      const elements = elementRegistry.getAll();
      elements.forEach((el: any) => {
        const type = el.type;
        const name = (el.businessObject?.name || '').trim();

        if (type === 'bpmn:StartEvent') {
          modeling.setColor([el], { stroke: '#16a34a', fill: '#dcfce7' });
        } else if (type === 'bpmn:EndEvent') {
          modeling.setColor([el], { stroke: '#dc2626', fill: '#fee2e2' });
        } else if (
          type === 'bpmn:ExclusiveGateway' ||
          type === 'bpmn:ParallelGateway' ||
          type === 'bpmn:InclusiveGateway' ||
          type === 'bpmn:Gateway'
        ) {
          modeling.setColor([el], { stroke: '#d97706', fill: '#fef3c7' });
        } else if (type === 'bpmn:UserTask') {
          modeling.setColor([el], { stroke: '#0284c7', fill: '#e0f2fe' });
        } else if (type === 'bpmn:ServiceTask') {
          modeling.setColor([el], { stroke: '#0d9488', fill: '#ccfbf1' });
        } else if (type === 'bpmn:SendTask' || type === 'bpmn:ReceiveTask') {
          modeling.setColor([el], { stroke: '#4f46e5', fill: '#ede9fe' });
        } else if (
          type === 'bpmn:Task' ||
          type === 'bpmn:ManualTask' ||
          type === 'bpmn:BusinessRuleTask' ||
          type === 'bpmn:CallActivity'
        ) {
          modeling.setColor([el], { stroke: '#2563eb', fill: '#dbeafe' });
        } else if (type === 'bpmn:Participant') {
          modeling.setColor([el], { stroke: '#1e293b', fill: '#f8fafc' });
        } else if (type === 'bpmn:Lane') {
          modeling.setColor([el], { stroke: '#475569', fill: '#ffffff' });
        } else if (type === 'bpmn:SequenceFlow') {
          if (name.includes('تایید') || name.includes('تأیید') || name.includes('موافق') || name.includes('بله')) {
            modeling.setColor([el], { stroke: '#16a34a' });
          } else if (name.includes('رد') || name.includes('عدم') || name.includes('مخالف') || name.includes('لغو') || name.includes('خیر')) {
            modeling.setColor([el], { stroke: '#dc2626' });
          } else if (name.includes('بررسی') || name.includes('اصلاح') || name.includes('کنترل')) {
            modeling.setColor([el], { stroke: '#d97706' });
          } else {
            modeling.setColor([el], { stroke: '#334155' });
          }
        }
      });
      setHasUnsavedChanges(true);
      if (containerRef.current) {
        applyVisioLabelBadges(containerRef.current);
      }
    } catch (err) {
      console.error('Failed to auto-colorize:', err);
    }
  }, []);

  // Apply custom color to currently selected element(s) or all tasks
  const handleApplyColor = useCallback((stroke: string, fill: string) => {
    if (!modelerRef.current) return;
    try {
      const selection = modelerRef.current.get('selection');
      const modeling = modelerRef.current.get('modeling');
      const elementRegistry = modelerRef.current.get('elementRegistry');
      if (!modeling) return;

      const selected = selection?.get();
      if (selected && selected.length > 0) {
        modeling.setColor(selected, { stroke, fill });
        setHasUnsavedChanges(true);
      } else if (elementRegistry) {
        // If nothing is selected, apply to all tasks on canvas
        const tasks = elementRegistry.filter((el: any) =>
          el.type.includes('Task') || el.type.includes('Activity')
        );
        if (tasks.length > 0) {
          modeling.setColor(tasks, { stroke, fill });
          setHasUnsavedChanges(true);
        }
      }
    } catch (err) {
      console.error('Failed to apply color to selection:', err);
    }
  }, []);

  // Initialize BPMN Modeler
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let modelerInstance: any = null;
    let rafId: number | null = null;
    let observer: MutationObserver | null = null;

    try {
      modelerInstance = new BpmnModeler({
        container: containerRef.current,
        keyboard: {
          bindTo: document
        }
      });
      modelerRef.current = modelerInstance;

      const scheduleBadgeRefresh = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (containerRef.current) {
            applyVisioLabelBadges(containerRef.current);
          }
        });
      };

      // Track changes
      modelerInstance.on('commandStack.changed', () => {
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
        scheduleBadgeRefresh();
      });

      // Track element updates (labels edited, moved, connected, etc.)
      modelerInstance.on('elements.changed', () => {
        scheduleBadgeRefresh();
      });

      // Track direct inline editing completion (e.g. typing "تایید" and pressing Enter)
      modelerInstance.on('directEditing.complete', () => {
        setTimeout(scheduleBadgeRefresh, 50);
      });

      // Track canvas viewport zoom/pan
      modelerInstance.on('canvas.viewbox.changed', () => {
        scheduleBadgeRefresh();
      });

      // Setup MutationObserver to guarantee badges stay synchronized on any SVG DOM mutation
      observer = new MutationObserver(() => {
        scheduleBadgeRefresh();
      });

      if (containerRef.current) {
        observer.observe(containerRef.current, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      // Track selection changes for color palette
      modelerInstance.on('selection.changed', (e: any) => {
        const count = (e.newSelection || []).length;
        setSelectedElementsCount(count);
      });

      // Load initial diagram
      const initialXml =
        item?.bpmnXml ||
        (typeof window !== 'undefined' && item?.id
          ? localStorage.getItem(`era_bpmn_xml_${item.id}`)
          : null) ||
        generateStandardBpmnXml(item?.processName || 'فرآیند سازمانی', item?.orgUnit || 'واحد سازمانی');

      modelerInstance
        .importXML(initialXml)
        .then(() => {
          setIsInitialized(true);
          const canvas = modelerInstance.get('canvas');
          if (canvas) {
            canvas.zoom('fit-viewport');
          }
          setHasUnsavedChanges(false);
          setTimeout(() => {
            scheduleBadgeRefresh();
            // Automatically colorize diagram if plain/uncolored
            try {
              const elementRegistry = modelerInstance.get('elementRegistry');
              if (elementRegistry) {
                const all = elementRegistry.getAll();
                const hasColor = all.some((el: any) => el.di?.bioc?.stroke || el.di?.color?.['border-color']);
                if (!hasColor) {
                  handleAutoColorize();
                  setHasUnsavedChanges(false);
                }
              }
            } catch {}
          }, 100);
        })
        .catch((err: any) => {
          console.error('Error importing BPMN XML:', err);
          setErrorMessage('خطا در بارگذاری دیاگرام BPMN. قالب پیش‌فرض جایگزین شد.');
          const fallbackXml = generateBlankBpmnXml();
          modelerInstance.importXML(fallbackXml).then(() => {
            setIsInitialized(true);
            setTimeout(scheduleBadgeRefresh, 80);
          });
        });
    } catch (err: any) {
      console.error('Failed to create BPMN Modeler:', err);
      setErrorMessage(err.message || 'خطا در مقداردهی اولیه ابزار BPMN.js');
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (observer) {
        observer.disconnect();
      }
      if (modelerInstance) {
        try {
          modelerInstance.destroy();
        } catch {}
        modelerRef.current = null;
      }
      setIsInitialized(false);
      setHasUnsavedChanges(false);
      setSaveSuccess(false);
      setErrorMessage(null);
      setSelectedElementsCount(0);
    };
  }, [isOpen, item?.id, handleAutoColorize]);

  // Load XML into modeler
  const loadXml = useCallback((xmlString: string) => {
    if (!modelerRef.current) return;
    modelerRef.current
      .importXML(xmlString)
      .then(() => {
        const canvas = modelerRef.current.get('canvas');
        if (canvas) canvas.zoom('fit-viewport');
        setHasUnsavedChanges(true);
        setErrorMessage(null);
        setTimeout(() => {
          if (containerRef.current) {
            applyVisioLabelBadges(containerRef.current);
          }
        }, 80);
      })
      .catch((err: any) => {
        console.error('Error loading XML:', err);
        setErrorMessage('فایل BPMN نامعتبر است یا ساختار آن آسیب دیده است.');
      });
  }, []);

  // Zoom controls
  const handleZoom = useCallback((delta: number) => {
    if (!modelerRef.current) return;
    try {
      const zoomScroll = modelerRef.current.get('zoomScroll');
      if (zoomScroll) {
        zoomScroll.stepZoom(delta);
      } else {
        const canvas = modelerRef.current.get('canvas');
        canvas.zoom(canvas.zoom() + delta * 0.2);
      }
    } catch {}
  }, []);

  const handleFitViewport = useCallback(() => {
    if (!modelerRef.current) return;
    try {
      const canvas = modelerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch {}
  }, []);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (!modelerRef.current) return;
    try {
      const commandStack = modelerRef.current.get('commandStack');
      if (commandStack.canUndo()) commandStack.undo();
    } catch {}
  }, []);

  const handleRedo = useCallback(() => {
    if (!modelerRef.current) return;
    try {
      const commandStack = modelerRef.current.get('commandStack');
      if (commandStack.canRedo()) commandStack.redo();
    } catch {}
  }, []);

  // Helper to inject B Titr font and Visio label protection into exported SVG
  const injectTitrFontIntoSvg = (rawSvg: string): string => {
    const titrStyle = `<defs><style>
@font-face {
  font-family: 'B Titr';
  src: local('B Titr'), local('BTitr'), local('Titr'), local('B Titr Bold'), local('Far.Titr'), local('IRANTitr');
  font-weight: 700;
  font-style: normal;
}
text, tspan {
  font-family: 'B Titr', 'Titr', 'BTitr', 'Far.Titr', 'IRANTitr', 'Vazirmatn', system-ui, sans-serif !important;
  font-weight: 700 !important;
}
.djs-label text,
.djs-shape.djs-label text,
text.djs-label,
.djs-connection text,
.djs-connection tspan,
g[data-element-id*="Flow"] text,
g[data-element-id*="Flow"] tspan {
  paint-order: stroke fill !important;
  stroke: #ffffff !important;
  stroke-width: 9px !important;
  stroke-linejoin: round !important;
  stroke-linecap: round !important;
}
.visio-label-badge {
  fill: #ffffff !important;
  fill-opacity: 1 !important;
  rx: 6px !important;
  ry: 6px !important;
}
</style></defs>`;
    return rawSvg.replace(/(<svg[^>]*>)/i, `$1\n${titrStyle}`);
  };

  // Save BPMN handler
  const handleSave = async () => {
    if (!modelerRef.current || !item) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      // Refresh Visio badges before export
      if (containerRef.current) {
        applyVisioLabelBadges(containerRef.current);
      }

      // Export XML
      const { xml } = await modelerRef.current.saveXML({ format: true });

      // Export SVG
      let svgOutput: string | undefined;
      try {
        const { svg } = await modelerRef.current.saveSVG();
        svgOutput = injectTitrFontIntoSvg(svg);
      } catch (svgErr) {
        console.warn('SVG generation failed:', svgErr);
      }

      // Save locally to localStorage for quick restore
      if (typeof window !== 'undefined' && item.id) {
        localStorage.setItem(`era_bpmn_xml_${item.id}`, xml);
        if (svgOutput) {
          localStorage.setItem(`era_bpmn_svg_${item.id}`, svgOutput);
        }
      }

      // Call parent callback to sync with SQLite / React State
      await onSaveBpmn(item.id, xml, svgOutput);

      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error('Error saving BPMN diagram:', err);
      setErrorMessage('خطا در ذخیره‌سازی دیاگرام: ' + (err.message || 'خطای ناشناخته'));
    } finally {
      setIsSaving(false);
    }
  };

  // Export XML file
  const handleDownloadXml = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item?.processName || 'process'}-diagram.bpmn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage('خطا در دانلود فایل XML: ' + err.message);
    }
  };

  // Export SVG file with Titr font and Visio badges
  const handleDownloadSvg = async () => {
    if (!modelerRef.current) return;
    try {
      if (containerRef.current) {
        applyVisioLabelBadges(containerRef.current);
      }
      const { svg } = await modelerRef.current.saveSVG();
      const styledSvg = injectTitrFontIntoSvg(svg);
      const blob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item?.processName || 'process'}-diagram.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage('خطا در دانلود فایل SVG: ' + err.message);
    }
  };

  // Export PNG image file
  const handleDownloadPng = async () => {
    if (!modelerRef.current) return;
    try {
      if (containerRef.current) {
        applyVisioLabelBadges(containerRef.current);
      }
      const { svg } = await modelerRef.current.saveSVG();
      const styledSvg = injectTitrFontIntoSvg(svg);
      const svgBlob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // High-DPI crisp export
        canvas.width = (img.width || 1200) * scale;
        canvas.height = (img.height || 800) * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(blob => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = pngUrl;
              a.download = `${item?.processName || 'process'}-diagram.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(pngUrl);
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (err: any) {
      setErrorMessage('خطا در استخراج تصویر PNG: ' + err.message);
    }
  };

  // Upload local BPMN file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        loadXml(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen || !item) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-white flex flex-col overflow-hidden select-none'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none'
      }
      dir="rtl"
      onClick={(e) => {
        if (!isFullscreen && e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={
          isFullscreen
            ? 'w-full h-full flex flex-col relative bg-white'
            : 'bg-white rounded-2xl shadow-2xl border border-[#DDDBCF] flex flex-col overflow-hidden w-[98vw] max-w-[1600px] h-[95vh] relative'
        }
      >
        {/* Top Header Bar (Only visible in Windowed Popup Mode) */}
        {!isFullscreen && (
          <div className="bg-[#FAFAF7] border-b border-[#DDDBCF] px-4 py-2 sm:px-6 flex items-center justify-between gap-3 shrink-0">
            {/* Title & Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-[#545D4B] text-white flex items-center justify-center shadow-2xs shrink-0">
                <Workflow className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#2D2C28] truncate">
                  {item.processName}
                </h2>
                {item.orgUnit && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF] shrink-0">
                    {item.orgUnit}
                  </span>
                )}
                {item.bpmnXml && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                    <Check className="h-2.5 w-2.5" />
                    ذخیره شده
                  </span>
                )}
              </div>
            </div>

            {/* Quick Top Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Dedicated Fullscreen Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95"
                title="رفتن به حالت تمام‌صفحه و طراحی فقط با ابزارهای پایین"
              >
                <Maximize2 className="h-4 w-4" />
                <span>تمام‌صفحه (فقط ابزارها)</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95"
                title="بستن پنجره (Esc)"
              >
                <X className="h-4 w-4" />
                <span>بستن</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Notification if any */}
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-xs text-rose-700 flex items-center gap-2 shadow-lg z-30">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 mr-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Maximized BPMN Canvas (Occupies full space) */}
        <div className="flex-1 w-full h-full relative bg-white overflow-hidden">
          <div
            ref={containerRef}
            className="w-full h-full select-none bpmn-canvas bpmn-canvas-bg"
            dir="ltr"
            style={{
              outline: 'none',
              background: '#FFFFFF'
            }}
          />
        </div>

        {/* Essential Tools Bar (Floating in Fullscreen, Docked in Windowed mode) */}
        <div
          className={
            isFullscreen
              ? 'fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#DDDBCF] max-w-[96vw] overflow-x-auto'
              : 'bg-[#FAFAF7] border-t border-[#DDDBCF] px-3 py-2 sm:px-5 flex items-center justify-between gap-2 shrink-0 flex-wrap'
          }
          dir="rtl"
        >
          {/* Group 1: Primary Actions (Save & Close) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#545D4B] hover:bg-[#434A3C]'
              } disabled:opacity-50 shrink-0`}
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>ذخیره شد!</span>
                </>
              ) : isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>ذخیره در فرآیند</span>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </>
              )}
            </button>

            {/* Direct Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="بستن طراح BPMN (کلید Esc)"
            >
              <X className="h-4 w-4" />
              <span>بستن</span>
            </button>
          </div>

          <div className="h-5 w-px bg-[#DDDBCF] hidden sm:block shrink-0" />

          {/* Group 2: Canvas Navigation & History */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-[#DDDBCF] rounded-xl overflow-hidden shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => handleZoom(1)}
                className="p-1.5 hover:bg-[#EFEFEA] text-[#545D4B] transition cursor-pointer"
                title="بزرگنمایی (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-1)}
                className="p-1.5 hover:bg-[#EFEFEA] text-[#545D4B] transition cursor-pointer border-x border-[#DDDBCF]"
                title="کوچک‌نمایی (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleFitViewport}
                className="p-1.5 hover:bg-[#EFEFEA] text-[#545D4B] transition cursor-pointer"
                title="تنظیم خودکار با صفحه (Fit)"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center bg-white border border-[#DDDBCF] rounded-xl overflow-hidden shadow-2xs shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                className="p-1.5 hover:bg-[#EFEFEA] text-[#545D4B] transition cursor-pointer"
                title="واگرد (Undo)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                className="p-1.5 hover:bg-[#EFEFEA] text-[#545D4B] transition cursor-pointer border-l border-[#DDDBCF]"
                title="ازنو (Redo)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-5 w-px bg-[#DDDBCF] hidden sm:block shrink-0" />

          {/* Group 3: Design & Styling Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Color Palette Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setColorMenuOpen(!colorMenuOpen);
                  setTemplateMenuOpen(false);
                  setExportMenuOpen(false);
                }}
                className="bpmn-menu-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition shadow-2xs cursor-pointer"
                title="رنگ‌آمیزی هوشمند و پالت رنگ"
              >
                <Palette className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">رنگ‌بندی</span>
              </button>

              {colorMenuOpen && (
                <div
                  className="bpmn-menu-popover absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-64 bg-white rounded-2xl shadow-xl border border-[#DDDBCF] p-2.5 z-40"
                  dir="rtl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoColorize();
                      setColorMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer mb-2 shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>رنگ‌آمیزی هوشمند دیاگرام</span>
                  </button>

                  <div className="text-[11px] font-bold text-[#75746E] mb-1.5 px-1">
                    پالت رنگ برای المان‌های انتخابی:
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.stroke}
                        type="button"
                        onClick={() => {
                          handleApplyColor(c.stroke, c.fill);
                          setColorMenuOpen(false);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer text-[10px]"
                        title={`اعمال ${c.label}`}
                      >
                        <span className={`w-4 h-4 rounded-full ${c.dot} shadow-2xs`} />
                        <span className="truncate w-full text-center text-[#2D2C28]">
                          {c.label.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Templates Selector Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTemplateMenuOpen(!templateMenuOpen);
                  setColorMenuOpen(false);
                  setExportMenuOpen(false);
                }}
                className="bpmn-menu-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition shadow-2xs cursor-pointer"
                title="انتخاب قالب آماده"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="hidden sm:inline">قالب‌ها</span>
              </button>

              {templateMenuOpen && (
                <div
                  className="bpmn-menu-popover absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-56 bg-white rounded-2xl shadow-xl border border-[#DDDBCF] py-1.5 z-40"
                  dir="rtl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      loadXml(generateStandardBpmnXml(item.processName, item.orgUnit));
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>قالب سازمانی (Pool & Lane)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadXml(generateApprovalBpmnXml(item.processName, item.orgUnit));
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>گردش تصویب دوطرفه</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadXml(generateSimpleBpmnXml(item.processName));
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>فرآیند خطی ساده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loadXml(generateBlankBpmnXml());
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>بوم خالی (Blank)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Upload File Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".bpmn,.xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF] transition shadow-2xs cursor-pointer shrink-0"
              title="بارگذاری فایل BPMN از سیستم"
            >
              <Upload className="h-4 w-4" />
            </button>

            {/* Export Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(!exportMenuOpen);
                  setColorMenuOpen(false);
                  setTemplateMenuOpen(false);
                }}
                className="bpmn-menu-trigger flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold transition shadow-2xs cursor-pointer"
                title="دریافت خروجی"
              >
                <Download className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">خروجی</span>
              </button>

              {exportMenuOpen && (
                <div
                  className="bpmn-menu-popover absolute bottom-full mb-2 left-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 w-48 bg-white rounded-2xl shadow-xl border border-[#DDDBCF] py-1.5 z-40"
                  dir="rtl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadPng();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                    <span>تصویر PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadSvg();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                    <span>وکتور SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadXml();
                      setExportMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-1.5 text-xs text-[#2D2C28] hover:bg-[#F5F5F0] font-medium transition cursor-pointer flex items-center gap-2"
                  >
                    <FileCode className="h-3.5 w-3.5 text-blue-600" />
                    <span>فایل BPMN XML</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-5 w-px bg-[#DDDBCF] hidden sm:block shrink-0" />

          {/* Group 4: Fullscreen / Window Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DDDBCF] bg-white hover:bg-[#EFEFEA] text-[#2D2C28] text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'حالت تمام‌صفحه (فقط ابزارها)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 text-[#545D4B]" />
                  <span className="hidden sm:inline">حالت پنجره‌ای</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 text-indigo-600" />
                  <span className="hidden sm:inline">تمام‌صفحه</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
