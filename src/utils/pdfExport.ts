import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProcessedEraItem } from '../types';
import { getProcessPresentation, ProcessPresentationDetail } from '../data/presentationTemplates';

// Persian number formatter
const toPersianDigits = (n: number | string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => farsiDigits[parseInt(d, 10)] || d);
};

export interface PdfExportProgressCallback {
  (current: number, total: number, message: string): void;
}

export async function generatePresentationPdf(
  items: ProcessedEraItem[],
  onProgress?: PdfExportProgressCallback
): Promise<void> {
  const slideItems = items.filter(it => it.isSelectedForSlide);
  const targetItems = slideItems.length > 0 ? slideItems : items;

  if (targetItems.length === 0) {
    throw new Error('هیچ فرآیندی برای ایجاد فایل PDF انتخاب نشده است.');
  }

  // Create temporary container for rendering slides
  const exportContainer = document.createElement('div');
  exportContainer.style.position = 'fixed';
  exportContainer.style.left = '-9999px';
  exportContainer.style.top = '-9999px';
  exportContainer.style.width = '1280px';
  exportContainer.style.backgroundColor = '#0F172A';
  exportContainer.style.color = '#FFFFFF';
  exportContainer.style.fontFamily = 'Vazirmatn, Tahoma, sans-serif';
  exportContainer.style.direction = 'rtl';
  document.body.appendChild(exportContainer);

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

    const totalSteps = targetItems.length + 1; // 1 cover + N slides

    // 1. RENDER COVER PAGE
    if (onProgress) onProgress(1, totalSteps, 'در حال آماده‌سازی جلد گزارش...');

    const coverElement = createCoverHtml(targetItems);
    exportContainer.innerHTML = '';
    exportContainer.appendChild(coverElement);

    // Allow images/styles to settle
    await new Promise(resolve => setTimeout(resolve, 200));

    const coverCanvas = await html2canvas(coverElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0B1120',
      logging: false,
      width: 1280,
      height: 720
    });

    const coverImgData = coverCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(coverImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // 2. RENDER EACH PROCESS SLIDE
    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      if (onProgress) {
        onProgress(i + 2, totalSteps, `در حال ایجاد اسلاید ${toPersianDigits(i + 1)} از ${toPersianDigits(targetItems.length)}: ${item.processName}`);
      }

      pdf.addPage();

      const slideElement = createSlideHtml(item, i + 1, targetItems.length);
      exportContainer.innerHTML = '';
      exportContainer.appendChild(slideElement);

      // Wait a moment for any DOM reflow / images
      await new Promise(resolve => setTimeout(resolve, 150));

      const slideCanvas = await html2canvas(slideElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0F172A',
        logging: false,
        width: 1280,
        height: 720
      });

      const slideImgData = slideCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(slideImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    if (onProgress) onProgress(totalSteps, totalSteps, 'در حال ذخیره و دانلود فایل PDF...');

    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now).replace(/\//g, '-');

    const fileName = `گزارش_ارائه_فرآیندهای_ERA_${dateStr}.pdf`;
    pdf.save(fileName);
  } finally {
    if (document.body.contains(exportContainer)) {
      document.body.removeChild(exportContainer);
    }
  }
}

// Helper to create the Presentation Cover Slide
function createCoverHtml(items: ProcessedEraItem[]): HTMLElement {
  const el = document.createElement('div');
  el.style.width = '1280px';
  el.style.height = '720px';
  el.style.boxSizing = 'border-box';
  el.style.padding = '50px 70px';
  el.style.background = 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #1E293B 100%)';
  el.style.color = '#FFFFFF';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.justifyContent = 'space-between';
  el.style.position = 'relative';
  el.style.overflow = 'hidden';

  const creationCount = items.filter(i => i.operationType === 'جدید').length;
  const fixCount = items.filter(i => i.operationType === 'اصلاح').length;

  const nowFormatted = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  el.innerHTML = `
    <!-- Top Header Badge -->
    <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: linear-gradient(135deg, #2563EB, #4F46E5); padding: 10px 16px; border-radius: 14px; font-weight: 900; font-size: 18px; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
          ERA SYSTEM
        </div>
        <span style="color: #94A3B8; font-size: 14px; font-weight: 600;">سامانه جامع اتوماسیون و گردش الکترونیکی فرآیندها</span>
      </div>
      <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 8px 18px; border-radius: 20px; font-size: 13px; color: #CBD5E1; font-weight: bold;">
        ${nowFormatted}
      </div>
    </div>

    <!-- Center Content / Main Title -->
    <div style="z-index: 2; margin-top: -20px;">
      <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(96, 165, 250, 0.3); padding: 6px 16px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #93C5FD; margin-bottom: 18px;">
        گزارش مستندات و دستاوردهای مدیریتی
      </div>
      <h1 style="font-size: 40px; font-weight: 900; line-height: 1.35; margin: 0 0 16px 0; color: #FFFFFF; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
        ارائه جامع فرآیندهای الکترونیکی و مکانیزه (ERA)
      </h1>
      <p style="font-size: 18px; color: #94A3B8; margin: 0; line-height: 1.6; max-width: 850px;">
        مجموعه اسلایدهای مصور معرفی فرم‌های نوین، حذف گلوگاه‌های سنتی، شفاف‌سازی جریان گردش کار و ارزیابی شاخص‌های اثرگذاری زمان و هزینه
      </p>
    </div>

    <!-- Bottom Stat Summary Cards -->
    <div style="display: flex; gap: 20px; align-items: stretch; z-index: 2;">
      <div style="flex: 1; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 18px; padding: 18px 24px;">
        <div style="font-size: 12px; color: #94A3B8; font-weight: bold; margin-bottom: 6px;">مجموع فرآیندهای ارائه شده</div>
        <div style="font-size: 28px; font-weight: 900; color: #38BDF8;">${toPersianDigits(items.length)} <span style="font-size: 14px; font-weight: normal; color: #CBD5E1;">فرآیند</span></div>
      </div>
      <div style="flex: 1; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 18px; padding: 18px 24px;">
        <div style="font-size: 12px; color: #94A3B8; font-weight: bold; margin-bottom: 6px;">فرآیندهای جدید (فرم‌های راه‌اندازی شده)</div>
        <div style="font-size: 28px; font-weight: 900; color: #34D399;">${toPersianDigits(creationCount)} <span style="font-size: 14px; font-weight: normal; color: #CBD5E1;">مورد</span></div>
      </div>
      <div style="flex: 1; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 18px; padding: 18px 24px;">
        <div style="font-size: 12px; color: #94A3B8; font-weight: bold; margin-bottom: 6px;">بهینه‌سازی و رفع خطاهای سیستمی</div>
        <div style="font-size: 28px; font-weight: 900; color: #FBBF24;">${toPersianDigits(fixCount)} <span style="font-size: 14px; font-weight: normal; color: #CBD5E1;">مورد</span></div>
      </div>
    </div>
  `;

  return el;
}

// Helper to create Individual Slide Page
function createSlideHtml(item: ProcessedEraItem, pageNum: number, totalPages: number): HTMLElement {
  const isCreation = item.operationType === 'جدید';

  let presentation: ProcessPresentationDetail | null = null;
  try {
    presentation = getProcessPresentation(
      item.processName || '',
      item.orgUnit || '',
      item.operationType || 'اصلاح',
      item.description || ''
    );
  } catch (e) {
    console.warn(e);
  }

  // Load custom or template images
  let images: string[] = [];
  if (item.formImages && Array.isArray(item.formImages) && item.formImages.length > 0) {
    images = item.formImages.filter(Boolean);
  } else if (item.formImageUrl) {
    images = [item.formImageUrl];
  } else {
    try {
      if (typeof window !== 'undefined') {
        const cachedJson = localStorage.getItem(`era_form_imgs_${item.id}`) || localStorage.getItem(`era_form_imgs_${item.processName}`);
        if (cachedJson) {
          const parsed = JSON.parse(cachedJson);
          if (Array.isArray(parsed) && parsed.length > 0) images = parsed.filter(Boolean);
        } else {
          const singleCached = localStorage.getItem(`era_form_img_${item.id}`) || localStorage.getItem(`era_form_img_${item.processName}`);
          if (singleCached) images = [singleCached];
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  if (images.length === 0 && presentation) {
    if (presentation.formImages && Array.isArray(presentation.formImages) && presentation.formImages.length > 0) {
      images = presentation.formImages;
    } else if (presentation.formImageUrl) {
      images = [presentation.formImageUrl];
    }
  }

  // Achievements List
  let userBenefits: string[] = [];
  if (item.achievements) {
    if (Array.isArray(item.achievements)) {
      userBenefits = item.achievements.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof item.achievements === 'string') {
      userBenefits = item.achievements.split('\n').map(s => s.trim()).filter(Boolean);
    }
  } else if (typeof window !== 'undefined') {
    const cachedAch = localStorage.getItem(`era_achievements_${item.id}`);
    if (cachedAch) {
      userBenefits = cachedAch.split('\n').map(s => s.trim()).filter(Boolean);
    }
  }

  const defaultSampleBenefits = item.processName.includes('ارز') || item.processName.includes('حواله') || item.orgUnit.includes('مالی')
    ? [
        'کاهش زمان تأیید و پرداخت حواله ارزی از ۳ روز کاری به کمتر از ۳ ساعت',
        'شفافیت ۱۰۰٪ تاریخچه تاییدات و پیوست اسناد سوئیفت و تراستی',
        'حذف کامل خطاهای محاسباتی در نرخ تسعیر و سرفصل‌های ارزی',
        'گزارش‌گیری لحظه‌ای برای مدیران از کل تعهدات و پرداختی‌های ارزی شرکت'
      ]
    : (isCreation
        ? (presentation?.afterImprovements && presentation.afterImprovements.length > 0
            ? presentation.afterImprovements
            : ['تسریع چشمگیر در انجام فرآیند و حذف کاغذبازی', 'ثبت دقیق لاگ زمانی و کاربر تاییدکننده', 'دسترسی برخط مدیران به سوابق و گزارش‌ها'])
        : (presentation?.solvedOutcomes && presentation.solvedOutcomes.length > 0
            ? presentation.solvedOutcomes
            : ['رفع کامل باگ‌ها و خطاهای سیستمی', 'تسهیل و روان‌سازی فرآیند برای پرسنل', 'انطباق فرآیند با استانداردهای جدید']));

  const benefitsList: string[] = userBenefits.length > 0 ? userBenefits : defaultSampleBenefits;

  // Visibility toggles
  const showAchievements = item.showAchievements !== undefined
    ? item.showAchievements
    : (typeof window !== 'undefined'
        ? (localStorage.getItem(`era_show_ach_${item.id}`) !== null
            ? localStorage.getItem(`era_show_ach_${item.id}`) === 'true'
            : false)
        : false);

  const showImpactMetrics = item.showImpactMetrics !== undefined
    ? item.showImpactMetrics
    : (typeof window !== 'undefined'
        ? (localStorage.getItem(`era_show_imp_${item.id}`) !== null
            ? localStorage.getItem(`era_show_imp_${item.id}`) === 'true'
            : false)
        : false);

  // Problem / Solution descriptions
  const customProblem = item.problemDescription?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_prob_desc_${item.id}`) : null);
  const beforeText = customProblem
    || (isCreation
        ? (presentation?.beforeDescription || `قبل از ایجاد این فرم در سامانه ERA، درخواست‌ها به صورت سنتی، تلفنی یا کاغذی انجام می‌شد که باعث کندی گردش‌کار و خطای انسانی می‌گردید. (${item.description || ''})`)
        : (presentation?.identifiedProblems && presentation.identifiedProblems.length > 0
            ? presentation.identifiedProblems.join(' - ')
            : item.description || 'نیاز به اصلاح ساختار، دسترسی‌ها یا خطای عملکردی'));

  const customSolution = item.solutionDescription?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_sol_desc_${item.id}`) : null);
  const afterText = customSolution
    || (isCreation
        ? (presentation?.afterDescription || `با راه‌اندازی فرآیند مکانیزه در سامانه ERA، تمام مراحل ثبت و تایید بدون کاغذ و به صورت برخط انجام می‌شود. (${item.description || ''})`)
        : (presentation?.solutionApplied || `تیم فناوری اطلاعات تغییرات لازم را در گردش‌کار اعمال و بهینه‌سازی نمود: ${item.description || ''}`));

  // Metrics
  const customTimeMetric = item.impactTimeMetric?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_time_metric_${item.id}`) : null);
  const customErrorMetric = item.impactErrorMetric?.trim()
    || (typeof window !== 'undefined' ? localStorage.getItem(`era_error_metric_${item.id}`) : null);

  const timeMetric = customTimeMetric
    || presentation?.quantifiableImpact?.timeReduction
    || (item.processName.includes('ارز') || item.processName.includes('حواله')
        ? 'کاهش بیش از ۸۰٪ زمان پردازش حواله‌ها'
        : '۷۰٪ کاهش زمان پردازش');

  const errorMetric = customErrorMetric
    || presentation?.quantifiableImpact?.errorReduction
    || (item.processName.includes('ارز') || item.processName.includes('حواله')
        ? 'صفر شدن خطاهای مغایرت حساب بانکی و تراستی'
        : 'حذف کامل خطاهای کاربری');

  const mainImage = images.length > 0 ? images[0] : null;

  const el = document.createElement('div');
  el.style.width = '1280px';
  el.style.height = '720px';
  el.style.boxSizing = 'border-box';
  el.style.padding = '24px 36px';
  el.style.background = '#0F172A';
  el.style.color = '#FFFFFF';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.justifyContent = 'space-between';
  el.style.position = 'relative';
  el.style.overflow = 'hidden';

  const isAuto = item.operationType === 'اتوماتیک‌سازی' || item.operationType === 'اتوماتیک سازی';
  const typeBadgeColor = isAuto ? '#2563EB' : isCreation ? '#059669' : '#7C3E1D';
  const typeBadgeBg = isAuto ? 'rgba(37, 99, 235, 0.2)' : isCreation ? 'rgba(5, 150, 105, 0.2)' : 'rgba(124, 62, 29, 0.25)';
  const typeBadgeBorder = isAuto ? 'rgba(59, 130, 246, 0.5)' : isCreation ? 'rgba(16, 185, 129, 0.4)' : 'rgba(180, 83, 9, 0.5)';

  el.innerHTML = `
    <!-- Slide Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E293B; padding-bottom: 12px; margin-bottom: 14px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="background: ${typeBadgeBg}; border: 1px solid ${typeBadgeBorder}; color: #FFFFFF; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 20px;">
          ${item.operationType}
        </div>
        <div>
          <h2 style="font-size: 22px; font-weight: 900; margin: 0; color: #FFFFFF; line-height: 1.2;">
            ${item.processName}
          </h2>
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 4px; font-size: 12px; color: #94A3B8;">
            <span style="color: #FCD34D; font-weight: bold;">واحد: ${item.orgUnit}</span>
            <span>|</span>
            <span>تاریخ ثبت/اجرا: ${item.executionDate}</span>
          </div>
        </div>
      </div>

      <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #93C5FD;">
        اسلاید ${toPersianDigits(pageNum)} از ${toPersianDigits(totalPages)}
      </div>
    </div>

    <!-- Main 2-Column Content Grid -->
    <div style="display: grid; grid-template-columns: ${(showAchievements || showImpactMetrics) ? '1.15fr 0.85fr' : '1fr'}; gap: 18px; flex: 1; min-height: 0; align-items: stretch; margin-bottom: 12px;">
      
      <!-- Left Column: Screenshot Frame & Context -->
      <div style="background: #020617; border: 1px solid #1E293B; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
        <div style="font-size: 11px; font-weight: bold; color: #60A5FA; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>نمای فرم الکترونیکی در سامانه ERA</span>
          ${images.length > 1 ? `<span style="color: #94A3B8;">(دارای ${toPersianDigits(images.length)} تصویر پیوست)</span>` : ''}
        </div>
        
        <!-- Screenshot Preview -->
        <div style="flex: 1; min-height: 0; background: #0B1120; border-radius: 12px; border: 1px dashed #334155; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          ${mainImage ? `
            <img src="${mainImage}" style="max-width: 100%; max-height: 290px; object-fit: contain; border-radius: 8px;" />
          ` : `
            <div style="text-align: center; padding: 30px; color: #64748B;">
              <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
              <div style="font-size: 13px; font-weight: bold; color: #94A3B8;">فرم مکانیزه سامانه ERA</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 4px;">طراحی شده بر اساس گردش‌کار استاندارد</div>
            </div>
          `}
        </div>

        <!-- Problem & Solution Summary Strip -->
        <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 10px; font-weight: 900; color: #FCA5A5; margin-bottom: 3px;">
              ${isCreation ? 'وضعیت قبل (چالش‌ها):' : 'علت اصلاح و باگ:'}
            </div>
            <div style="font-size: 10px; color: #E2E8F0; line-height: 1.4; max-height: 48px; overflow: hidden;">
              ${beforeText}
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 8px 10px;">
            <div style="font-size: 10px; font-weight: 900; color: #6EE7B7; margin-bottom: 3px;">
              ${isCreation ? 'وضعیت بعد (مکانیزه):' : 'راهکار اعمال شده:'}
            </div>
            <div style="font-size: 10px; color: #E2E8F0; line-height: 1.4; max-height: 48px; overflow: hidden;">
              ${afterText}
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Achievements & Impact Metrics (Conditionally Shown) -->
      ${(showAchievements || showImpactMetrics) ? `
        <div style="display: flex; flex-direction: column; gap: 12px; justify-content: space-between;">
          
          <!-- Operational Achievements Box -->
          ${showAchievements ? `
            <div style="flex: 1; background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; border-radius: 18px; padding: 14px 18px; display: flex; flex-direction: column;">
              <div style="font-size: 13px; font-weight: 900; color: #34D399; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span>📈</span>
                <span>دستاوردها و نتایج عملیاتی:</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; overflow: hidden; flex: 1;">
                ${benefitsList.slice(0, 4).map(b => `
                  <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; color: #E2E8F0; line-height: 1.45;">
                    <div style="background: rgba(16, 185, 129, 0.2); color: #34D399; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; flex-shrink: 0; margin-top: 1px;">
                      ✓
                    </div>
                    <span>${b}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Impact Metrics Badge Box -->
          ${showImpactMetrics ? `
            <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid #334155; border-radius: 18px; padding: 12px 16px;">
              <div style="font-size: 12px; font-weight: 900; color: #FBBF24; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>⏱️</span>
                <span>شاخص‌های اثرگذاری (Impact KPIs):</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="background: #0B1120; border: 1px solid #1E293B; border-radius: 12px; padding: 8px 10px; text-align: center;">
                  <div style="font-size: 10px; color: #94A3B8; margin-bottom: 3px;">صرفه‌جویی زمان</div>
                  <div style="font-size: 11px; font-weight: 900; color: #34D399; line-height: 1.3;">${timeMetric}</div>
                </div>
                <div style="background: #0B1120; border: 1px solid #1E293B; border-radius: 12px; padding: 8px 10px; text-align: center;">
                  <div style="font-size: 10px; color: #94A3B8; margin-bottom: 3px;">کاهش خطای انسانی</div>
                  <div style="font-size: 11px; font-weight: 900; color: #60A5FA; line-height: 1.3;">${errorMetric}</div>
                </div>
              </div>
            </div>
          ` : ''}

        </div>
      ` : ''}

    </div>

    <!-- Slide Footer -->
    <div style="border-top: 1px solid #1E293B; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B;">
      <span>گزارش عملکرد و دستاوردهای مکانیزاسیون فرآیندها در سامانه ERA</span>
      <span>محرمانه - ویژه ارائه به مدیریت ارشد</span>
    </div>
  `;

  return el;
}
