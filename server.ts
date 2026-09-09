import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { prisma, ensureDatabaseHealthy } from './server/db';
import { seedDatabase } from './server/seed';
import { extractOrgUnit, classifyLetterType, parsePersianDate, DEFAULT_CAUSE_RULES, DEFAULT_EXCLUSION_RULES, processRawEraItems, isDateInRange, processRawLetters } from './src/utils/parser';

// Helper to resolve Gemini API Key from database or process.env
async function getResolvedApiKey(): Promise<{ apiKey: string; source: 'database' | 'env' | 'none' }> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'gemini_api_key' }
    });
    if (setting && setting.value && setting.value.trim() !== '') {
      return { apiKey: setting.value.trim(), source: 'database' };
    }
  } catch (err) {
    console.warn('Error reading gemini_api_key from DB:', err);
  }

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim() !== '') {
    return { apiKey: envKey.trim(), source: 'env' };
  }

  return { apiKey: '', source: 'none' };
}

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

interface GenerateResilienceOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  preferredModels?: string[];
}

// Resilient Gemini Generator with automatic model fallback, retry on 503/429 spikes, and friendly error handling
async function generateContentWithResilience(
  apiKey: string,
  contents: any,
  options: GenerateResilienceOptions = {}
): Promise<{ text: string; model: string; executionTimeMs: number }> {
  const startTime = Date.now();
  const ai = createGeminiClient(apiKey);

  // Priority order: Ultra-stable gemini-2.5-flash first, then lightweight gemini-2.5-flash-lite, then gemini-3.7-flash
  const modelsToTry = options.preferredModels && options.preferredModels.length > 0
    ? options.preferredModels
    : ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxOutputTokens ?? 2500,
        };

        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        // Only add thinkingConfig for models supporting zero thinking budget
        if (modelName === 'gemini-2.5-flash' || modelName === 'gemini-3.7-flash') {
          config.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config
        });

        if (response && response.text && response.text.trim().length > 0) {
          return {
            text: response.text,
            model: modelName,
            executionTimeMs: Date.now() - startTime
          };
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const isTransient = errMessage.includes('503') ||
                            errMessage.includes('UNAVAILABLE') ||
                            errMessage.includes('high demand') ||
                            errMessage.includes('429') ||
                            errMessage.includes('RESOURCE_EXHAUSTED');

        console.warn(`[Gemini Resilient Call] Model ${modelName} (attempt ${attempt}) warning:`, errMessage);

        if (isTransient && attempt === 1) {
          // Short backoff before retry on transient high-demand spike
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        break; // Move immediately to next fallback model
      }
    }
  }

  // Parse clean user-friendly message
  let cleanErrorMessage = 'سرویس هوش مصنوعی موقتاً با ترافیک بالا مواجه است یا کلید شما سهمیه کافی ندارد. لطفاً چند لحظه دیگر دوباره تلاش نمایید.';
  if (lastError) {
    const rawMsg = lastError?.message || String(lastError);
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        cleanErrorMessage = parsed.error.message;
      }
    } catch {
      if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
        cleanErrorMessage = 'کلید API هوش مصنوعی نامعتبر است. لطفاً از بخش تنظیمات سامانه کلید جدید را ذخیره کنید.';
      } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
        cleanErrorMessage = 'مدل‌های هوش مصنوعی موقتاً با ترافیک بالا مواجه شدند. لطفاً دکمه «تحلیل مجدد» را بزنید.';
      }
    }
  }

  throw new Error(cleanErrorMessage);
}

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware for JSON parsing with large payload limit for multi-file imports and image backups
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ extended: true, limit: '200mb' }));

  // Ensure DB has initial seed data and healthy schema
  try {
    await ensureDatabaseHealthy();
    await seedDatabase(false);
  } catch (err) {
    console.error('Error auto-seeding SQLite database:', err);
  }

  // ----------------------------------------------------
  // REST API: System & Health Status
  // ----------------------------------------------------
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const lettersCount = await prisma.letter.count();
      const eraCount = await prisma.eraProcess.count();
      const imagesCount = await prisma.processImage.count().catch(() => 0);
      res.json({
        status: 'healthy',
        database: 'SQLite',
        orm: 'Prisma 7',
        persistence: 'Local SQLite (file:./dev.db)',
        architecture: 'RESTful API (Zero Server Actions)',
        stats: {
          lettersCount,
          eraCount,
          imagesCount
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: Re-seed Database
  // ----------------------------------------------------
  app.post('/api/seed', async (req: Request, res: Response) => {
    try {
      const force = req.body.force === true;
      const result = await seedDatabase(force);
      res.json({ success: true, message: 'Database seeded successfully', ...result });
    } catch (error: any) {
      console.error('Seed error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: Letters (حذف و ویرایش مکاتبات - پشتیبانی کامل از فیلترهای پایگاه داده SQLite و محاسبات سرور)
  // ----------------------------------------------------
  // GET /api/letters
  app.get('/api/letters', async (req: Request, res: Response) => {
    const startTime = performance.now();
    try {
      const {
        unit,
        units,
        month,
        actionType,
        cause,
        showExcludedOnly,
        startDate,
        endDate,
        search,
        page,
        pageSize,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Fetch letters with ordering from SQLite
      const letters = await prisma.letter.findMany({
        orderBy: { [String(sortBy)]: sortOrder === 'asc' ? 'asc' : 'desc' }
      });

      // Load active rules from SQLite database
      const [dbRules, dbExclusionRules] = await Promise.all([
        prisma.causeRule.findMany({ where: { isActive: true }, orderBy: { priority: 'desc' } }).catch(() => []),
        prisma.exclusionRule.findMany({ where: { isActive: true } }).catch(() => [])
      ]);

      const activeRules = dbRules && dbRules.length > 0 ? (dbRules as any) : DEFAULT_CAUSE_RULES;
      const activeExclusionRules = dbExclusionRules && dbExclusionRules.length > 0 ? (dbExclusionRules as any) : DEFAULT_EXCLUSION_RULES;

      // Parse raw records from database
      const rawItemList = letters.map(item => {
        try {
          const raw = JSON.parse(item.rawJson);
          return {
            ...raw,
            _dbId: item.id,
            _actionType: item.actionType,
            _orgUnit: item.orgUnit,
            _dateStr: item.dateStr
          };
        } catch {
          return {
            شناسه: item.letterId || item.id,
            موضوع: item.subject,
            فرستنده: item.sender,
            گیرنده: item.receiver,
            'تاریخ ثبت': item.dateStr,
            _dbId: item.id
          };
        }
      });

      // Process through the standard rules & classification engine
      const allProcessed = processRawLetters(rawItemList, activeRules, activeExclusionRules);

      // Parse target units for filtering
      const targetUnits: string[] = [];
      if (units) {
        if (Array.isArray(units)) {
          targetUnits.push(...units.map(String));
        } else {
          targetUnits.push(...String(units).split(',').map(s => s.trim()).filter(Boolean));
        }
      } else if (unit && unit !== 'all') {
        targetUnits.push(String(unit).trim());
      }

      // Helper to normalize Persian strings for resilient matching
      const normText = (s?: string | null) => (s || '').replace(/\u200C/g, ' ').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();

      // Filter dataset
      const isExcludedRequested = String(showExcludedOnly) === 'true';
      const filtered = allProcessed.filter(letter => {
        // Excluded filter
        if (isExcludedRequested) {
          if (!letter.isExcluded) return false;
        } else {
          if (letter.isExcluded) return false;
        }

        // Units filter (Multi or Single)
        if (targetUnits.length > 0) {
          const itemUnitNorm = normText(letter.orgUnit);
          const matchesAnyUnit = targetUnits.some(u => {
            const uNorm = normText(u);
            return itemUnitNorm === uNorm || itemUnitNorm.includes(uNorm) || uNorm.includes(itemUnitNorm);
          });
          if (!matchesAnyUnit) return false;
        }

        // Month filter
        if (month && month !== 'all') {
          const mQuery = String(month).trim();
          if (letter.month !== mQuery && !letter.monthName.includes(mQuery)) {
            return false;
          }
        }

        // Action Type filter
        if (actionType && actionType !== 'all') {
          const actQuery = String(actionType).trim();
          if (letter.actionType !== actQuery) {
            return false;
          }
        }

        // Cause filter
        if (cause && cause !== 'all') {
          const cQuery = String(cause).trim();
          const itemCause = letter.cause || 'نامشخص';
          if (itemCause !== cQuery) {
            return false;
          }
        }

        // Date range filter
        if (startDate || endDate) {
          if (!isDateInRange(letter.dateStr, String(startDate || ''), String(endDate || ''))) {
            return false;
          }
        }

        // Search query
        if (search) {
          const q = normText(String(search));
          const matchSubject = normText(letter.subject).includes(q);
          const matchOriginal = normText(letter.originalSubject).includes(q);
          const matchCreator = normText(letter.creatorRaw).includes(q);
          const matchUnit = normText(letter.orgUnit).includes(q);
          const matchCause = normText(letter.cause).includes(q);
          const matchId = String(letter.letterId ?? letter.id).includes(q);
          const matchReg = letter.registrationNumber ? letter.registrationNumber.includes(q) : false;

          if (!matchSubject && !matchOriginal && !matchCreator && !matchUnit && !matchCause && !matchId && !matchReg) {
            return false;
          }
        }

        return true;
      });

      const totalMatching = filtered.length;

      // Calculate server analytics and aggregations
      let deletes = 0;
      let edits = 0;
      let bankCount = 0;
      const uniqueKeys = new Set<string>();
      const unitCountMap = new Map<string, number>();
      const causeCountMap = new Map<string, number>();

      filtered.forEach(l => {
        const uKey = l.registrationNumber || l.normalizedSubjectKey || l.id;
        uniqueKeys.add(uKey);
        if (l.actionType === 'حذف') deletes++;
        else edits++;

        if (l.cause === 'بانکی') bankCount++;

        unitCountMap.set(l.orgUnit, (unitCountMap.get(l.orgUnit) || 0) + 1);
        causeCountMap.set(l.cause || 'نامشخص', (causeCountMap.get(l.cause || 'نامشخص') || 0) + 1);
      });

      let topUnit = 'نامشخص';
      let topCount = 0;
      unitCountMap.forEach((count, u) => {
        if (count > topCount) {
          topCount = count;
          topUnit = u;
        }
      });

      const causesDistribution = Array.from(causeCountMap.entries()).map(([c, count]) => ({
        cause: c,
        count,
        percent: totalMatching > 0 ? Number(((count / totalMatching) * 100).toFixed(1)) : 0
      }));

      // Pagination
      let paginatedData = filtered;
      let currentPage: number | undefined;
      let limit: number | undefined;
      let totalPages: number | undefined;

      if (page && page !== 'all') {
        currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        limit = Math.max(1, parseInt(String(pageSize), 10) || 12);
        totalPages = Math.ceil(totalMatching / limit) || 1;
        const offset = (currentPage - 1) * limit;
        paginatedData = filtered.slice(offset, offset + limit);
      }

      const executionTimeMs = Math.round(performance.now() - startTime);

      res.json({
        success: true,
        total: totalMatching,
        count: paginatedData.length,
        page: currentPage,
        pageSize: limit,
        totalPages,
        executionTimeMs,
        stats: {
          total: totalMatching,
          uniqueTotal: uniqueKeys.size,
          deletes,
          edits,
          bankCount,
          activeUnits: unitCountMap.size,
          topUnit,
          topCount,
          causesDistribution
        },
        data: paginatedData
      });
    } catch (error: any) {
      console.error('Error fetching letters:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/letters/:id
  app.get('/api/letters/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const letter = await prisma.letter.findFirst({
        where: {
          OR: [{ id }, { letterId: id }]
        }
      });

      if (!letter) {
        return res.status(404).json({ success: false, error: 'Letter not found' });
      }

      let raw = {};
      try {
        raw = JSON.parse(letter.rawJson);
      } catch {}

      res.json({ success: true, data: { ...letter, raw } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/letters (Batch or single create / import)
  app.post('/api/letters', async (req: Request, res: Response) => {
    try {
      const { items, mode = 'append' } = req.body;
      const itemsToInsert = Array.isArray(items) ? items : [req.body];

      if (itemsToInsert.length === 0) {
        return res.status(400).json({ success: false, error: 'No items provided' });
      }

      if (mode === 'replace') {
        await prisma.letter.deleteMany();
      }

      const records = itemsToInsert.map((item: any) => {
        const creatorRaw = (
          item['ایجاد کننده نامه'] ||
          item['ایجاد کننده'] ||
          item['ایجادکننده نامه'] ||
          item['ایجادکننده'] ||
          item['ایجاد‌کننده نامه'] ||
          item['ایجاد‌کننده'] ||
          item['کاربر ایجاد کننده'] ||
          item['کاربر ایجادکننده'] ||
          item['ثبت کننده نامه'] ||
          item['ثبت کننده'] ||
          item['ثبت‌کننده'] ||
          item['creatorRaw'] ||
          item['creator'] ||
          item['creatorName'] ||
          item['فرستنده نامه'] ||
          item['فرستنده'] ||
          ''
        );
        const { unit, name: creatorName, role: creatorRole } = extractOrgUnit(
          creatorRaw,
          item['فرستنده']
        );
        const actionType = classifyLetterType(item['موضوع'], item['موضوع نامه']);
        const dateInfo = parsePersianDate(item['تاریخ ثبت'] || item['تاریخ مشاهده'] || item['تاریخ وارده']);

        return {
          letterId: String(item['شناسه'] || item['id'] || ''),
          actionType,
          subject: item['موضوع نامه'] || item['موضوع'] || 'بدون عنوان',
          orgUnit: unit,
          sender: item['فرستنده'] || item['فرستنده نامه'] || 'نامشخص',
          receiver: item['گیرنده'] || item['گیرنده نامه'] || 'نامشخص',
          dateStr: dateInfo.dateStr,
          monthName: dateInfo.monthName,
          creatorName,
          creatorRole,
          creatorRaw: creatorRaw || item['فرستنده'] || '',
          urgency: item['فوریت'] || item['فوریت نامه'] || 'عادی',
          status: item['وضعیت نامه'] || 'عادی',
          registrationNumber: item['شماره ثبت'] || item['شماره وارده'] || null,
          rawJson: JSON.stringify(item)
        };
      });

      // Insert in chunks of 100 for SQLite performance
      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await prisma.letter.createMany({ data: chunk });
      }

      const totalCount = await prisma.letter.count();
      res.json({
        success: true,
        insertedCount: records.length,
        totalCount,
        mode
      });
    } catch (error: any) {
      console.error('Error creating letters:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/letters/:id
  app.delete('/api/letters/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.letter.deleteMany({
        where: {
          OR: [{ id }, { letterId: id }]
        }
      });
      const totalCount = await prisma.letter.count();
      res.json({ success: true, message: 'Letter deleted', totalCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/letters (Clear all)
  app.delete('/api/letters', async (_req: Request, res: Response) => {
    try {
      await prisma.letter.deleteMany();
      res.json({ success: true, message: 'All letters cleared' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: ERA Processes & SQLite Images (فرآیندهای سازمانی ERA و ذخیره‌سازی تصاویر در SQLite)
  // ----------------------------------------------------
  // GET /api/era (Supports both full list and server-side filtering/pagination)
  app.get('/api/era', async (req: Request, res: Response) => {
    const startTime = performance.now();
    try {
      const {
        unit,
        opType,
        entityType,
        status: statusFilter,
        search,
        startDate,
        endDate,
        imageFilter,
        slideFilter,
        page,
        pageSize,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Fetch all items with relations from SQLite database
      const eraItems = await prisma.eraProcess.findMany({
        orderBy: { [String(sortBy)]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      // Prepare raw items from database records
      const rawItemList = eraItems.map((item: any) => {
        let raw: any = {};
        if (item.rawJson) {
          try {
            raw = JSON.parse(item.rawJson);
          } catch {}
        }

        // Collect images from ProcessImage relation if available, or from rawJson
        let formImages: string[] = [];
        if (Array.isArray(item.images) && item.images.length > 0) {
          formImages = item.images.map((img: any) => img.imageData).filter(Boolean);
        } else if (Array.isArray(raw.formImages) && raw.formImages.length > 0) {
          formImages = raw.formImages.filter(Boolean);
        } else if (raw.formImageUrl) {
          formImages = [raw.formImageUrl];
        }

        return {
          ...raw,
          id: item.id,
          "نام فرایند": item.processName,
          processName: item.processName,
          "واحد سازمانی": item.orgUnit,
          orgUnit: item.orgUnit,
          "تاریخ انجام": item.executionDate,
          executionDate: item.executionDate,
          "نوع عملیات": item.operationType || raw.operationType || raw["نوع عملیات"],
          operationType: item.operationType || raw.operationType || raw["نوع عملیات"],
          "نوع موجودیت": item.entityType || raw.entityType || raw["نوع موجودیت"] || 'فرآیند',
          entityType: item.entityType || raw.entityType || raw["نوع موجودیت"] || 'فرآیند',
          "وضعیت": raw.status || raw["وضعیت"] || 'انجام شده',
          status: raw.status || raw["وضعیت"] || 'انجام شده',
          "توضیحات": item.description !== undefined ? item.description : (raw["توضیحات"] || raw.description || ''),
          description: item.description !== undefined ? item.description : (raw["توضیحات"] || raw.description || ''),
          formImageUrl: formImages[0] || raw.formImageUrl || undefined,
          formImages: formImages.length > 0 ? formImages : undefined,
          isSelectedForSlide: raw.isSelectedForSlide !== undefined ? Boolean(raw.isSelectedForSlide) : undefined,
          slideNumber: raw.slideNumber !== undefined ? (Number(raw.slideNumber) || null) : (raw.slideOrder !== undefined ? (Number(raw.slideOrder) || null) : undefined),
          slideOrder: raw.slideNumber !== undefined ? (Number(raw.slideNumber) || null) : (raw.slideOrder !== undefined ? (Number(raw.slideOrder) || null) : undefined),
          bpmnXml: raw.bpmnXml || undefined,
          bpmnSvg: raw.bpmnSvg || undefined,
          _dbId: item.id
        };
      });

      // Process items through the unified business logic parser
      const allProcessed = processRawEraItems(rawItemList);

      // Helper function to normalize Persian/Arabic strings for resilient matching
      const normText = (s?: string | null) => (s || '').replace(/\u200C/g, ' ').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();

      // Now apply all filters uniformly with 100% equivalence to client-side logic
      let filtered = allProcessed.filter(item => {
        if (unit && unit !== 'all') {
          const uQuery = normText(String(unit));
          const itemUnit = normText(item.orgUnit);
          if (itemUnit !== uQuery && !itemUnit.includes(uQuery) && !uQuery.includes(itemUnit)) {
            return false;
          }
        }

        if (opType && opType !== 'all') {
          const opQuery = String(opType).trim();
          const isAutoFilter =
            opQuery === 'اتوماتیک‌سازی' ||
            opQuery === 'اتوماتیک سازی' ||
            opQuery.toLowerCase() === 'auto' ||
            opQuery.includes('اتوماتیک') ||
            opQuery.includes('اتوماسیون');

          const isItemAuto =
            item.operationType === 'اتوماتیک‌سازی' ||
            item.operationType === 'اتوماتیک سازی' ||
            item.operationType.includes('اتوماتیک') ||
            item.operationType.includes('اتوماسیون');

          if (isAutoFilter) {
            if (!isItemAuto) return false;
          } else if (opQuery === 'جدید') {
            if (item.operationType !== 'جدید' || isItemAuto) return false;
          } else if (opQuery === 'اصلاح') {
            if (item.operationType !== 'اصلاح' || isItemAuto) return false;
          } else if (normText(item.operationType) !== normText(opQuery)) {
            return false;
          }
        }

        if (entityType && entityType !== 'all') {
          const eQuery = normText(String(entityType));
          const itemEntity = normText(item.entityType || 'فرآیند');
          if (itemEntity !== eQuery) {
            return false;
          }
        }

        if (statusFilter && statusFilter !== 'all') {
          const sQuery = normText(String(statusFilter));
          const itemStatus = normText(item.status || 'انجام شده');
          if (itemStatus !== sQuery) {
            return false;
          }
        }

        if (slideFilter && slideFilter !== 'all') {
          if (slideFilter === 'selected' && !item.isSelectedForSlide) return false;
          if (slideFilter === 'unselected' && item.isSelectedForSlide) return false;
        }

        const hasImage = Boolean((item.formImages && item.formImages.length > 0) || item.formImageUrl);
        if (imageFilter && imageFilter !== 'all') {
          if (imageFilter === 'with_image' && !hasImage) return false;
          if (imageFilter === 'no_image' && hasImage) return false;
        }

        if (startDate || endDate) {
          if (!isDateInRange(item.executionDate, String(startDate || ''), String(endDate || ''))) {
            return false;
          }
        }

        if (search) {
          const q = String(search).trim().toLowerCase();
          const mName = (item.processName || '').toLowerCase().includes(q);
          const mUnit = (item.orgUnit || '').toLowerCase().includes(q);
          const mDesc = (item.description || '').toLowerCase().includes(q);
          const mDate = (item.executionDate || '').includes(q);
          const mEntity = (item.entityType || '').toLowerCase().includes(q);
          const mOp = (item.operationType || '').toLowerCase().includes(q);
          const mStatus = (item.status || '').toLowerCase().includes(q);
          const mProblem = (item.problemDescription || '').toLowerCase().includes(q);
          const mSolution = (item.solutionDescription || '').toLowerCase().includes(q);
          const mAchStr = Array.isArray(item.achievements) ? item.achievements.join(' ') : (item.achievements || '');
          const mAch = mAchStr.toLowerCase().includes(q);
          if (!mName && !mUnit && !mDesc && !mDate && !mEntity && !mOp && !mStatus && !mProblem && !mSolution && !mAch) {
            return false;
          }
        }

        return true;
      });

      const totalMatching = filtered.length;

      // Compute statistics for filtered dataset
      const stats = {
        total: totalMatching,
        creationCount: filtered.filter(p => p.operationType === 'جدید').length,
        fixCount: filtered.filter(p => p.operationType === 'اصلاح').length,
        autoCount: filtered.filter(p => p.operationType === 'اتوماتیک‌سازی' || p.operationType === 'اتوماتیک سازی' || p.operationType.includes('اتوماتیک') || p.operationType.includes('اتوماسیون')).length,
        withImagesCount: filtered.filter(p => Boolean((p.formImages && p.formImages.length > 0) || p.formImageUrl)).length,
        statusCounts: {
          todo: filtered.filter(p => p.status === 'برای انجام').length,
          inProgress: filtered.filter(p => p.status === 'درحال انجام').length,
          done: filtered.filter(p => (p.status || 'انجام شده') === 'انجام شده').length
        }
      };

      // Pagination support (if page parameter is provided and not 'all')
      let paginatedData = filtered;
      let currentPage: number | undefined;
      let limit: number | undefined;
      let totalPages: number | undefined;

      if (page && page !== 'all') {
        currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        limit = Math.max(1, parseInt(String(pageSize), 10) || 20);
        totalPages = Math.ceil(totalMatching / limit) || 1;
        const offset = (currentPage - 1) * limit;
        paginatedData = filtered.slice(offset, offset + limit);
      }

      const endTime = performance.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(2));

      res.json({
        success: true,
        count: paginatedData.length,
        total: totalMatching,
        page: currentPage,
        pageSize: limit,
        totalPages,
        executionTimeMs,
        appliedFilters: {
          unit: unit || 'all',
          opType: opType || 'all',
          entityType: entityType || 'all',
          search: search || '',
          startDate: startDate || '',
          endDate: endDate || '',
          imageFilter: imageFilter || 'all',
          slideFilter: slideFilter || 'all'
        },
        stats,
        data: paginatedData
      });
    } catch (error: any) {
      console.error('Error fetching ERA processes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/era/:id
  app.get('/api/era/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await prisma.eraProcess.findFirst({
        where: {
          OR: [{ id }, { processName: id }]
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
      if (!item) {
        return res.status(404).json({ success: false, error: 'ERA record not found' });
      }

      let raw: any = {};
      try {
        if (item.rawJson) raw = JSON.parse(item.rawJson);
      } catch {}

      const formImages = (item.images && item.images.length > 0)
        ? item.images.map((img: any) => img.imageData)
        : (raw.formImages || (raw.formImageUrl ? [raw.formImageUrl] : []));

      res.json({
        success: true,
        data: {
          ...item,
          raw,
          formImages,
          formImageUrl: formImages[0] || null
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/era (Create or batch import)
  app.post('/api/era', async (req: Request, res: Response) => {
    try {
      const { items, mode = 'append' } = req.body;
      const itemsToProcess = Array.isArray(items) ? items : [req.body];

      if (itemsToProcess.length === 0) {
        return res.status(400).json({ success: false, error: 'No items provided' });
      }

      if (mode === 'replace') {
        await prisma.processImage.deleteMany().catch(() => {});
        await prisma.eraProcess.deleteMany();
      }

      let insertedCount = 0;
      for (const rawItem of itemsToProcess) {
        const parsed = processRawEraItems([rawItem])[0];
        const processName = parsed.processName || 'فرآیند سازمانی';
        const orgUnit = parsed.orgUnit || 'نامشخص';
        const executionDate = parsed.executionDate || '1405/01/01';
        const operationType = parsed.operationType || 'اصلاح';
        const entityType = parsed.entityType || 'فرآیند';
        const description = parsed.description || '';

        const created = await prisma.eraProcess.create({
          data: {
            processName,
            orgUnit,
            executionDate,
            operationType,
            entityType,
            description,
            rawJson: JSON.stringify({ ...rawItem, ...parsed })
          }
        });

        // If item contains images (Base64), save them directly to SQLite ProcessImage table
        const imgs = parsed.formImages || (parsed.formImageUrl ? [parsed.formImageUrl] : []);
        if (Array.isArray(imgs) && imgs.length > 0) {
          for (let idx = 0; idx < imgs.length; idx++) {
            const imgData = imgs[idx];
            if (imgData && typeof imgData === 'string' && imgData.trim() !== '') {
              await prisma.processImage.create({
                data: {
                  processId: created.id,
                  processName: created.processName,
                  imageData: imgData,
                  sortOrder: idx
                }
              }).catch(() => {});
            }
          }
        }
        insertedCount++;
      }

      const totalCount = await prisma.eraProcess.count();

      res.json({
        success: true,
        insertedCount,
        totalCount,
        mode
      });
    } catch (error: any) {
      console.error('Error creating ERA process:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/era/:id (Update process & persist images into SQLite)
  app.put('/api/era/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const parsed = processRawEraItems([body])[0];

      // Find existing process by ID or fallback to processName/orgUnit
      let target = await prisma.eraProcess.findUnique({ where: { id } });
      if (!target && parsed.processName) {
        target = await prisma.eraProcess.findFirst({
          where: { processName: parsed.processName }
        });
      }

      let updated: any;
      if (target) {
        let existingRaw: any = {};
        if (target.rawJson) {
          try {
            existingRaw = JSON.parse(target.rawJson);
          } catch {}
        }

        const mergedRaw = {
          ...existingRaw,
          ...body,
          ...parsed,
          isSelectedForSlide: body.isSelectedForSlide !== undefined 
            ? Boolean(body.isSelectedForSlide) 
            : (existingRaw.isSelectedForSlide !== undefined ? Boolean(existingRaw.isSelectedForSlide) : false)
        };

        updated = await prisma.eraProcess.update({
          where: { id: target.id },
          data: {
            processName: parsed.processName || target.processName,
            orgUnit: parsed.orgUnit || target.orgUnit,
            executionDate: parsed.executionDate || target.executionDate,
            operationType: parsed.operationType || target.operationType,
            entityType: parsed.entityType || target.entityType || 'فرآیند',
            description: parsed.description !== undefined ? parsed.description : target.description,
            rawJson: JSON.stringify(mergedRaw)
          }
        });
      } else {
        // Create if does not exist (upsert)
        const newRaw = {
          ...body,
          ...parsed,
          isSelectedForSlide: body.isSelectedForSlide !== undefined ? Boolean(body.isSelectedForSlide) : false
        };

        updated = await prisma.eraProcess.create({
          data: {
            id: id.startsWith('era-') ? undefined : id,
            processName: parsed.processName || 'فرآیند جدید',
            orgUnit: parsed.orgUnit || 'نامشخص',
            executionDate: parsed.executionDate || '1405/01/01',
            operationType: parsed.operationType || 'اصلاح',
            entityType: parsed.entityType || 'فرآیند',
            description: parsed.description || '',
            rawJson: JSON.stringify(newRaw)
          }
        });
      }

      // If formImages or formImageUrl are updated in payload, sync directly to SQLite ProcessImage table
      if (body.formImages !== undefined || body.formImageUrl !== undefined) {
        const newImages: string[] = Array.isArray(body.formImages)
          ? body.formImages.filter(Boolean)
          : (body.formImageUrl ? [body.formImageUrl] : []);

        // Replace images in ProcessImage table for this process
        await prisma.processImage.deleteMany({
          where: {
            OR: [
              { processId: updated.id },
              { processName: updated.processName }
            ]
          }
        }).catch(() => {});

        for (let idx = 0; idx < newImages.length; idx++) {
          const imgStr = newImages[idx];
          if (imgStr && typeof imgStr === 'string' && imgStr.trim() !== '') {
            await prisma.processImage.create({
              data: {
                processId: updated.id,
                processName: updated.processName,
                imageData: imgStr,
                sortOrder: idx
              }
            }).catch(() => {});
          }
        }
      }

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating ERA process:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PATCH /api/era/:id/slide (Directly toggle slide selection in SQLite database)
  app.patch('/api/era/:id/slide', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isSelectedForSlide } = req.body;

      let target = await prisma.eraProcess.findUnique({ where: { id } });
      if (!target) {
        target = await prisma.eraProcess.findFirst({
          where: {
            OR: [
              { processName: id },
              { id: { contains: id.replace('era-', '') } }
            ]
          }
        });
      }

      if (!target) {
        return res.status(404).json({ success: false, error: 'ERA process not found' });
      }

      let existingRaw: any = {};
      if (target.rawJson) {
        try {
          existingRaw = JSON.parse(target.rawJson);
        } catch {}
      }

      const updatedRaw = {
        ...existingRaw,
        isSelectedForSlide: Boolean(isSelectedForSlide)
      };

      const updated = await prisma.eraProcess.update({
        where: { id: target.id },
        data: {
          rawJson: JSON.stringify(updatedRaw)
        }
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          processName: updated.processName,
          isSelectedForSlide: Boolean(isSelectedForSlide)
        }
      });
    } catch (error: any) {
      console.error('Error toggling ERA slide in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PATCH /api/era/:id/status (Directly update process status in SQLite database)
  app.patch('/api/era/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }

      let target = await prisma.eraProcess.findUnique({ where: { id } });
      if (!target) {
        target = await prisma.eraProcess.findFirst({
          where: {
            OR: [
              { processName: id },
              { id: { contains: id.replace('era-', '') } }
            ]
          }
        });
      }

      if (!target) {
        return res.status(404).json({ success: false, error: 'ERA process not found' });
      }

      let existingRaw: any = {};
      if (target.rawJson) {
        try {
          existingRaw = JSON.parse(target.rawJson);
        } catch {}
      }

      const updatedRaw = {
        ...existingRaw,
        status: String(status).trim()
      };

      const updated = await prisma.eraProcess.update({
        where: { id: target.id },
        data: {
          rawJson: JSON.stringify(updatedRaw)
        }
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          processName: updated.processName,
          status: String(status).trim()
        }
      });
    } catch (error: any) {
      console.error('Error updating status in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/era/batch-slide (Directly batch toggle slide selection in SQLite database)
  app.post('/api/era/batch-slide', async (req: Request, res: Response) => {
    try {
      const { ids, isSelectedForSlide } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ success: false, error: 'ids array required' });
      }

      const allEra = await prisma.eraProcess.findMany();
      let updatedCount = 0;

      for (const item of allEra) {
        const isMatch = ids.includes(item.id) || ids.includes(item.processName);
        if (isMatch) {
          let existingRaw: any = {};
          if (item.rawJson) {
            try {
              existingRaw = JSON.parse(item.rawJson);
            } catch {}
          }
          existingRaw.isSelectedForSlide = Boolean(isSelectedForSlide);
          await prisma.eraProcess.update({
            where: { id: item.id },
            data: {
              rawJson: JSON.stringify(existingRaw)
            }
          });
          updatedCount++;
        }
      }

      res.json({
        success: true,
        updatedCount,
        isSelectedForSlide: Boolean(isSelectedForSlide)
      });
    } catch (error: any) {
      console.error('Error batch updating ERA slides in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/era/reorder-slides (Batch update slide ordering numbers in SQLite)
  app.post('/api/era/reorder-slides', async (req: Request, res: Response) => {
    try {
      const { orders } = req.body; // Array of { id: string, slideNumber: number }
      if (!Array.isArray(orders)) {
        return res.status(400).json({ success: false, error: 'orders array required' });
      }

      const allEra = await prisma.eraProcess.findMany();
      let updatedCount = 0;

      for (const orderItem of orders) {
        const { id, slideNumber } = orderItem;
        if (!id) continue;
        const target = allEra.find(e => e.id === id || e.processName === id || e.id.includes(id.replace('era-', '')));
        if (target) {
          let existingRaw: any = {};
          if (target.rawJson) {
            try {
              existingRaw = JSON.parse(target.rawJson);
            } catch {}
          }
          const num = slideNumber !== undefined && slideNumber !== null ? Number(slideNumber) : null;
          existingRaw.slideNumber = num;
          existingRaw.slideOrder = num;
          await prisma.eraProcess.update({
            where: { id: target.id },
            data: {
              rawJson: JSON.stringify(existingRaw)
            }
          });
          updatedCount++;
        }
      }

      res.json({ success: true, updatedCount });
    } catch (error: any) {
      console.error('Error reordering ERA slides in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/era/:id/bpmn (Save BPMN diagram XML and SVG for an ERA process)
  app.put('/api/era/:id/bpmn', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { bpmnXml, bpmnSvg } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Process ID is required' });
      }

      let target = await prisma.eraProcess.findUnique({ where: { id } });
      if (!target) {
        target = await prisma.eraProcess.findFirst({
          where: {
            OR: [
              { processName: id },
              { id: { contains: id.replace('era-', '') } }
            ]
          }
        });
      }

      if (!target) {
        // Find by fuzzy match in all records
        const allEra = await prisma.eraProcess.findMany();
        target = allEra.find(e => e.id === id || e.processName === id || e.id.includes(id.replace('era-', ''))) || null;
      }

      if (!target) {
        return res.status(404).json({ success: false, error: 'ERA process not found' });
      }

      let existingRaw: any = {};
      if (target.rawJson) {
        try {
          existingRaw = JSON.parse(target.rawJson);
        } catch {}
      }

      existingRaw.bpmnXml = bpmnXml;
      if (bpmnSvg !== undefined) {
        existingRaw.bpmnSvg = bpmnSvg;
      }

      const updated = await prisma.eraProcess.update({
        where: { id: target.id },
        data: {
          rawJson: JSON.stringify(existingRaw)
        }
      });

      res.json({
        success: true,
        id: updated.id,
        processName: updated.processName,
        hasBpmn: Boolean(bpmnXml && bpmnXml.trim() !== '')
      });
    } catch (error: any) {
      console.error('Error saving BPMN diagram in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/era/:id/slide-order (Update individual slide number in SQLite)
  app.put('/api/era/:id/slide-order', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { slideNumber } = req.body;
      let target = await prisma.eraProcess.findUnique({ where: { id } });
      if (!target) {
        target = await prisma.eraProcess.findFirst({
          where: {
            OR: [
              { processName: id },
              { id: { contains: id.replace('era-', '') } }
            ]
          }
        });
      }
      if (!target) {
        return res.status(404).json({ success: false, error: 'ERA process not found' });
      }

      let existingRaw: any = {};
      if (target.rawJson) {
        try {
          existingRaw = JSON.parse(target.rawJson);
        } catch {}
      }
      const num = slideNumber !== undefined && slideNumber !== null ? Number(slideNumber) : null;
      existingRaw.slideNumber = num;
      existingRaw.slideOrder = num;
      await prisma.eraProcess.update({
        where: { id: target.id },
        data: {
          rawJson: JSON.stringify(existingRaw)
        }
      });
      res.json({ success: true, slideNumber: num });
    } catch (error: any) {
      console.error('Error updating ERA slide order in SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // SQLite Dedicated Process Images Endpoints
  // ----------------------------------------------------
  // GET /api/era/:id/images (Fetch images for a process from SQLite)
  app.get('/api/era/:id/images', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const images = await prisma.processImage.findMany({
        where: {
          OR: [{ processId: id }, { processName: id }]
        },
        orderBy: { sortOrder: 'asc' }
      });
      res.json({
        success: true,
        count: images.length,
        images: images.map((img: any) => ({
          id: img.id,
          imageData: img.imageData,
          sortOrder: img.sortOrder,
          createdAt: img.createdAt
        }))
      });
    } catch (error: any) {
      console.error('Error fetching process images from SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/era/:id/images (Add / Save images directly into SQLite)
  app.post('/api/era/:id/images', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { images, processName } = req.body;
      const imagesToSave: string[] = Array.isArray(images) ? images : (req.body.imageData ? [req.body.imageData] : []);

      if (imagesToSave.length === 0) {
        return res.status(400).json({ success: false, error: 'هیچ تصویری برای ذخیره ارسال نشده است.' });
      }

      // Check if process exists, otherwise find by name
      let proc = await prisma.eraProcess.findUnique({ where: { id } });
      if (!proc && processName) {
        proc = await prisma.eraProcess.findFirst({ where: { processName } });
      }

      const procId = proc ? proc.id : id;
      const procName = proc ? proc.processName : (processName || 'فرآیند');

      // Clear existing and insert new order
      await prisma.processImage.deleteMany({
        where: {
          OR: [{ processId: procId }, { processName: procName }]
        }
      }).catch(() => {});

      const savedRecords = [];
      for (let i = 0; i < imagesToSave.length; i++) {
        const img = imagesToSave[i];
        if (img && typeof img === 'string') {
          const record = await prisma.processImage.create({
            data: {
              processId: procId,
              processName: procName,
              imageData: img,
              sortOrder: i
            }
          });
          savedRecords.push(record);
        }
      }

      // Also update rawJson on EraProcess if exists
      if (proc) {
        try {
          let raw = {};
          if (proc.rawJson) raw = JSON.parse(proc.rawJson);
          const updatedRaw = {
            ...raw,
            formImages: imagesToSave,
            formImageUrl: imagesToSave[0] || null
          };
          await prisma.eraProcess.update({
            where: { id: proc.id },
            data: { rawJson: JSON.stringify(updatedRaw) }
          });
        } catch {}
      }

      res.json({
        success: true,
        message: 'تصاویر با موفقیت مستقیماً درون پایگاه‌داده SQLite ذخیره شدند.',
        savedCount: savedRecords.length
      });
    } catch (error: any) {
      console.error('Error saving images to SQLite:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/era/:id/images/:imageId (Delete single image from SQLite)
  app.delete('/api/era/:id/images/:imageId', async (req: Request, res: Response) => {
    try {
      const { imageId } = req.params;
      await prisma.processImage.delete({
        where: { id: imageId }
      });
      res.json({ success: true, message: 'تصویر از پایگاه داده SQLite حذف شد.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/era/:id (Delete ERA Process & all its SQLite images)
  app.delete('/api/era/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.processImage.deleteMany({
        where: { OR: [{ processId: id }] }
      }).catch(() => {});
      await prisma.eraProcess.delete({ where: { id } });
      const totalCount = await prisma.eraProcess.count();
      res.json({ success: true, message: 'ERA record deleted', totalCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/era (Clear all ERA records & images)
  app.delete('/api/era', async (_req: Request, res: Response) => {
    try {
      await prisma.processImage.deleteMany().catch(() => {});
      await prisma.eraProcess.deleteMany();
      res.json({ success: true, message: 'All ERA records and SQLite images cleared' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: Cause Rules (قوانین طبقه‌بندی و تعیین عامل)
  // ----------------------------------------------------
  // GET /api/rules
  app.get('/api/rules', async (_req: Request, res: Response) => {
    try {
      const rules = await prisma.causeRule.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });
      res.json({ success: true, count: rules.length, data: rules });
    } catch (error: any) {
      console.error('Error fetching cause rules:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rules (Create new rule)
  app.post('/api/rules', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body.keyword || !body.cause) {
        return res.status(400).json({ success: false, error: 'keyword and cause are required' });
      }

      const newRule = await prisma.causeRule.create({
        data: {
          keyword: body.keyword.trim(),
          cause: body.cause.trim(),
          targetUnit: body.targetUnit ? body.targetUnit.trim() : null,
          matchType: body.matchType || 'contains',
          targetField: body.targetField ? body.targetField.trim() : 'all',
          isActive: body.isActive !== false,
          color: body.color || '#2563EB',
          description: body.description || null,
          priority: Number(body.priority) || 0
        }
      });

      res.json({ success: true, data: newRule });
    } catch (error: any) {
      console.error('Error creating cause rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/rules/:id (Update rule)
  app.put('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const updated = await prisma.causeRule.update({
        where: { id },
        data: {
          keyword: body.keyword !== undefined ? body.keyword.trim() : undefined,
          cause: body.cause !== undefined ? body.cause.trim() : undefined,
          targetUnit: body.targetUnit !== undefined ? (body.targetUnit ? body.targetUnit.trim() : null) : undefined,
          matchType: body.matchType || undefined,
          targetField: body.targetField !== undefined ? (body.targetField ? body.targetField.trim() : 'all') : undefined,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
          color: body.color || undefined,
          description: body.description !== undefined ? body.description : undefined,
          priority: body.priority !== undefined ? Number(body.priority) : undefined
        }
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating cause rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/rules/:id (Delete rule)
  app.delete('/api/rules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.causeRule.delete({ where: { id } });
      const count = await prisma.causeRule.count();
      res.json({ success: true, message: 'Rule deleted', count });
    } catch (error: any) {
      console.error('Error deleting cause rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/rules/reset (Reset rules to default)
  app.post('/api/rules/reset', async (_req: Request, res: Response) => {
    try {
      await prisma.causeRule.deleteMany();
      for (const rule of DEFAULT_CAUSE_RULES) {
        await prisma.causeRule.create({
          data: {
            id: rule.id,
            keyword: rule.keyword,
            cause: rule.cause,
            targetUnit: rule.targetUnit || null,
            matchType: rule.matchType || 'contains',
            isActive: rule.isActive !== false,
            color: rule.color || '#2563EB',
            description: rule.description || null,
            priority: rule.priority || 0
          }
        });
      }
      const allRules = await prisma.causeRule.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
      });
      res.json({ success: true, data: allRules });
    } catch (error: any) {
      console.error('Error resetting cause rules:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: Exclusion Rules (ذخیره‌سازی کامل قوانین استثنا در دیتابیس SQLite)
  // ----------------------------------------------------
  // GET /api/exclusions
  app.get('/api/exclusions', async (_req: Request, res: Response) => {
    try {
      const rules = await prisma.exclusionRule.findMany({
        orderBy: { createdAt: 'asc' }
      });
      res.json({ success: true, count: rules.length, data: rules });
    } catch (error: any) {
      console.error('Error fetching exclusion rules:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/exclusions
  app.post('/api/exclusions', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body.keyword || !body.keyword.trim()) {
        return res.status(400).json({ success: false, error: 'keyword is required' });
      }

      const newRule = await prisma.exclusionRule.create({
        data: {
          id: body.id || undefined,
          keyword: body.keyword.trim(),
          targetUnit: body.targetUnit ? body.targetUnit.trim() : null,
          matchType: body.matchType || 'contains',
          field: body.field || 'subject',
          isActive: body.isActive !== false,
          reason: body.reason ? body.reason.trim() : 'استثنا شده'
        }
      });
      res.json({ success: true, data: newRule });
    } catch (error: any) {
      console.error('Error creating exclusion rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/exclusions/:id
  app.put('/api/exclusions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = req.body;

      const updated = await prisma.exclusionRule.update({
        where: { id },
        data: {
          keyword: body.keyword !== undefined ? body.keyword.trim() : undefined,
          targetUnit: body.targetUnit !== undefined ? (body.targetUnit ? body.targetUnit.trim() : null) : undefined,
          matchType: body.matchType || undefined,
          field: body.field || undefined,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
          reason: body.reason !== undefined ? body.reason : undefined
        }
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating exclusion rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/exclusions/:id
  app.delete('/api/exclusions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.exclusionRule.delete({
        where: { id }
      });
      const remainingCount = await prisma.exclusionRule.count();
      res.json({ success: true, message: 'Exclusion rule deleted', count: remainingCount });
    } catch (error: any) {
      console.error('Error deleting exclusion rule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/exclusions/reset
  app.post('/api/exclusions/reset', async (_req: Request, res: Response) => {
    try {
      await prisma.exclusionRule.deleteMany();
      for (const rule of DEFAULT_EXCLUSION_RULES) {
        await prisma.exclusionRule.create({
          data: {
            id: rule.id,
            keyword: rule.keyword,
            targetUnit: rule.targetUnit || null,
            matchType: rule.matchType || 'contains',
            field: rule.field || 'subject',
            isActive: rule.isActive !== false,
            reason: rule.reason || 'تست و آزمایشی'
          }
        });
      }
      const allRules = await prisma.exclusionRule.findMany({
        orderBy: { createdAt: 'asc' }
      });
      res.json({ success: true, data: allRules });
    } catch (error: any) {
      console.error('Error resetting exclusion rules:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: App Settings (تنظیمات برنامه در دیتابیس SQLite)
  // ----------------------------------------------------
  // GET /api/settings
  app.get('/api/settings', async (_req: Request, res: Response) => {
    try {
      const settings = await prisma.appSetting.findMany();
      const settingsMap: Record<string, any> = {};
      settings.forEach(s => {
        try {
          settingsMap[s.key] = JSON.parse(s.value);
        } catch {
          settingsMap[s.key] = s.value;
        }
      });
      res.json({ success: true, data: settingsMap });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/settings/:key
  app.get('/api/settings/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await prisma.appSetting.findUnique({
        where: { key }
      });
      if (!setting) {
        return res.status(404).json({ success: false, error: 'Setting not found' });
      }
      let parsedValue = setting.value;
      try {
        parsedValue = JSON.parse(setting.value);
      } catch {}
      res.json({ success: true, key: setting.key, value: parsedValue });
    } catch (error: any) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST or PUT /api/settings/:key
  app.post('/api/settings/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      const updated = await prisma.appSetting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue }
      });

      res.json({ success: true, key: updated.key, value });
    } catch (error: any) {
      console.error('Error saving setting:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // REST API: Full Backup & Restore (پشتیبان‌گیری کامل و بازیابی در برنامه دیگر)
  // ----------------------------------------------------
  app.get('/api/backup/export', async (req: Request, res: Response) => {
    try {
      const includeImages = req.query.includeImages !== 'false';
      const [letters, eraProcesses, allProcessImages, causeRules, exclusionRules, appSettings] = await Promise.all([
        prisma.letter.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.eraProcess.findMany({ orderBy: { createdAt: 'asc' } }),
        includeImages ? prisma.processImage.findMany({ orderBy: { sortOrder: 'asc' } }).catch(() => []) : Promise.resolve([]),
        prisma.causeRule.findMany({ orderBy: { priority: 'desc' } }),
        prisma.exclusionRule.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.appSetting.findMany()
      ]);

      const processImages = includeImages ? allProcessImages : [];
      const cleanEraProcesses = includeImages ? eraProcesses : eraProcesses.map(ep => {
        if (!ep.rawJson) return ep;
        try {
          const parsed = JSON.parse(ep.rawJson);
          delete parsed.formImages;
          delete parsed.formImageUrl;
          return { ...ep, rawJson: JSON.stringify(parsed) };
        } catch {
          return ep;
        }
      });

      const now = new Date();
      const backupPackage = {
        metadata: {
          version: '1.2.0',
          appName: 'سامانه پایش مکاتبات و هوش تجاری فرآیندهای ERA',
          exportTimestamp: now.toISOString(),
          includeImages,
          summary: {
            totalLetters: letters.length,
            deleteLetters: letters.filter(l => l.actionType === 'حذف').length,
            editLetters: letters.filter(l => l.actionType === 'ویرایش').length,
            totalEraProcesses: cleanEraProcesses.length,
            totalProcessImages: processImages.length,
            totalCauseRules: causeRules.length,
            totalExclusionRules: exclusionRules.length,
            totalSettings: appSettings.length
          }
        },
        data: {
          letters,
          eraProcesses: cleanEraProcesses,
          processImages,
          causeRules,
          exclusionRules,
          appSettings
        }
      };

      const fileSuffix = includeImages ? 'full_with_images' : 'lightweight_no_images';
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="bi_era_backup_${fileSuffix}_${now.toISOString().slice(0, 10)}.json"`);
      res.json(backupPackage);
    } catch (error: any) {
      console.error('Export backup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/backup/export', async (req: Request, res: Response) => {
    try {
      const { clientStorage, includeImages = true } = req.body || {};
      const shouldIncludeImages = includeImages !== false;

      const [letters, eraProcesses, allProcessImages, causeRules, exclusionRules, appSettings] = await Promise.all([
        prisma.letter.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.eraProcess.findMany({ orderBy: { createdAt: 'asc' } }),
        shouldIncludeImages ? prisma.processImage.findMany({ orderBy: { sortOrder: 'asc' } }).catch(() => []) : Promise.resolve([]),
        prisma.causeRule.findMany({ orderBy: { priority: 'desc' } }),
        prisma.exclusionRule.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.appSetting.findMany()
      ]);

      const processImages = shouldIncludeImages ? allProcessImages : [];
      const cleanEraProcesses = shouldIncludeImages ? eraProcesses : eraProcesses.map(ep => {
        if (!ep.rawJson) return ep;
        try {
          const parsed = JSON.parse(ep.rawJson);
          delete parsed.formImages;
          delete parsed.formImageUrl;
          return { ...ep, rawJson: JSON.stringify(parsed) };
        } catch {
          return ep;
        }
      });

      // Filter clientStorage if includeImages is false
      let filteredClientStorage = clientStorage || {};
      if (!shouldIncludeImages && clientStorage) {
        filteredClientStorage = {};
        Object.entries(clientStorage).forEach(([k, v]) => {
          if (!k.includes('_img_') && !k.includes('_imgs_')) {
            filteredClientStorage[k] = v;
          }
        });
      }

      const now = new Date();
      const backupPackage = {
        metadata: {
          version: '1.2.0',
          appName: 'سامانه پایش مکاتبات و هوش تجاری فرآیندهای ERA',
          exportTimestamp: now.toISOString(),
          includeImages: shouldIncludeImages,
          summary: {
            totalLetters: letters.length,
            deleteLetters: letters.filter(l => l.actionType === 'حذف').length,
            editLetters: letters.filter(l => l.actionType === 'ویرایش').length,
            totalEraProcesses: cleanEraProcesses.length,
            totalProcessImages: processImages.length,
            totalCauseRules: causeRules.length,
            totalExclusionRules: exclusionRules.length,
            totalSettings: appSettings.length,
            totalClientStorageKeys: Object.keys(filteredClientStorage).length
          }
        },
        data: {
          letters,
          eraProcesses: cleanEraProcesses,
          processImages,
          causeRules,
          exclusionRules,
          appSettings,
          clientStorage: filteredClientStorage
        }
      };

      res.json(backupPackage);
    } catch (error: any) {
      console.error('Export backup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/backup/import', async (req: Request, res: Response) => {
    try {
      const { backupData, mode = 'replace' } = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ success: false, error: 'فایل بکاپ نامعتبر است یا ساختار JSON نامناسب است.' });
      }

      const payload = backupData.data || backupData;
      const letters = Array.isArray(payload.letters) ? payload.letters : [];
      const eraProcesses = Array.isArray(payload.eraProcesses) ? payload.eraProcesses : [];
      const processImages = Array.isArray(payload.processImages) ? payload.processImages : [];
      const causeRules = Array.isArray(payload.causeRules) ? payload.causeRules : [];
      const exclusionRules = Array.isArray(payload.exclusionRules) ? payload.exclusionRules : [];
      const appSettings = Array.isArray(payload.appSettings)
        ? payload.appSettings
        : (payload.appSettings && typeof payload.appSettings === 'object'
            ? Object.entries(payload.appSettings).map(([key, val]) => ({ key, value: typeof val === 'string' ? val : JSON.stringify(val) }))
            : []);
      const clientStorage = payload.clientStorage || {};

      if (mode === 'replace') {
        // Clear existing tables for a clean restored state
        await prisma.letter.deleteMany();
        await prisma.processImage.deleteMany().catch(() => {});
        await prisma.eraProcess.deleteMany();
        await prisma.causeRule.deleteMany();
        await prisma.exclusionRule.deleteMany();
        await prisma.appSetting.deleteMany();
      }

      // Batch insert letters in chunks of 500
      let insertedLettersCount = 0;
      if (letters.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < letters.length; i += chunkSize) {
          const chunk = letters.slice(i, i + chunkSize).map((l: any) => ({
            id: l.id || undefined,
            letterId: l.letterId || null,
            actionType: l.actionType || l._actionType || 'ویرایش',
            subject: l.subject || l.موضوع || null,
            orgUnit: l.orgUnit || l._orgUnit || l['واحد سازمانی'] || null,
            sender: l.sender || l.فرستنده || null,
            receiver: l.receiver || l.گیرنده || null,
            dateStr: l.dateStr || l._dateStr || l['تاریخ ثبت'] || null,
            monthName: l.monthName || null,
            creatorName: l.creatorName || null,
            creatorRole: l.creatorRole || null,
            creatorRaw: l.creatorRaw || null,
            urgency: l.urgency || null,
            status: l.status || null,
            registrationNumber: l.registrationNumber || null,
            rawJson: typeof l.rawJson === 'string' ? l.rawJson : JSON.stringify(l)
          }));
          await prisma.letter.createMany({ data: chunk });
          insertedLettersCount += chunk.length;
        }
      }

      // Insert Era Processes
      let insertedEraCount = 0;
      if (eraProcesses.length > 0) {
        const eraRecords = eraProcesses.map((e: any) => ({
          id: e.id || undefined,
          processName: e.processName || e['نام فرایند'] || e['نام فرآیند'] || 'فرآیند سازمانی',
          orgUnit: e.orgUnit || e['واحد سازمانی'] || 'نامشخص',
          executionDate: e.executionDate || e['تاریخ انجام'] || '1405/01/01',
          operationType: e.operationType || e['نوع عملیات'] || 'اصلاح',
          entityType: e.entityType || e['نوع موجودیت'] || 'فرآیند',
          description: e.description || e['توضیحات'] || '',
          rawJson: typeof e.rawJson === 'string' ? e.rawJson : JSON.stringify(e)
        }));
        await prisma.eraProcess.createMany({ data: eraRecords });
        insertedEraCount = eraRecords.length;
      }

      // Insert Process Images
      let insertedImagesCount = 0;
      if (processImages.length > 0) {
        const imgRecords = processImages.map((img: any) => ({
          id: img.id || undefined,
          processId: img.processId,
          processName: img.processName || null,
          imageData: img.imageData,
          mimeType: img.mimeType || 'image/png',
          title: img.title || null,
          sortOrder: Number(img.sortOrder) || 0
        })).filter((img: any) => img.processId && img.imageData);
        if (imgRecords.length > 0) {
          await prisma.processImage.createMany({ data: imgRecords }).catch(() => {});
          insertedImagesCount = imgRecords.length;
        }
      }

      // Insert Cause Rules
      let insertedCauseRulesCount = 0;
      if (causeRules.length > 0) {
        const ruleRecords = causeRules.map((r: any) => ({
          id: r.id || undefined,
          keyword: String(r.keyword || '').trim(),
          cause: String(r.cause || '').trim(),
          targetUnit: r.targetUnit ? String(r.targetUnit).trim() : null,
          matchType: r.matchType || 'contains',
          isActive: r.isActive !== false,
          color: r.color || '#2563EB',
          description: r.description || null,
          priority: Number(r.priority) || 0
        })).filter((r: any) => r.keyword && r.cause);
        if (ruleRecords.length > 0) {
          await prisma.causeRule.createMany({ data: ruleRecords });
          insertedCauseRulesCount = ruleRecords.length;
        }
      }

      // Insert Exclusion Rules
      let insertedExclusionsCount = 0;
      if (exclusionRules.length > 0) {
        const exRecords = exclusionRules.map((x: any) => ({
          id: x.id || undefined,
          keyword: String(x.keyword || '').trim(),
          targetUnit: x.targetUnit ? String(x.targetUnit).trim() : null,
          matchType: x.matchType || 'contains',
          field: x.field || 'subject',
          isActive: x.isActive !== false,
          reason: x.reason ? String(x.reason).trim() : 'استثنا شده'
        })).filter((x: any) => x.keyword);
        if (exRecords.length > 0) {
          await prisma.exclusionRule.createMany({ data: exRecords });
          insertedExclusionsCount = exRecords.length;
        }
      }

      // Insert App Settings
      if (appSettings.length > 0) {
        for (const s of appSettings) {
          if (s.key) {
            await prisma.appSetting.upsert({
              where: { key: s.key },
              update: { value: typeof s.value === 'string' ? s.value : JSON.stringify(s.value) },
              create: { key: s.key, value: typeof s.value === 'string' ? s.value : JSON.stringify(s.value) }
            });
          }
        }
      }

      const totalLetters = await prisma.letter.count();
      const totalEra = await prisma.eraProcess.count();
      const totalImages = await prisma.processImage.count().catch(() => 0);
      const totalRules = await prisma.causeRule.count();
      const totalExclusions = await prisma.exclusionRule.count();

      res.json({
        success: true,
        message: 'بازیابی اطلاعات با موفقیت انجام شد.',
        mode,
        summary: {
          insertedLettersCount,
          insertedEraCount,
          insertedImagesCount,
          insertedCauseRulesCount,
          insertedExclusionsCount,
          totalLetters,
          totalEra,
          totalImages,
          totalRules,
          totalExclusions
        },
        clientStorage
      });
    } catch (error: any) {
      console.error('Import backup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // Gemini AI Key Configuration & Testing Endpoints
  // ----------------------------------------------------
  // GET /api/ai/config - Check AI key status and source
  app.get('/api/ai/config', async (_req: Request, res: Response) => {
    try {
      const { apiKey, source } = await getResolvedApiKey();
      res.json({
        success: true,
        hasKey: Boolean(apiKey && apiKey.trim() !== ''),
        source,
        maskedKey: apiKey ? maskApiKey(apiKey) : null,
        model: 'gemini-2.5-flash'
      });
    } catch (error: any) {
      console.error('Error getting AI config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/ai/save-key - Save API key directly in Database
  app.post('/api/ai/save-key', async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        return res.status(400).json({ success: false, error: 'کلید API نمی‌تواند خالی باشد.' });
      }

      const cleanKey = apiKey.trim();
      await prisma.appSetting.upsert({
        where: { key: 'gemini_api_key' },
        update: { value: cleanKey },
        create: { key: 'gemini_api_key', value: cleanKey }
      });

      // Update runtime process.env as well
      process.env.GEMINI_API_KEY = cleanKey;

      res.json({
        success: true,
        message: 'کلید اختصاصی API با موفقیت در پایگاه داده ذخیره شد.',
        maskedKey: maskApiKey(cleanKey),
        source: 'database'
      });
    } catch (error: any) {
      console.error('Error saving API key:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/ai/test-key - Test API key connection
  app.post('/api/ai/test-key', async (req: Request, res: Response) => {
    try {
      let testKey = req.body?.apiKey;
      if (!testKey || typeof testKey !== 'string' || testKey.trim() === '') {
        const resolved = await getResolvedApiKey();
        testKey = resolved.apiKey;
      } else {
        testKey = testKey.trim();
      }

      if (!testKey) {
        return res.status(400).json({
          success: false,
          error: 'هیچ کلید API مشخص نشده است. لطفاً ابتدا کلید را وارد نمایید.'
        });
      }

      const testStart = Date.now();
      const testAi = createGeminiClient(testKey);
      const response = await testAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'سلام، این یک پیام آزمایشی برای تست اتصال است. فقط کلمه "موفقیت" را بنویس.',
        config: {
          maxOutputTokens: 20,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const latencyMs = Date.now() - testStart;
      res.json({
        success: true,
        message: 'اتصال به هوش مصنوعی Gemini با موفقیت برقرار شد!',
        latencyMs,
        responseSample: response.text?.trim() || 'موفقیت',
        model: 'gemini-2.5-flash'
      });
    } catch (error: any) {
      console.error('Test API Key error:', error);
      res.status(400).json({
        success: false,
        error: `خطا در برقراری اتصال با این کلید: ${error.message || 'کلید نامعتبر است یا سهمیه تمام شده است'}`
      });
    }
  });

  // DELETE /api/ai/key - Delete custom API key from Database
  app.delete('/api/ai/key', async (_req: Request, res: Response) => {
    try {
      await prisma.appSetting.deleteMany({
        where: { key: 'gemini_api_key' }
      });
      const fallback = await getResolvedApiKey();
      res.json({
        success: true,
        message: 'کلید اختصاصی از تنظیمات پایگاه داده حذف شد.',
        hasFallbackKey: Boolean(fallback.apiKey && fallback.apiKey.trim() !== ''),
        fallbackSource: fallback.source,
        maskedKey: fallback.apiKey ? maskApiKey(fallback.apiKey) : null
      });
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------
  // Gemini AI BI Analytics & Intelligence Chat Endpoint
  // ----------------------------------------------------
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, history = [], debugMode = false } = req.body;
      const startTime = Date.now();

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ success: false, error: 'پیام ارسال‌شده خالی است.' });
      }

      const { apiKey } = await getResolvedApiKey();
      if (!apiKey || apiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'کلید API هوش مصنوعی (Gemini API Key) هنوز تنظیم نشده است. می‌توانید مستقیماً از بخش «تنظیمات سامانه > تنظیمات هوش مصنوعی» کلید API خود را وارد و ذخیره کنید (بدون نیاز به فایل .env).'
        });
      }

      // 1. Gather lightning-fast Pre-Aggregated BI Analytics from SQLite
      const [
        totalLetters,
        deleteCount,
        editCount,
        unitGroupStats,
        monthGroupStats,
        topRecurringSubjects,
        eraCount,
        activeRules
      ] = await Promise.all([
        prisma.letter.count(),
        prisma.letter.count({ where: { actionType: 'حذف' } }),
        prisma.letter.count({ where: { actionType: 'ویرایش' } }),
        prisma.$queryRawUnsafe(`
          SELECT orgUnit, COUNT(*) as total,
            SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes,
            SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits
          FROM Letter
          WHERE orgUnit IS NOT NULL AND TRIM(orgUnit) != ''
          GROUP BY orgUnit
          ORDER BY total DESC
          LIMIT 15
        `).catch(() => []),
        prisma.$queryRawUnsafe(`
          SELECT monthName, COUNT(*) as total,
            SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes,
            SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits
          FROM Letter
          WHERE monthName IS NOT NULL AND TRIM(monthName) != ''
          GROUP BY monthName
          ORDER BY total DESC
          LIMIT 12
        `).catch(() => []),
        prisma.$queryRawUnsafe(`
          SELECT subject, actionType, orgUnit, COUNT(*) as count
          FROM Letter
          WHERE subject IS NOT NULL AND TRIM(subject) != ''
          GROUP BY subject, actionType, orgUnit
          ORDER BY count DESC
          LIMIT 40
        `).catch(() => []),
        prisma.eraProcess.count().catch(() => 0),
        prisma.causeRule.findMany({ where: { isActive: true }, take: 20 }).catch(() => [])
      ]);

      // 2. Extract potential keywords from user query for targeted SQL drilling
      const queryKeywords = message
        .replace(/[؟?.,!،]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !['سلام', 'چرا', 'برای', 'نامه', 'های', 'است', 'بگو', 'کدام', 'خیلی', 'چه', 'میخواهم', 'میشه', 'ممنون'].includes(w));

      let targetedSearchResults: any[] = [];
      let targetedConditions = '';
      let targetedParams: string[] = [];

      if (queryKeywords.length > 0) {
        try {
          targetedConditions = queryKeywords.map(() => `subject LIKE ?`).join(' OR ');
          targetedParams = queryKeywords.map((k: string) => `%${k}%`);
          targetedSearchResults = await prisma.$queryRawUnsafe(`
            SELECT subject, orgUnit, actionType, monthName, COUNT(*) as count
            FROM Letter
            WHERE ${targetedConditions}
            GROUP BY subject, orgUnit, actionType
            ORDER BY count DESC
            LIMIT 25
          `, ...targetedParams);
        } catch (err) {
          console.warn('Targeted keyword query fallback:', err);
        }
      }

      // 3. Assemble compact high-density BI statistical payload
      const biPayload = {
        totalLetters,
        deleteCount,
        editCount,
        deleteRatioPercent: totalLetters > 0 ? ((deleteCount / totalLetters) * 100).toFixed(1) : '0',
        editRatioPercent: totalLetters > 0 ? ((editCount / totalLetters) * 100).toFixed(1) : '0',
        topUnits: (unitGroupStats as any[]).map(u => ({
          واحد: u.orgUnit,
          تعداد_کل: Number(u.total),
          حذف: Number(u.deletes),
          ویرایش: Number(u.edits)
        })),
        months: (monthGroupStats as any[]).map(m => ({
          ماه: m.monthName,
          تعداد_کل: Number(m.total),
          حذف: Number(m.deletes),
          ویرایش: Number(m.edits)
        })),
        topRecurringSubjects: (topRecurringSubjects as any[]).map(s => ({
          موضوع: s.subject,
          نوع: s.actionType,
          واحد: s.orgUnit,
          تکرار: Number(s.count)
        })),
        targetedSearchSamples: (targetedSearchResults as any[]).map(r => ({
          موضوع: r.subject,
          واحد: r.orgUnit,
          نوع: r.actionType,
          تعداد: Number(r.count)
        })),
        totalEraProcesses: eraCount,
        causeRulesCount: (activeRules as any[]).length
      };

      const systemInstruction = `شما دستیار هوش مصنوعی سامانه تحلیل داده‌های سازمان هستید.

قوانین پاسخ‌دهی هوشمند:
۱. احوالپرسی و پیام‌های عمومی: اگر پیام کاربر صرفاً سلام، احوالپرسی، تشکر، تست یا پیام عمومی بود (مانند «سلام»، «درود»، «خوبی»، «چطوری»، «ممنون»)، فقط یک پاسخ کوتاه، گرم و محترمانه بدهید و اعلام آمادگی کنید که در تحلیل داده‌ها و پاسخ به سوالات آماری در خدمت هستید. هرگز برای احوالپرسی، کل آمار و ارقام را بدون درخواست کاربر لیست نکنید.
۲. پاسخ به سوالات آماری و تحلیلی: اگر کاربر سوال مشخصی درباره داده‌ها، آمار نامه‌ها، واحدها، ماه‌ها، فرآیندها، علل یا موضوعات پرسید، فقط و فقط به همان بخش از سوال به شکل مستقیم، دقیق، مستند به ارقام داده‌شده و بدون زیاده‌گویی پاسخ دهید.
۳. عدم پرگویی: از توضیحات اضافه، مقدمه‌چینی‌های کلیشه‌ای و پیشنهادات ناخواسته پرهیز کنید.
${debugMode ? '۴. حالت دیباگ فعال است: در صورت پرسش آماری، در انتهای پاسخ یک بخش کوتاه با عنوان «🔍 مسیر استخراج داده و فرمول محاسباتی» قرار دهید و نحوه محاسبه یا فیلتر به کار رفته را بسیار خلاصه شرح دهید.' : '۴. حالت دیباگ خاموش است: هرگز اطلاعات فنی، نام جدول، کوئری SQL یا بخش «مسیر استخراج داده» را در پاسخ متنی خود نیاورید و صرفاً پاسخ مدیریتی و تحلیلی پاکیزه بدهید.'}`;

      // Build conversation contents
      const conversationPrompt = `داده‌های آماری سامانه (فقط در صورتی که سوال کاربر مربوط به آمار یا داده‌ها باشد از این اطلاعات استفاده کنید):
\`\`\`json
${JSON.stringify(biPayload, null, 2)}
\`\`\`

پیام کاربر:
${message}`;

      const aiResult = await generateContentWithResilience(apiKey, conversationPrompt, {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 1200,
        preferredModels: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash']
      });

      const answer = aiResult.text;
      const usedModel = aiResult.model;
      const processingTimeMs = aiResult.executionTimeMs;

      // Prepare comprehensive debug / trace information
      const executedSqlQueries = [
        {
          title: '۱. آمار سرجمع و تفکیک کلی عملیات‌ها',
          sql: `SELECT COUNT(*) as total, SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes, SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits FROM Letter;`,
          resultCount: 1
        },
        {
          title: '۲. تجمیع و رتبه‌بندی ۱۵ واحد سازمانی پردرخواست',
          sql: `SELECT orgUnit, COUNT(*) as total, SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes, SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits FROM Letter WHERE orgUnit IS NOT NULL GROUP BY orgUnit ORDER BY total DESC LIMIT 15;`,
          resultCount: (unitGroupStats as any[]).length
        },
        {
          title: '۳. تفکیک روند ماهانه عملیات‌های حذف و ویرایش',
          sql: `SELECT monthName, COUNT(*) as total, SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes, SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits FROM Letter WHERE monthName IS NOT NULL GROUP BY monthName ORDER BY total DESC LIMIT 12;`,
          resultCount: (monthGroupStats as any[]).length
        },
        {
          title: '۴. موضوعات پرتکرار و گلوگاه‌های دوباره‌کاری',
          sql: `SELECT subject, actionType, orgUnit, COUNT(*) as count FROM Letter WHERE subject IS NOT NULL GROUP BY subject, actionType, orgUnit ORDER BY count DESC LIMIT 40;`,
          resultCount: (topRecurringSubjects as any[]).length
        }
      ];

      if (queryKeywords.length > 0 && targetedConditions) {
        executedSqlQueries.push({
          title: `۵. جستجوی مستقیم کلیدواژه‌های استخراج‌شده از متن سوال (${queryKeywords.join('، ')})`,
          sql: `SELECT subject, orgUnit, actionType, monthName, COUNT(*) as count FROM Letter WHERE ${targetedConditions} GROUP BY subject, orgUnit, actionType ORDER BY count DESC LIMIT 25; -- پارامترها: [${targetedParams.join(', ')}]`,
          resultCount: targetedSearchResults.length
        });
      }

      const debugInfo = debugMode
        ? {
            debugMode: true,
            modelUsed: usedModel,
            processingTimeMs,
            keywordsExtracted: queryKeywords,
            sqlQueries: executedSqlQueries,
            payloadSummary: {
              totalLetters,
              deleteCount,
              editCount,
              eraProcesses: eraCount,
              activeRules: (activeRules as any[]).length
            }
          }
        : undefined;

      res.json({
        success: true,
        answer,
        biStats: {
          totalLetters,
          deleteCount,
          editCount,
          topUnitsCount: (unitGroupStats as any[]).length
        },
        ...(debugInfo ? { debugInfo } : {})
      });
    } catch (error: any) {
      console.error('Error in AI BI Chat:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی Gemini'
      });
    }
  });

  // ----------------------------------------------------
  // Gemini AI Bar Chart & Effective Actions Analysis Endpoint
  // ----------------------------------------------------
  app.post('/api/ai/analyze-chart', async (req: Request, res: Response) => {
    try {
      const {
        chartType = 'era',
        chartData = [],
        appliedFilters = {},
        metrics = {},
        focusAction = 'most_effective_actions',
        customPrompt = ''
      } = req.body;

      const startTime = Date.now();
      const { apiKey } = await getResolvedApiKey();

      if (!apiKey || apiKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'کلید API هوش مصنوعی (Gemini API Key) هنوز تنظیم نشده است. می‌توانید مستقیماً از بخش «تنظیمات سامانه > تنظیمات هوش مصنوعی» کلید API خود را وارد و ذخیره کنید.'
        });
      }

      // 1. Fetch relevant deep context from Database to enrich Gemini prompt
      let contextData: any = {};

      if (chartType === 'era') {
        // Fetch all ERA records or top effective automations and new creations
        const allEra = await prisma.eraProcess.findMany({
          orderBy: { createdAt: 'desc' }
        });

        const automations = allEra.filter(p => p.operationType === 'اتوماتیک‌سازی' || p.operationType === 'اتوماتیک سازی');
        const creations = allEra.filter(p => p.operationType === 'جدید');
        const fixes = allEra.filter(p => p.operationType === 'اصلاح');

        // Extract processes with notable descriptions, slide presentation selections, or problem descriptions
        const notableProcesses = allEra
          .map(p => {
            let parsedRaw: any = {};
            try {
              if (p.rawJson) parsedRaw = JSON.parse(p.rawJson);
            } catch {}
            return {
              نام_فرآیند: p.processName,
              واحد_سازمانی: p.orgUnit,
              نوع_اقدام: p.operationType,
              نوع_موجودیت: p.entityType,
              تاریخ_اجرا: p.executionDate,
              توضیحات: p.description || parsedRaw.description || '',
              مسئله_یا_هدف: parsedRaw.problemDescription || '',
              انتخاب_برای_اسلاید: p.isSelectedForSlide || parsedRaw.isSelectedForSlide || false
            };
          });

        contextData = {
          totalEraCount: allEra.length,
          automationsCount: automations.length,
          creationsCount: creations.length,
          fixesCount: fixes.length,
          topAutomations: notableProcesses.filter(p => p.نوع_اقدام?.includes('اتوماتیک')).slice(0, 20),
          topNewCreations: notableProcesses.filter(p => p.نوع_اقدام === 'جدید').slice(0, 15),
          slideSelectedPresentations: notableProcesses.filter(p => p.انتخاب_برای_اسلاید).slice(0, 15),
          sampleNotableItems: notableProcesses.filter(p => p.توضیحات && p.توضیحات.length > 5).slice(0, 25)
        };
      } else {
        // Letters Chart Context
        const [totalLetters, deleteCount, editCount, topLetterUnits, topSubjects] = await Promise.all([
          prisma.letter.count(),
          prisma.letter.count({ where: { actionType: 'حذف' } }),
          prisma.letter.count({ where: { actionType: 'ویرایش' } }),
          prisma.$queryRawUnsafe(`
            SELECT orgUnit, COUNT(*) as total,
              SUM(CASE WHEN actionType = 'حذف' THEN 1 ELSE 0 END) as deletes,
              SUM(CASE WHEN actionType = 'ویرایش' THEN 1 ELSE 0 END) as edits
            FROM Letter
            WHERE orgUnit IS NOT NULL AND TRIM(orgUnit) != ''
            GROUP BY orgUnit
            ORDER BY total DESC
            LIMIT 15
          `).catch(() => []),
          prisma.$queryRawUnsafe(`
            SELECT subject, actionType, orgUnit, COUNT(*) as count
            FROM Letter
            WHERE subject IS NOT NULL AND TRIM(subject) != ''
            GROUP BY subject, actionType, orgUnit
            ORDER BY count DESC
            LIMIT 25
          `).catch(() => [])
        ]);

        contextData = {
          totalLetters,
          deleteCount,
          editCount,
          topLetterUnits,
          topSubjects
        };
      }

      // 2. Build structured system prompt and prompt body
      const systemInstruction = `شما یک مشاور ارشد و تحلیل‌گر خبره هوش تجاری (BI)، معمار فرآیندهای سازمانی و مدیر ارشد فناوری اطلاعات هستید.
وظیفه شما: ارائه یک «تحلیل جامع، فوق‌العاده دقیق، انگیزه‌بخش و ساختاریافته مدیریتی بر پایه داده‌های نمودار میله‌ای و خلاصه موثرترین کارهای انجام‌شده» است.

قوانین نگارش و ساختار گزارش:
۱. زبان کاملاً رسمی، روان، تخصصی و به زبان فارسی زیبا با نگارش استاندارد.
۲. استفاده از مارک‌داون پیشرفته با تیترهای جذاب (##)، بالت‌پوینت‌های تفکیک‌شده، نشانگرهای آماری و بولد کردن کلمات کلیدی.
۳. عدم پرگویی یا کلی‌گویی: مستقیماً از داده‌های ارسالی و نام دقیق فرآیندها، واحدها و ارقام نمودار استفاده کنید.
۴. گزارش باید شامل این ۵ بخش تفکیک‌شده و خوانا باشد:
   - **🎯 ۱. خلاصه مدیریتی و دستاوردهای استراتژیک (Executive Summary)**
   - **🚀 ۲. موثرترین و اثرگذارترین اقدامات پیاده‌سازی‌شده (Top High-Impact Deliverables & Automations)** (نام فرآیندها، هدف آن‌ها، کاهش خطای انسانی و حذف دوباره‌کاری‌ها)
   - **📊 ۳. تحلیل توزیع و عملکرد واحدهای سازمانی بر اساس نمودار میله‌ای (Units Distribution Analysis)** (واحدهای پرفعالیت، واحدهای نیازمند توسعه بیشتر، پیشروهای اتوماتیک‌سازی)
   - **💡 ۴. نقاط عطف تحول دیجیتال و تغییرات ساختاری (Digital Transformation Milestones)**
   - **🔮 ۵. سه پیشنهاد راهبردی و اقدام عملیاتی برای گام‌های پیش‌رو (Actionable Next Steps)**`;

      const promptPayload = {
        نوع_نمودار: chartType === 'era' ? 'نمودار میله‌ای توزیع فرآیندها و فرم‌های ERA به تفکیک واحدها' : 'نمودار میله‌ای توزیع نامه‌ها و مکاتبات',
        داده‌های_نمودار_میله_ای_فعلی: chartData.slice(0, 25),
        فیلترهای_اعمال_شده_توسط_کاربر: appliedFilters,
        شاخص_های_کلیدی_محاسبه_شده: metrics,
        جزییات_فرآیندها_و_کارهای_موثر_در_پایگاه_داده: contextData,
        درخواست_یا_تاکید_خاص_کاربر: customPrompt || 'تحلیل موثرترین اقدامات انجام‌شده، اتوماتیک‌سازی‌ها و توزیع ستون‌های نمودار'
      };

      const userPrompt = `لطفاً داده‌های زیر را به دقت تحلیل کرده و گزارش تحلیلی کامل و ساختاریافته درباره نمودار میله‌ای و موثرترین کارهای انجام شده را ارائه دهید:

\`\`\`json
${JSON.stringify(promptPayload, null, 2)}
\`\`\``;

      const aiResult = await generateContentWithResilience(apiKey, userPrompt, {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 2500,
        preferredModels: ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash-lite']
      });

      const analysisText = aiResult.text;
      const usedModel = aiResult.model;
      const executionTimeMs = aiResult.executionTimeMs;

      res.json({
        success: true,
        analysis: analysisText,
        model: usedModel,
        executionTimeMs,
        appliedFilters,
        timestamp: new Date().toISOString(),
        summaryStats: {
          totalUnitsAnalyzed: chartData.length,
          totalItemsCount: metrics.totalItems || chartData.reduce((acc: number, c: any) => acc + (c.total || c.count || 0), 0),
          chartType
        }
      });
    } catch (error: any) {
      console.error('Error analyzing chart with AI:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'خطا در تحلیل نمودار توسط هوش مصنوعی Gemini'
      });
    }
  });


  // ----------------------------------------------------
  // Vite Middleware Setup for Frontend SPA
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 REST Server running at http://0.0.0.0:${PORT}`);
    console.log(`📦 Database: SQLite with Prisma 7 (file:./dev.db)`);
  });
}

startServer();
