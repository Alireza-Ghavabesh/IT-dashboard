import { ProcessedEraItem } from '../types';
import { getProcessPresentation, ProcessPresentationDetail } from '../data/presentationTemplates';
import { VAZIRMATN_WOFF2_BASE64 } from './vazirmatnBase64';

const toPersianDigits = (n: number | string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => farsiDigits[parseInt(d, 10)] || d);
};

export function generateStandalonePresentationHtml(
  items: ProcessedEraItem[],
  mode: 'selected' | 'all' = 'selected'
): string {
  const sortSlides = (list: ProcessedEraItem[]) => {
    return [...list].sort((a, b) => {
      const numA = a.slideNumber ?? a.slideOrder ?? 999999;
      const numB = b.slideNumber ?? b.slideOrder ?? 999999;
      if (numA !== numB) return numA - numB;
      return 0;
    });
  };

  let rawTargetItems: ProcessedEraItem[] = [];
  if (mode === 'selected') {
    const slideItems = items.filter(it => it.isSelectedForSlide);
    rawTargetItems = slideItems.length > 0 ? slideItems : items;
  } else {
    rawTargetItems = items;
  }

  const targetItems = sortSlides(rawTargetItems);

  if (targetItems.length === 0) {
    throw new Error('هیچ فرآیندی برای ایجاد فایل ارائه انتخاب نشده است.');
  }

  const creationCount = targetItems.filter(i => i.operationType === 'جدید').length;
  const fixCount = targetItems.filter(i => i.operationType === 'اصلاح').length;

  const nowFormatted = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  // Prepare slides data objects
  const slidesData = targetItems.map((item, idx) => {
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

    // Collect images
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

    return {
      index: idx + 1,
      id: item.id,
      processName: item.processName,
      orgUnit: item.orgUnit,
      operationType: item.operationType,
      isCreation,
      executionDate: item.executionDate,
      images,
      mainImage: images[0] || null,
      beforeText,
      afterText,
      benefitsList,
      showAchievements,
      showImpactMetrics,
      timeMetric,
      errorMetric,
      description: item.description
    };
  });

  const totalSlideCount = slidesData.length + 1; // 1 cover + N slides

  // HTML Template with embedded JS, CSS and slide data
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>گزارش واحد IT (نرم افزار)</title>
  <style>
    @font-face {
      font-family: 'Vazirmatn';
      src: local('Vazirmatn'),
           url('data:font/woff2;base64,${VAZIRMATN_WOFF2_BASE64}') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: #F4F3EE;
      color: #2D2C28;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, sans-serif;
      direction: rtl;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      user-select: none;
    }

    /* App Container */
    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #F4F3EE;
    }

    /* Top Navigation Toolbar */
    .toolbar {
      height: 56px;
      padding: 0 20px;
      background: #FAFAF7;
      border-bottom: 1px solid #DDDBCF;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 50;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-badge {
      background: #545D4B;
      color: white;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 0.5px;
      padding: 5px 12px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(84,93,75,0.25);
    }

    .brand-title {
      font-size: 13px;
      font-weight: 700;
      color: #5A5852;
    }

    .brand-title {
      font-size: 13px;
      font-weight: 700;
      color: #5A5852;
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      background: #FFFFFF;
      color: #2D2C28;
      border: 1px solid #DDDBCF;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .btn:hover:not(:disabled) {
      background: #EFEFEA;
      color: #111827;
      border-color: #CBD5E1;
    }

    .btn:active:not(:disabled) {
      transform: scale(0.96);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #545D4B;
      border-color: #545D4B;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #434A3C;
    }

    .btn-icon {
      padding: 6px 10px;
    }

    .slide-counter {
      background: #EFEFEA;
      border: 1px solid #DDDBCF;
      padding: 4px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      color: #4B5344;
      letter-spacing: 0.5px;
    }

    /* Main Stage */
    .stage {
      flex: 1;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 12px 18px;
      overflow: hidden;
      position: relative;
      background: #F4F3EE;
      width: 100vw;
      height: calc(100vh - 56px);
    }

    /* Slide Card Frame - Fluid & Full Screen */
    .slide-frame {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      background: #FFFFFF;
      border: 1px solid #DDDBCF;
      border-radius: 20px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
      padding: 20px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      animation: fadeIn 0.2s ease-out;
    }

    /* Fullscreen Presentation Mode - Fills display with zero wasted space */
    :fullscreen #app,
    :-webkit-full-screen #app,
    body.is-fullscreen #app {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    :fullscreen .toolbar,
    :-webkit-full-screen .toolbar,
    body.is-fullscreen .toolbar {
      height: 48px;
      padding: 0 16px;
    }

    :fullscreen .stage,
    :-webkit-full-screen .stage,
    body.is-fullscreen .stage {
      padding: 6px 10px !important;
      background: #EAE9E3 !important;
      width: 100vw !important;
      height: calc(100vh - 48px) !important;
    }

    :fullscreen .slide-frame,
    :-webkit-full-screen .slide-frame,
    body.is-fullscreen .slide-frame {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      border-radius: 14px !important;
      padding: 18px 24px !important;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08) !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }

    /* COVER SLIDE */
    .cover-slide {
      background: #FFFFFF;
      padding: clamp(24px, 4vw, 56px);
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .cover-center-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      margin: auto;
    }

    .cover-main-title {
      font-size: clamp(38px, 4.5vw, 64px);
      font-weight: 900;
      color: #1E293B;
      line-height: 1.35;
      text-align: center;
      margin: 0;
      letter-spacing: -0.5px;
    }

    /* PROCESS SLIDE */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #E8E6DF;
      padding-bottom: 10px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }

    .slide-title-area {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .badge-op {
      font-weight: 800;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .badge-new {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
    }

    .badge-auto {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1D4ED8;
    }

    .badge-fix {
      background: #FDF6F0;
      border: 1px solid #E8D5C4;
      color: #7C3E1D;
    }

    .slide-title {
      font-size: clamp(20px, 1.8vw, 28px);
      font-weight: 900;
      color: #2D2C28;
      margin: 0;
      line-height: 1.25;
    }

    .slide-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 4px;
      font-size: 12px;
      color: #75746E;
    }

    .slide-body {
      display: grid;
      gap: 16px;
      flex: 1;
      min-height: 0;
      align-items: stretch;
      margin-bottom: 8px;
    }

    .slide-body-2col {
      grid-template-columns: 1.18fr 0.82fr;
    }

    .slide-body-1col {
      grid-template-columns: 1fr;
    }

    /* Left Screenshot Frame */
    .screenshot-col {
      background: #FAFAF7;
      border: 1px solid #DDDBCF;
      border-radius: 16px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
      min-height: 0;
      height: 100%;
    }

    .screenshot-title {
      font-size: 11px;
      font-weight: bold;
      color: #545D4B;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .img-counter-pill {
      font-size: 11px;
      font-weight: 800;
      background: #EFEFEA;
      border: 1px solid #DDDBCF;
      color: #545D4B;
      padding: 2px 8px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .screenshot-stage-wrapper {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .screenshot-stage {
      flex: 1;
      min-height: 0;
      height: 100%;
      width: 100%;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px dashed #DDDBCF;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: pan-y;
    }

    .screenshot-stage.is-dragging {
      cursor: grabbing;
    }

    .image-slider-track {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      pointer-events: none;
    }

    .image-slider-track img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
      user-select: none;
      -webkit-user-drag: none;
    }

    .img-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      background: rgba(45, 44, 40, 0.75);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: all 0.2s ease;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .img-nav-btn:hover {
      background: #2D2C28;
      transform: translateY(-50%) scale(1.12);
      border-color: rgba(255, 255, 255, 0.7);
    }

    .img-nav-btn.img-nav-prev {
      right: 10px;
    }

    .img-nav-btn.img-nav-next {
      left: 10px;
    }

    .swipe-hint-pill {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(45, 44, 40, 0.72);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      font-size: 10px;
      padding: 3px 12px;
      border-radius: 20px;
      pointer-events: none;
      opacity: 0.9;
      white-space: nowrap;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.15);
      letter-spacing: 0.2px;
      z-index: 5;
    }

    .zoom-badge-btn {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 8;
      background: rgba(45, 44, 40, 0.75);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 10.5px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      backdrop-filter: blur(4px);
      transition: all 0.15s ease;
    }

    .zoom-badge-btn:hover {
      background: #2D2C28;
      transform: scale(1.04);
    }

    .thumbnail-strip {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
      padding-top: 8px;
      border-top: 1px solid #E8E6DF;
      margin-top: 6px;
      overflow-x: auto;
      flex-shrink: 0;
      max-width: 100%;
    }

    .thumb-btn {
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #DDDBCF;
      padding: 1px;
      background: #FFFFFF;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .thumb-btn:hover {
      border-color: #75746E;
    }

    .thumb-btn.active {
      border-color: #545D4B;
      transform: scale(1.08);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .thumb-btn img {
      width: 44px;
      height: 28px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
    }

    .thumb-num {
      position: absolute;
      bottom: 1px;
      right: 2px;
      font-size: 8px;
      font-weight: 900;
      background: rgba(0, 0, 0, 0.75);
      color: #FFFFFF;
      padding: 0 3px;
      border-radius: 2px;
      font-family: monospace;
    }

    .summary-strip {
      margin-top: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      flex-shrink: 0;
    }

    .summary-box {
      border-radius: 12px;
      padding: 10px 14px;
    }

    .box-red {
      background: #FFF1F2;
      border: 1px solid #FECDD3;
    }

    .box-green {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
    }

    .box-label {
      font-size: 11px;
      font-weight: 900;
      margin-bottom: 3px;
    }

    .box-red .box-label {
      color: #9F1239;
    }

    .box-green .box-label {
      color: #166534;
    }

    .box-content {
      font-size: 12px;
      color: #2D2C28;
      line-height: 1.5;
      max-height: 85px;
      overflow-y: auto;
    }

    /* Right Details Column */
    .details-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: space-between;
      min-height: 0;
      height: 100%;
    }

    .achievements-box {
      flex: 1;
      min-height: 0;
      background: #FFFFFF;
      border: 1px solid #DDDBCF;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .achievements-title {
      font-size: 14px;
      font-weight: 900;
      color: #065F46;
      border-bottom: 1px solid #E8E6DF;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .achievements-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      flex: 1;
    }

    .ach-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12.5px;
      color: #2D2C28;
      line-height: 1.55;
    }

    .ach-tick {
      background: #D1FAE5;
      color: #065F46;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .metrics-box {
      background: #FAFAF7;
      border: 1px solid #DDDBCF;
      border-radius: 16px;
      padding: 12px 18px;
      flex-shrink: 0;
    }

    .metrics-title {
      font-size: 13px;
      font-weight: 900;
      color: #545D4B;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #DDDBCF;
      border-radius: 12px;
      padding: 10px 12px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .metric-name {
      font-size: 11px;
      color: #75746E;
      margin-bottom: 3px;
      font-weight: bold;
    }

    .metric-val {
      font-size: 13.5px;
      font-weight: 900;
      line-height: 1.3;
      color: #2D2C28;
    }

    /* Footer */
    .slide-footer {
      border-top: 1px solid #E8E6DF;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #75746E;
      flex-shrink: 0;
    }

    /* Drawer / Slide Outline Grid */
    #outlineModal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(45, 44, 40, 0.65);
      backdrop-filter: blur(8px);
      z-index: 100;
      padding: 40px;
      align-items: center;
      justify-content: center;
    }

    .outline-content {
      background: #FDFDFB;
      border: 1.5px solid #DDDBCF;
      border-radius: 24px;
      max-width: 980px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(45, 44, 40, 0.25);
    }

    .outline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #E8E6DF;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }

    .outline-title-text {
      font-size: 16px;
      font-weight: 900;
      color: #2D2C28;
    }

    .outline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
      overflow-y: auto;
      padding-right: 4px;
      padding-left: 4px;
      padding-bottom: 6px;
    }

    .outline-item {
      background: #FFFFFF;
      border: 1.5px solid #DDDBCF;
      border-radius: 14px;
      padding: 12px 14px;
      cursor: pointer;
      text-align: right;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .outline-item:hover {
      border-color: #545D4B;
      background: #F4F3EE;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(45, 44, 40, 0.08);
    }

    .outline-item.active {
      border-color: #545D4B;
      background: #EFEFEA;
      box-shadow: 0 0 0 2px #545D4B, 0 4px 12px rgba(45, 44, 40, 0.12);
    }

    .outline-item-badge {
      font-size: 11px;
      font-weight: 700;
      color: #545D4B;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .outline-item-title {
      font-size: 13px;
      font-weight: 900;
      color: #2D2C28;
      line-height: 1.45;
    }

    .outline-item-unit {
      font-size: 11px;
      font-weight: 600;
      color: #75746E;
    }

    /* Zoom Modal */
    #zoomModal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(12px);
      z-index: 110;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .zoom-dialog {
      width: 100%;
      height: 100%;
      max-width: 96vw;
      max-height: 94vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .zoom-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: rgba(30, 30, 30, 0.7);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      margin-bottom: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .zoom-title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .zoom-title {
      font-size: 14px;
      font-weight: 800;
      color: #FFFFFF;
    }

    .zoom-body {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .zoom-img-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    #zoomImg {
      max-width: 94vw;
      max-height: calc(88vh - 100px);
      object-fit: contain;
      border-radius: 10px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9);
      user-select: none;
      -webkit-user-drag: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .zoom-thumbnails {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      padding: 8px 0 2px 0;
      overflow-x: auto;
      flex-shrink: 0;
    }

    /* Print styles */
    @media print {
      body, #app {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        color: black !important;
      }
      .toolbar, #outlineModal, #zoomModal {
        display: none !important;
      }
      .slide-frame {
        page-break-after: always;
        height: 100vh;
        max-height: none;
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div id="app">
    <!-- Top Toolbar -->
    <header class="toolbar">
      <div class="brand">
        <div class="brand-badge">گزارش ارائه</div>
        <span class="brand-title">گزارش واحد IT (نرم افزار)</span>
      </div>

      <div class="nav-controls">
        <button class="btn btn-icon" id="btnPrev" title="اسلاید قبلی (کلید ←)">
          <span>قبلی</span>
          <span>▶</span>
        </button>

        <div class="slide-counter" id="slideCounter">
          اسلاید ۱ از ${toPersianDigits(totalSlideCount)}
        </div>

        <button class="btn btn-icon btn-primary" id="btnNext" title="اسلاید بعدی (کلید → یا Space)">
          <span>◀</span>
          <span>بعدی</span>
        </button>

        <button class="btn" id="btnOutline" title="مشاهده فهرست تمام اسلایدها">
          <span>📋 فهرست اسلایدها</span>
        </button>

        <button class="btn" id="btnFullscreen" title="حالت تمام‌صفحه (کلید F)">
          <span>⛶ تمام‌صفحه</span>
        </button>
      </div>
    </header>

    <!-- Stage Area -->
    <main class="stage" id="stageContainer">
      <!-- Slides will be rendered here by JS -->
    </main>
  </div>

  <!-- Outline List Modal -->
  <div id="outlineModal" onclick="handleOutlineBackdropClick(event)">
    <div class="outline-content" onclick="event.stopPropagation()">
      <div class="outline-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">📋</span>
          <h3 class="outline-title-text">فهرست اسلایدهای ارائه</h3>
        </div>
        <button class="btn" id="btnCloseOutline" onclick="closeOutline()" style="padding: 6px 14px; font-weight: bold;">✕ بستن (ESC)</button>
      </div>
      <div class="outline-grid" id="outlineGrid"></div>
    </div>
  </div>

  <!-- Zoom Modal -->
  <div id="zoomModal" onclick="handleZoomBackdropClick(event)">
    <div class="zoom-dialog" onclick="event.stopPropagation()">
      <div class="zoom-header">
        <div class="zoom-title-area">
          <span class="zoom-title" id="zoomTitle">عنوان فرآیند</span>
          <span class="img-counter-pill" id="zoomCounter" style="display: none;">عکس ۱ از ۳</span>
        </div>
        <button class="btn btn-icon" onclick="closeZoom()" style="background: rgba(255,255,255,0.15); color: white; border: none; padding: 6px 14px; border-radius: 10px; cursor: pointer; font-weight: bold;">✕ بستن (ESC)</button>
      </div>
      <div class="zoom-body" id="zoomBody">
        <button type="button" class="img-nav-btn img-nav-prev" id="zoomPrevBtn" onclick="prevZoomImage(event)" title="تصویر قبلی" style="display: none; width: 44px; height: 44px; font-size: 16px;">
          <span>▶</span>
        </button>
        <div class="zoom-img-wrapper" id="zoomImgWrapper">
          <img id="zoomImg" src="" alt="بزرگنمایی تصویر" />
        </div>
        <button type="button" class="img-nav-btn img-nav-next" id="zoomNextBtn" onclick="nextZoomImage(event)" title="تصویر بعدی" style="display: none; width: 44px; height: 44px; font-size: 16px;">
          <span>◀</span>
        </button>
      </div>
      <div class="zoom-thumbnails" id="zoomThumbnails" style="display: none;"></div>
    </div>
  </div>

  <!-- Embedded Data & Interactive Engine -->
  <script>
    const SLIDES_DATA = ${JSON.stringify(slidesData)};
    const COVER_DATA = {
      creationCount: ${creationCount},
      fixCount: ${fixCount},
      totalItems: ${targetItems.length},
      dateFormatted: "${nowFormatted}"
    };

    let currentSlide = 0; // 0 = Cover, 1..N = Process slides
    const totalSlides = SLIDES_DATA.length + 1;

    // Track active image index for each process slide (0-based)
    const slideActiveImageMap = {};

    // Zoom modal state
    let zoomActiveSlideIdx = -1;
    let zoomActiveImgIdx = 0;

    function toPersianDigits(n) {
      const farsi = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return String(n).replace(/[0-9]/g, d => farsi[d] || d);
    }

    function getSlideImages(slideItemIdx) {
      const item = SLIDES_DATA[slideItemIdx];
      if (!item) return [];
      if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        return item.images;
      }
      if (item.mainImage) return [item.mainImage];
      return [];
    }

    function getActiveImageIndex(slideItemIdx) {
      const images = getSlideImages(slideItemIdx);
      if (images.length === 0) return 0;
      const stored = slideActiveImageMap[slideItemIdx] ?? 0;
      return Math.max(0, Math.min(stored, images.length - 1));
    }

    function setSlideActiveImage(slideItemIdx, targetIdx, animationDirection) {
      const images = getSlideImages(slideItemIdx);
      if (images.length === 0) return;
      const nextIdx = (targetIdx + images.length) % images.length;
      slideActiveImageMap[slideItemIdx] = nextIdx;

      // Update current slide UI if on screen
      if (currentSlide - 1 === slideItemIdx) {
        const imgEl = document.getElementById('activeSlideImg');
        const counterEl = document.getElementById('slideImgCounter');
        const thumbStrip = document.getElementById('slideThumbStrip');

        if (imgEl) {
          const newSrc = images[nextIdx];
          if (animationDirection === 'next') {
            imgEl.style.transform = 'translateX(-30px)';
            imgEl.style.opacity = '0.4';
          } else if (animationDirection === 'prev') {
            imgEl.style.transform = 'translateX(30px)';
            imgEl.style.opacity = '0.4';
          }
          setTimeout(() => {
            imgEl.src = newSrc;
            imgEl.style.transform = 'translateX(0)';
            imgEl.style.opacity = '1';
          }, 120);
        }

        if (counterEl) {
          counterEl.textContent = 'عکس ' + toPersianDigits(nextIdx + 1) + ' از ' + toPersianDigits(images.length);
        }

        if (thumbStrip) {
          const thumbs = thumbStrip.querySelectorAll('.thumb-btn');
          thumbs.forEach((t, i) => {
            if (i === nextIdx) {
              t.classList.add('active');
            } else {
              t.classList.remove('active');
            }
          });
        }
      }
    }

    function nextSlideImage(e) {
      if (e) e.stopPropagation();
      if (currentSlide === 0) return;
      const slideItemIdx = currentSlide - 1;
      const curr = getActiveImageIndex(slideItemIdx);
      setSlideActiveImage(slideItemIdx, curr + 1, 'next');
    }

    function prevSlideImage(e) {
      if (e) e.stopPropagation();
      if (currentSlide === 0) return;
      const slideItemIdx = currentSlide - 1;
      const curr = getActiveImageIndex(slideItemIdx);
      setSlideActiveImage(slideItemIdx, curr - 1, 'prev');
    }

    function selectSlideImage(imgIdx, e) {
      if (e) e.stopPropagation();
      if (currentSlide === 0) return;
      const slideItemIdx = currentSlide - 1;
      const curr = getActiveImageIndex(slideItemIdx);
      const dir = imgIdx > curr ? 'next' : (imgIdx < curr ? 'prev' : null);
      setSlideActiveImage(slideItemIdx, imgIdx, dir);
    }

    function renderSlide(index) {
      currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
      const container = document.getElementById('stageContainer');
      const counter = document.getElementById('slideCounter');
      const btnPrev = document.getElementById('btnPrev');
      const btnNext = document.getElementById('btnNext');

      counter.textContent = 'اسلاید ' + toPersianDigits(currentSlide + 1) + ' از ' + toPersianDigits(totalSlides);
      btnPrev.disabled = currentSlide === 0;
      btnNext.disabled = currentSlide === totalSlides - 1;

      if (currentSlide === 0) {
        // Render Cover - Clean & Centered IT Report Title Only
        container.innerHTML = \`
          <div class="slide-frame cover-slide">
            <div class="cover-center-content">
              <h1 class="cover-main-title">گزارش واحد IT (نرم افزار)</h1>
            </div>
          </div>
        \`;
      } else {
        const slideItemIdx = currentSlide - 1;
        const item = SLIDES_DATA[slideItemIdx];
        const isCreation = item.isCreation;
        const isAuto = item.operationType === 'اتوماتیک‌سازی' || item.operationType === 'اتوماتیک سازی';
        const opBadgeClass = isAuto ? 'badge-auto' : (isCreation ? 'badge-new' : 'badge-fix');
        const hasRightCol = item.showAchievements || item.showImpactMetrics;

        const images = getSlideImages(slideItemIdx);
        const activeImgIdx = getActiveImageIndex(slideItemIdx);
        const activeImgSrc = images[activeImgIdx] || item.mainImage || '';
        const hasMultiple = images.length > 1;

        let achHtml = '';
        if (item.showAchievements) {
          achHtml = \`
            <div class="achievements-box">
              <div class="achievements-title">
                <span>📈</span>
                <span>دستاوردها و نتایج عملیاتی:</span>
              </div>
              <div class="achievements-list">
                \${item.benefitsList.slice(0, 4).map(b => \`
                  <div class="ach-item">
                    <div class="ach-tick">✓</div>
                    <span>\${b}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        }

        let metricsHtml = '';
        if (item.showImpactMetrics) {
          metricsHtml = \`
            <div class="metrics-box">
              <div class="metrics-title">
                <span>⏱️</span>
                <span>شاخص‌های اثرگذاری (Impact KPIs):</span>
              </div>
              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-name">صرفه‌جویی زمان</div>
                  <div class="metric-val" style="color: #34D399;">\${item.timeMetric}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-name">کاهش خطای انسانی</div>
                  <div class="metric-val" style="color: #60A5FA;">\${item.errorMetric}</div>
                </div>
              </div>
            </div>
          \`;
        }

        container.innerHTML = \`
          <div class="slide-frame">
            <!-- Header -->
            <div class="slide-header">
              <div class="slide-title-area">
                <span class="badge-op \${opBadgeClass}">\${item.operationType}</span>
                <div>
                  <h2 class="slide-title">\${item.processName}</h2>
                  <div class="slide-meta">
                    <span style="color: #FCD34D; font-weight: bold;">واحد: \${item.orgUnit}</span>
                    <span>|</span>
                    <span>تاریخ: \${item.executionDate}</span>
                  </div>
                </div>
              </div>
              <div class="slide-counter">اسلاید \${toPersianDigits(currentSlide + 1)} از \${toPersianDigits(totalSlides)}</div>
            </div>

            <!-- Body -->
            <div class="slide-body \${hasRightCol ? 'slide-body-2col' : 'slide-body-1col'}">
              <!-- Left Screenshot Area -->
              <div class="screenshot-col">
                <div class="screenshot-title">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span>نمای فرم الکترونیکی در سامانه ERA</span>
                    \${hasMultiple ? \`
                      <span class="img-counter-pill" id="slideImgCounter">
                        عکس \${toPersianDigits(activeImgIdx + 1)} از \${toPersianDigits(images.length)}
                      </span>
                    \` : ''}
                  </div>
                  <span style="color: #64748B; font-size: 10px;">
                    (برای بزرگنمایی کلیک کنید\${hasMultiple ? ' • برای تصویر بعد/قبل بکشید' : ''})
                  </span>
                </div>

                <div class="screenshot-stage-wrapper">
                  <div class="screenshot-stage" id="screenshotStage">
                    <div class="image-slider-track" id="sliderTrack">
                      \${activeImgSrc ? \`
                        <img id="activeSlideImg" src="\${activeImgSrc}" alt="\${item.processName}" />
                      \` : \`
                        <div style="text-align: center; color: #64748B;">
                          <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                          <div style="font-size: 13px; font-weight: bold; color: #94A3B8;">فرم مکانیزه سامانه ERA</div>
                        </div>
                      \`}
                    </div>

                    <!-- Left/Right Nav Buttons for Multi-image -->
                    \${hasMultiple ? \`
                      <button type="button" class="img-nav-btn img-nav-prev" onclick="prevSlideImage(event)" title="تصویر قبلی">
                        <span>▶</span>
                      </button>
                      <button type="button" class="img-nav-btn img-nav-next" onclick="nextSlideImage(event)" title="تصویر بعدی">
                        <span>◀</span>
                      </button>
                      <div class="swipe-hint-pill">
                        <span>⟷ با کشیدن (Swipe / Drag) تصاویر را ورق بزنید</span>
                      </div>
                    \` : ''}

                    <!-- Zoom Badge -->
                    \${activeImgSrc ? \`
                      <button type="button" class="zoom-badge-btn" onclick="openCurrentSlideZoom(event)" title="بزرگ‌نمایی تصویر">
                        <span>🔍 بزرگنمایی</span>
                      </button>
                    \` : ''}
                  </div>

                  <!-- Thumbnails Bar -->
                  \${hasMultiple ? \`
                    <div class="thumbnail-strip" id="slideThumbStrip">
                      \${images.map((img, i) => \`
                        <button type="button" class="thumb-btn \${i === activeImgIdx ? 'active' : ''}" onclick="selectSlideImage(\${i}, event)" title="تصویر \${toPersianDigits(i + 1)}">
                          <img src="\${img}" alt="تصویر \${i + 1}" />
                          <span class="thumb-num">\${toPersianDigits(i + 1)}</span>
                        </button>
                      \`).join('')}
                    </div>
                  \` : ''}
                </div>

                <div class="summary-strip">
                  <div class="summary-box box-red">
                    <div class="box-label" style="color: #9F1239;">\${isCreation ? 'وضعیت قبل (چالش‌ها):' : 'علت اصلاح و باگ:'}</div>
                    <div class="box-content">\${item.beforeText}</div>
                  </div>
                  <div class="summary-box box-green">
                    <div class="box-label" style="color: #166534;">\${isCreation ? 'وضعیت بعد (مکانیزه):' : 'راهکار اعمال شده:'}</div>
                    <div class="box-content">\${item.afterText}</div>
                  </div>
                </div>
              </div>

              <!-- Right Details Area -->
              \${hasRightCol ? \`
                <div class="details-col">
                  \${achHtml}
                  \${metricsHtml}
                </div>
              \` : ''}
            </div>

            <!-- Footer -->
            <div class="slide-footer">
              <span>گزارش عملکرد و دستاوردهای مکانیزاسیون فرآیندها در سامانه ERA</span>
              <span>محرمانه - ویژه ارائه به مدیریت ارشد</span>
            </div>
          </div>
        \`;

        // Attach Swipe / Drag gestures to the screenshot stage
        attachStageGestures();
      }
    }

    // Attach Drag / Swipe handlers to screenshotStage
    function attachStageGestures() {
      const stage = document.getElementById('screenshotStage');
      if (!stage) return;

      let startX = 0;
      let startY = 0;
      let isDragging = false;
      let hasSwiped = false;

      const onStart = (clientX, clientY) => {
        startX = clientX;
        startY = clientY;
        isDragging = true;
        hasSwiped = false;
        stage.classList.add('is-dragging');
      };

      const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        const diffX = clientX - startX;
        const diffY = clientY - startY;

        // If horizontal motion is prominent
        if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
          hasSwiped = true;
          const img = document.getElementById('activeSlideImg');
          if (img) {
            img.style.transform = \`translateX(\${diffX * 0.35}px)\`;
          }
        }
      };

      const onEnd = (clientX) => {
        if (!isDragging) return;
        isDragging = false;
        stage.classList.remove('is-dragging');

        const diffX = clientX - startX;
        const img = document.getElementById('activeSlideImg');
        if (img) {
          img.style.transform = 'translateX(0)';
        }

        if (hasSwiped && Math.abs(diffX) > 35) {
          // Dragged left (diffX < 0) -> Next image
          // Dragged right (diffX > 0) -> Prev image
          if (diffX < 0) {
            nextSlideImage();
          } else {
            prevSlideImage();
          }
        } else if (!hasSwiped) {
          // Simple click without dragging -> Open Zoom Modal
          openCurrentSlideZoom();
        }
      };

      // Pointer / Mouse events
      stage.onpointerdown = (e) => {
        if (e.target.closest('button')) return;
        onStart(e.clientX, e.clientY);
        stage.setPointerCapture(e.pointerId);
      };

      stage.onpointermove = (e) => {
        if (!isDragging) return;
        onMove(e.clientX, e.clientY);
      };

      stage.onpointerup = (e) => {
        if (!isDragging) return;
        onEnd(e.clientX);
        try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
      };

      stage.onpointercancel = () => {
        isDragging = false;
        stage.classList.remove('is-dragging');
        const img = document.getElementById('activeSlideImg');
        if (img) img.style.transform = 'translateX(0)';
      };

      // Touch fallback for older mobile browsers
      stage.ontouchstart = (e) => {
        if (e.target.closest('button')) return;
        if (e.touches && e.touches[0]) {
          onStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      stage.ontouchmove = (e) => {
        if (!isDragging) return;
        if (e.touches && e.touches[0]) {
          onMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      stage.ontouchend = (e) => {
        if (!isDragging) return;
        const clientX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : startX;
        onEnd(clientX);
      };
    }

    // Zoom Modal Engine
    function openCurrentSlideZoom(e) {
      if (e) e.stopPropagation();
      if (currentSlide === 0) return;
      const slideItemIdx = currentSlide - 1;
      const activeIdx = getActiveImageIndex(slideItemIdx);
      openZoom(slideItemIdx, activeIdx);
    }

    function openZoom(slideItemIdx, imgIdx = 0) {
      zoomActiveSlideIdx = slideItemIdx;
      zoomActiveImgIdx = imgIdx;
      updateZoomModalContent();
      document.getElementById('zoomModal').style.display = 'flex';
    }

    function updateZoomModalContent() {
      if (zoomActiveSlideIdx < 0 || zoomActiveSlideIdx >= SLIDES_DATA.length) return;
      const item = SLIDES_DATA[zoomActiveSlideIdx];
      const images = getSlideImages(zoomActiveSlideIdx);
      const totalImgs = images.length;

      zoomActiveImgIdx = Math.max(0, Math.min(zoomActiveImgIdx, totalImgs - 1));
      const currentSrc = images[zoomActiveImgIdx] || item.mainImage || '';

      document.getElementById('zoomTitle').textContent = item.processName + ' (' + item.orgUnit + ')';
      const zoomImg = document.getElementById('zoomImg');
      zoomImg.src = currentSrc;

      const counter = document.getElementById('zoomCounter');
      const prevBtn = document.getElementById('zoomPrevBtn');
      const nextBtn = document.getElementById('zoomNextBtn');
      const thumbBox = document.getElementById('zoomThumbnails');

      if (totalImgs > 1) {
        counter.style.display = 'inline-flex';
        counter.textContent = 'عکس ' + toPersianDigits(zoomActiveImgIdx + 1) + ' از ' + toPersianDigits(totalImgs);

        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';

        thumbBox.style.display = 'flex';
        thumbBox.innerHTML = images.map((img, idx) => \`
          <button type="button" class="thumb-btn \${idx === zoomActiveImgIdx ? 'active' : ''}" onclick="selectZoomImage(\${idx}, event)">
            <img src="\${img}" alt="عکس \${idx + 1}" style="width: 50px; height: 32px;" />
            <span class="thumb-num">\${toPersianDigits(idx + 1)}</span>
          </button>
        \`).join('');
      } else {
        counter.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        thumbBox.style.display = 'none';
      }

      // Also sync background slide image
      setSlideActiveImage(zoomActiveSlideIdx, zoomActiveImgIdx);
    }

    function nextZoomImage(e) {
      if (e) e.stopPropagation();
      const images = getSlideImages(zoomActiveSlideIdx);
      if (images.length <= 1) return;
      zoomActiveImgIdx = (zoomActiveImgIdx + 1) % images.length;
      updateZoomModalContent();
    }

    function prevZoomImage(e) {
      if (e) e.stopPropagation();
      const images = getSlideImages(zoomActiveSlideIdx);
      if (images.length <= 1) return;
      zoomActiveImgIdx = (zoomActiveImgIdx - 1 + images.length) % images.length;
      updateZoomModalContent();
    }

    function selectZoomImage(idx, e) {
      if (e) e.stopPropagation();
      zoomActiveImgIdx = idx;
      updateZoomModalContent();
    }

    function closeZoom() {
      document.getElementById('zoomModal').style.display = 'none';
    }

    function handleZoomBackdropClick(e) {
      if (e.target.id === 'zoomModal' || e.target.classList.contains('zoom-img-wrapper') || e.target.id === 'zoomBody') {
        closeZoom();
      }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('outlineModal').style.display === 'flex') {
        if (e.key === 'Escape') closeOutline();
        return;
      }
      if (document.getElementById('zoomModal').style.display === 'flex') {
        if (e.key === 'Escape') {
          closeZoom();
          return;
        }
        if (e.key === 'ArrowLeft') {
          nextZoomImage();
          return;
        }
        if (e.key === 'ArrowRight') {
          prevZoomImage();
          return;
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        renderSlide(currentSlide + 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        renderSlide(currentSlide - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        renderSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        renderSlide(totalSlides - 1);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    });

    document.getElementById('btnPrev').addEventListener('click', () => renderSlide(currentSlide - 1));
    document.getElementById('btnNext').addEventListener('click', () => renderSlide(currentSlide + 1));

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
    document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);

    function handleFullscreenChange() {
      const isFs = !!document.fullscreenElement;
      document.body.classList.toggle('is-fullscreen', isFs);
      const fsBtn = document.getElementById('btnFullscreen');
      if (fsBtn) {
        fsBtn.innerHTML = isFs ? '<span>🗗 خروج از تمام‌صفحه</span>' : '<span>⛶ تمام‌صفحه</span>';
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Outline Modal
    function openOutline() {
      const grid = document.getElementById('outlineGrid');
      grid.innerHTML = \`
        <div class="outline-item \${currentSlide === 0 ? 'active' : ''}" onclick="jumpToSlide(0)">
          <div class="outline-item-badge">
            <span>صفحه ۱</span>
            <span style="font-size: 10px; background: #EFEFEA; padding: 2px 6px; border-radius: 6px; color: #545D4B;">اسلاید جلد</span>
          </div>
          <div class="outline-item-title">گزارش واحد IT (نرم افزار)</div>
          <div class="outline-item-unit">سامانه یکپارچه ERA</div>
        </div>
      \` + SLIDES_DATA.map((item, i) => \`
        <div class="outline-item \${currentSlide === i + 1 ? 'active' : ''}" onclick="jumpToSlide(\${i + 1})">
          <div class="outline-item-badge">
            <span>اسلاید \${toPersianDigits(i + 2)}</span>
            <span style="font-size: 10px; background: #EFEFEA; padding: 2px 6px; border-radius: 6px; color: #545D4B;">\${item.operationType || 'فرآیند'}</span>
          </div>
          <div class="outline-item-title">\${item.processName}</div>
          <div class="outline-item-unit">\${item.orgUnit}</div>
        </div>
      \`).join('');

      document.getElementById('outlineModal').style.display = 'flex';
    }

    function closeOutline() {
      document.getElementById('outlineModal').style.display = 'none';
    }

    function handleOutlineBackdropClick(e) {
      if (e.target.id === 'outlineModal') {
        closeOutline();
      }
    }

    function jumpToSlide(idx) {
      renderSlide(idx);
      closeOutline();
    }

    document.getElementById('btnOutline').addEventListener('click', openOutline);
    document.getElementById('btnCloseOutline').addEventListener('click', closeOutline);

    // Initial render
    renderSlide(0);
  </script>
</body>
</html>`;
}

/**
 * Trigger download of standalone HTML presentation file
 */
export function downloadPresentationHtml(
  items: ProcessedEraItem[],
  mode: 'selected' | 'all' = 'selected'
): void {
  const htmlContent = generateStandalonePresentationHtml(items, mode);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now).replace(/\//g, '-');

  const suffix = mode === 'all' ? 'همه_اسلایدها' : 'اسلایدهای_فعال';
  const fileName = `گزارش_واحد_IT_نرم_افزار_${suffix}_${dateStr}.html`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
