import { RawLetterItem, RawEraItem, ProcessedEraItem, CauseRule, ExclusionRule, LetterQueryParams, LettersServerFilterResponse } from '../types';

export interface EraQueryParams {
  unit?: string;
  opType?: string;
  entityType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  imageFilter?: 'all' | 'with_image' | 'no_image';
  slideFilter?: 'all' | 'selected' | 'unselected';
  page?: number | 'all';
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EraServerFilterResponse {
  success: boolean;
  count: number;
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  executionTimeMs?: number;
  appliedFilters?: Record<string, any>;
  stats?: {
    total: number;
    creationCount: number;
    fixCount: number;
    autoCount: number;
    withImagesCount: number;
  };
  data: RawEraItem[];
}

export interface HealthStatus {
  status: string;
  database: string;
  orm: string;
  persistence: string;
  architecture: string;
  stats: {
    lettersCount: number;
    eraCount: number;
    rulesCount?: number;
  };
  timestamp: string;
}

export const api = {
  // ----------------------------------------------------
  // Health & Diagnostics
  // ----------------------------------------------------
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async seedDatabase(force = false): Promise<{ success: boolean; lettersCount: number; eraCount: number; seeded: boolean }> {
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force })
    });
    if (!res.ok) throw new Error('Failed to re-seed database');
    return res.json();
  },

  // ----------------------------------------------------
  // Letters REST Operations
  // ----------------------------------------------------
  async getLetters(params?: { unit?: string; actionType?: string; search?: string }): Promise<RawLetterItem[]> {
    const url = new URL('/api/letters', window.location.origin);
    if (params?.unit && params.unit !== 'all') url.searchParams.set('unit', params.unit);
    if (params?.actionType && params.actionType !== 'all') url.searchParams.set('actionType', params.actionType);
    if (params?.search) url.searchParams.set('search', params.search);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch letters from REST API');
    const result = await res.json();
    return result.data || [];
  },

  async getLettersFiltered(params: LetterQueryParams): Promise<LettersServerFilterResponse> {
    const url = new URL('/api/letters', window.location.origin);
    if (params.units && params.units.length > 0) {
      url.searchParams.set('units', params.units.join(','));
    } else if (params.unit && params.unit !== 'all') {
      url.searchParams.set('unit', params.unit);
    }
    if (params.month && params.month !== 'all') url.searchParams.set('month', params.month);
    if (params.actionType && params.actionType !== 'all') url.searchParams.set('actionType', params.actionType);
    if (params.cause && params.cause !== 'all') url.searchParams.set('cause', params.cause);
    if (params.showExcludedOnly !== undefined) url.searchParams.set('showExcludedOnly', String(params.showExcludedOnly));
    if (params.startDate) url.searchParams.set('startDate', params.startDate);
    if (params.endDate) url.searchParams.set('endDate', params.endDate);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize));
    if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch filtered letters from server database');
    return res.json();
  },

  async getLetterById(id: string | number): Promise<any> {
    const res = await fetch(`/api/letters/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch letter ${id}`);
    const result = await res.json();
    return result.data;
  },

  async saveLetters(items: RawLetterItem[], mode: 'append' | 'replace' = 'append'): Promise<{ success: boolean; insertedCount: number; totalCount: number }> {
    const res = await fetch('/api/letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save letters to SQLite database');
    }
    return res.json();
  },

  async deleteLetter(id: string | number): Promise<void> {
    const res = await fetch(`/api/letters/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete letter');
  },

  async clearLetters(): Promise<void> {
    const res = await fetch('/api/letters', {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear letters');
  },

  // ----------------------------------------------------
  // ERA Processes REST Operations
  // ----------------------------------------------------
  async getEraItems(params?: { unit?: string; opType?: string; entityType?: string; search?: string; startDate?: string; endDate?: string }): Promise<RawEraItem[]> {
    const url = new URL('/api/era', window.location.origin);
    if (params?.unit && params.unit !== 'all') url.searchParams.set('unit', params.unit);
    if (params?.opType && params.opType !== 'all') url.searchParams.set('opType', params.opType);
    if (params?.entityType && params.entityType !== 'all') url.searchParams.set('entityType', params.entityType);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.startDate) url.searchParams.set('startDate', params.startDate);
    if (params?.endDate) url.searchParams.set('endDate', params.endDate);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch ERA processes from REST API');
    const result = await res.json();
    return result.data || [];
  },

  async getEraFiltered(params: EraQueryParams): Promise<EraServerFilterResponse> {
    const url = new URL('/api/era', window.location.origin);
    if (params.unit && params.unit !== 'all') url.searchParams.set('unit', params.unit);
    if (params.opType && params.opType !== 'all') url.searchParams.set('opType', params.opType);
    if (params.entityType && params.entityType !== 'all') url.searchParams.set('entityType', params.entityType);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.startDate) url.searchParams.set('startDate', params.startDate);
    if (params.endDate) url.searchParams.set('endDate', params.endDate);
    if (params.imageFilter && params.imageFilter !== 'all') url.searchParams.set('imageFilter', params.imageFilter);
    if (params.slideFilter && params.slideFilter !== 'all') url.searchParams.set('slideFilter', params.slideFilter);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize));
    if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch filtered ERA items from server');
    return res.json();
  },

  async createEraItem(item: Partial<ProcessedEraItem> | RawEraItem): Promise<any> {
    const res = await fetch('/api/era', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create ERA process');
    }
    return res.json();
  },

  async updateEraItem(id: string, item: Partial<ProcessedEraItem> | RawEraItem): Promise<any> {
    const res = await fetch(`/api/era/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update ERA process');
    }
    return res.json();
  },

  async deleteEraItem(id: string): Promise<void> {
    const res = await fetch(`/api/era/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete ERA process');
  },

  async toggleEraSlide(id: string, isSelectedForSlide: boolean): Promise<any> {
    try {
      const res = await fetch(`/api/era/${encodeURIComponent(id)}/slide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSelectedForSlide })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to toggle slide selection in SQLite');
      }
      return res.json();
    } catch (e) {
      console.warn('REST API toggleEraSlide notice:', e);
      return { success: false };
    }
  },

  async batchUpdateEraSlide(ids: string[], isSelectedForSlide: boolean): Promise<any> {
    try {
      const res = await fetch('/api/era/batch-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isSelectedForSlide })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to batch update slide selection in SQLite');
      }
      return res.json();
    } catch (e) {
      console.warn('REST API batchUpdateEraSlide notice:', e);
      return { success: false };
    }
  },

  async reorderEraSlides(orders: { id: string; slideNumber: number }[]): Promise<{ success: boolean; updatedCount?: number }> {
    try {
      const res = await fetch('/api/era/reorder-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reorder slides in SQLite');
      }
      return res.json();
    } catch (e) {
      console.warn('REST API reorderEraSlides notice:', e);
      return { success: false };
    }
  },

  async updateEraSlideOrder(id: string, slideNumber: number | null): Promise<{ success: boolean; slideNumber?: number | null }> {
    try {
      const res = await fetch(`/api/era/${encodeURIComponent(id)}/slide-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideNumber })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update slide order in SQLite');
      }
      return res.json();
    } catch (e) {
      console.warn('REST API updateEraSlideOrder notice:', e);
      return { success: false };
    }
  },

  async saveEraItems(items: RawEraItem[], mode: 'append' | 'replace' = 'append'): Promise<{ success: boolean; insertedCount: number; totalCount: number }> {
    const res = await fetch('/api/era', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save ERA items to SQLite database');
    }
    return res.json();
  },

  async clearEra(): Promise<void> {
    const res = await fetch('/api/era', {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear ERA processes');
  },

  // ----------------------------------------------------
  // ERA Process Images in SQLite (ذخیره‌سازی تصاویر در SQLite)
  // ----------------------------------------------------
  async getProcessImages(processId: string): Promise<string[]> {
    try {
      const res = await fetch(`/api/era/${encodeURIComponent(processId)}/images`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        return data.images.map((img: any) => img.imageData).filter(Boolean);
      }
      return [];
    } catch (e) {
      console.error('Error fetching process images from SQLite:', e);
      return [];
    }
  },

  async saveProcessImages(processId: string, images: string[], processName?: string): Promise<{ success: boolean; savedCount: number }> {
    const res = await fetch(`/api/era/${encodeURIComponent(processId)}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, processName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در ذخیره‌سازی تصاویر در دیتابیس SQLite');
    }
    return res.json();
  },

  async deleteProcessImage(processId: string, imageId: string): Promise<void> {
    const res = await fetch(`/api/era/${encodeURIComponent(processId)}/images/${encodeURIComponent(imageId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete image from SQLite');
  },

  // ----------------------------------------------------
  // Cause Rules REST Operations (قوانین و تنظیمات عامل)
  // ----------------------------------------------------
  async getRules(): Promise<CauseRule[]> {
    const res = await fetch('/api/rules');
    if (!res.ok) throw new Error('Failed to fetch cause rules');
    const result = await res.json();
    return result.data || [];
  },

  async createRule(rule: Partial<CauseRule>): Promise<CauseRule> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create cause rule');
    }
    const result = await res.json();
    return result.data;
  },

  async updateRule(id: string, rule: Partial<CauseRule>): Promise<CauseRule> {
    const res = await fetch(`/api/rules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update cause rule');
    }
    const result = await res.json();
    return result.data;
  },

  async deleteRule(id: string): Promise<void> {
    const res = await fetch(`/api/rules/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete cause rule');
  },

  async resetRules(): Promise<CauseRule[]> {
    const res = await fetch('/api/rules/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to reset cause rules');
    const result = await res.json();
    return result.data || [];
  },

  // ----------------------------------------------------
  // Exclusion Rules REST Operations (قوانین استثنا / نادیده‌گیری)
  // ----------------------------------------------------
  async getExclusions(): Promise<ExclusionRule[]> {
    const res = await fetch('/api/exclusions');
    if (!res.ok) throw new Error('Failed to fetch exclusion rules');
    const result = await res.json();
    return result.data || [];
  },

  async createExclusion(rule: Partial<ExclusionRule>): Promise<ExclusionRule> {
    const res = await fetch('/api/exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create exclusion rule');
    }
    const result = await res.json();
    return result.data;
  },

  async updateExclusion(id: string, rule: Partial<ExclusionRule>): Promise<ExclusionRule> {
    const res = await fetch(`/api/exclusions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update exclusion rule');
    }
    const result = await res.json();
    return result.data;
  },

  async deleteExclusion(id: string): Promise<void> {
    const res = await fetch(`/api/exclusions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete exclusion rule');
  },

  async resetExclusions(): Promise<ExclusionRule[]> {
    const res = await fetch('/api/exclusions/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to reset exclusion rules');
    const result = await res.json();
    return result.data || [];
  },

  // ----------------------------------------------------
  // App Settings REST Operations (ذخیره کلیه تنظیمات در دیتابیس)
  // ----------------------------------------------------
  async getSettings(): Promise<Record<string, any>> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch app settings');
    const result = await res.json();
    return result.data || {};
  },

  async getSetting(key: string): Promise<any> {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const result = await res.json();
    return result.value;
  },

  async saveSetting(key: string, value: any): Promise<any> {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    if (!res.ok) throw new Error(`Failed to save setting ${key}`);
    const result = await res.json();
    return result.value;
  },

  // ----------------------------------------------------
  // Gemini AI BI Analytics & Intelligence Chat
  // ----------------------------------------------------
  async askAiBiAssistant(
    message: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = [],
    debugMode: boolean = false
  ): Promise<{ answer: string; biStats: any; debugInfo?: any }> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, debugMode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در ارتباط با مشاور هوش مصنوعی');
    }
    const result = await res.json();
    return {
      answer: result.answer,
      biStats: result.biStats,
      debugInfo: result.debugInfo
    };
  },

  // ----------------------------------------------------
  // Backup & Restore Operations (پشتیبان‌گیری کامل و بازیابی)
  // ----------------------------------------------------
  async exportBackup(includeClientStorage: boolean = true, includeImages: boolean = true): Promise<Blob> {
    const clientStorage: Record<string, string> = {};
    if (includeClientStorage && typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('era_') ||
              key.startsWith('show_floating_ai_') ||
              key.startsWith('ai_bi_') ||
              key.startsWith('bi_') ||
              key.startsWith('unit_cause_'))
          ) {
            // If includeImages is false, skip image keys
            if (!includeImages && (key.includes('_img_') || key.includes('_imgs_'))) {
              continue;
            }
            const val = localStorage.getItem(key);
            if (val !== null) {
              clientStorage[key] = val;
            }
          }
        }
      } catch (e) {
        console.warn('Error reading localStorage for backup:', e);
      }
    }

    const res = await fetch('/api/backup/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientStorage, includeImages })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در دریافت نسخه پشتیبان');
    }
    return await res.blob();
  },

  async restoreBackup(backupData: any, mode: 'replace' | 'merge' = 'replace'): Promise<any> {
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, mode })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در بازیابی نسخه پشتیبان');
    }
    const result = await res.json();

    // If clientStorage was returned, restore it to localStorage
    if (result.clientStorage && typeof window !== 'undefined') {
      try {
        Object.entries(result.clientStorage).forEach(([k, v]) => {
          if (typeof v === 'string') {
            localStorage.setItem(k, v);
          }
        });
      } catch (e) {
        console.warn('Error restoring client storage:', e);
      }
    }

    return result;
  },

  // ----------------------------------------------------
  // Gemini API Key Management (تنظیم و تست کلید هوش مصنوعی)
  // ----------------------------------------------------
  async getAiConfig(): Promise<{
    hasKey: boolean;
    source: 'database' | 'env' | 'none';
    maskedKey: string | null;
    model: string;
  }> {
    const res = await fetch('/api/ai/config');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در دریافت وضعیت کلید هوش مصنوعی');
    }
    return res.json();
  },

  async saveApiKey(apiKey: string): Promise<{
    success: boolean;
    message: string;
    maskedKey: string;
    source: string;
  }> {
    const res = await fetch('/api/ai/save-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در ذخیره کلید هوش مصنوعی');
    }
    return res.json();
  },

  async testApiKey(apiKey?: string): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    responseSample?: string;
    model?: string;
  }> {
    const res = await fetch('/api/ai/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در تست برقراری ارتباط با هوش مصنوعی');
    }
    return res.json();
  },

  async deleteApiKey(): Promise<{
    success: boolean;
    message: string;
    hasFallbackKey: boolean;
    fallbackSource: string;
    maskedKey: string | null;
  }> {
    const res = await fetch('/api/ai/key', {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در حذف کلید هوش مصنوعی');
    }
    return res.json();
  },

  // ----------------------------------------------------
  // Gemini AI Bar Chart & Effective Actions Analysis
  // ----------------------------------------------------
  async analyzeBarChart(payload: {
    chartType?: 'era' | 'letters';
    chartData: any[];
    appliedFilters?: Record<string, any>;
    metrics?: Record<string, any>;
    focusAction?: string;
    customPrompt?: string;
  }): Promise<{
    success: boolean;
    analysis: string;
    model: string;
    executionTimeMs: number;
    appliedFilters?: Record<string, any>;
    timestamp: string;
    summaryStats?: {
      totalUnitsAnalyzed: number;
      totalItemsCount: number;
      chartType: string;
    };
  }> {
    const res = await fetch('/api/ai/analyze-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در تحلیل نمودار توسط هوش مصنوعی');
    }
    return res.json();
  }
};


