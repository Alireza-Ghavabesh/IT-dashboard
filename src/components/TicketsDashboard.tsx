import React, { useState, useMemo } from 'react';
import {
  LifeBuoy,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Users,
  Star,
  Download,
  UploadCloud,
  FileJson,
  Layers,
  Settings,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ProcessedDanaTicket, TicketSyncConfig } from '../types';
import { formatNumber, exportToCSV } from '../utils/parser';

interface TicketsDashboardProps {
  tickets: ProcessedDanaTicket[];
  totalRows: number;
  lastSyncTime?: string | null;
  config?: TicketSyncConfig | null;
  onSync: (config: TicketSyncConfig) => Promise<{ success: boolean; count: number; error?: string }>;
  onSaveConfig: (config: TicketSyncConfig) => Promise<void>;
  onImportJson: (jsonString: string) => Promise<{ success: boolean; count: number; error?: string }>;
}

export const TicketsDashboard: React.FC<TicketsDashboardProps> = ({
  tickets,
  totalRows,
  lastSyncTime,
  config,
  onSync,
  onSaveConfig,
  onImportJson
}) => {
  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings & Import modals
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [rawJsonInput, setRawJsonInput] = useState<string>('');

  // Config Form
  const [apiUrl, setApiUrl] = useState<string>(config?.apiUrl || 'http://it.novinchoob.local/api/Entity/GetEntityRemoteDataDynamic');
  const [cookie, setCookie] = useState<string>(config?.cookie || '');
  const [pageSize, setPageSize] = useState<number>(config?.pageSize || 50);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<string>('all');

  // IT Staff members list
  const staffList = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach(t => {
      const name = t.itStaffName || 'تخصیص‌نیافته';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // Statuses list
  const statusList = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach(t => {
      const s = t.status || 'نامشخص';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter(t => {
      if (selectedStaff !== 'all' && t.itStaffName !== selectedStaff) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedApplicant !== 'all' && t.applicantName !== selectedApplicant) return false;

      if (q) {
        const mTitle = (t.title || '').toLowerCase().includes(q);
        const mNum = String(t.ticketNumber).includes(q);
        const mApp = (t.applicantName || '').toLowerCase().includes(q);
        const mStaff = (t.itStaffName || '').toLowerCase().includes(q);
        if (!mTitle && !mNum && !mApp && !mStaff) return false;
      }
      return true;
    });
  }, [tickets, selectedStaff, selectedStatus, selectedApplicant, searchQuery]);

  // Chart Data: By IT Staff
  const staffChartData = useMemo(() => {
    return staffList.slice(0, 8).map(([name, count]) => ({
      name,
      count
    }));
  }, [staffList]);

  // Chart Data: By Status (Pie)
  const statusChartData = useMemo(() => {
    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];
    return statusList.map(([name, count], index) => ({
      name,
      value: count,
      color: COLORS[index % COLORS.length]
    }));
  }, [statusList]);

  const handleStartSync = async () => {
    if (!cookie.trim()) {
      setIsConfigOpen(true);
      setSyncStatusMsg({
        type: 'error',
        text: 'برای استعلام و همگام‌سازی، ابتدا کوکی مرورگر را در پنجره تنظیمات وارد کنید.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await onSync({
        apiUrl: apiUrl.trim(),
        cookie: cookie.trim(),
        pageSize,
        entityId: 'f904f186-46e2-4ac2-8d2f-5527368ccc8c'
      });

      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `همگام‌سازی با موفقیت انجام شد! ${formatNumber(res.count)} تیکت دریافت و ذخیره گردید.`
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'خطا در ارتباط با سامانه دانا'
        });
      }
    } catch (e: any) {
      setSyncStatusMsg({
        type: 'error',
        text: e.message || 'خطا در ارتباط با سرور'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfigModal = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig({
      apiUrl: apiUrl.trim(),
      cookie: cookie.trim(),
      pageSize,
      entityId: 'f904f186-46e2-4ac2-8d2f-5527368ccc8c'
    });
    setIsConfigOpen(false);
    setSyncStatusMsg({
      type: 'success',
      text: 'تنظیمات اتصال به سامانه دانا ذخیره شد.'
    });
  };

  const handleJsonSubmit = async () => {
    if (!rawJsonInput.trim()) return;
    try {
      const res = await onImportJson(rawJsonInput.trim());
      if (res.success) {
        setIsJsonModalOpen(false);
        setRawJsonInput('');
        setSyncStatusMsg({
          type: 'success',
          text: `تعداد ${formatNumber(res.count)} تیکت از فایل یا پاسخ JSON با موفقیت ثبت شد.`
        });
      } else {
        alert(res.error || 'خطا در ساختار JSON');
      }
    } catch (err: any) {
      alert(`خطا در پردازش JSON: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (!filteredTickets.length) return;
    const rows = filteredTickets.map(t => ({
      'شماره تیکت': t.ticketNumber,
      'عنوان تیکت': t.title,
      'وضعیت': t.status,
      'درخواست دهنده': t.applicantName,
      'کارشناس IT': t.itStaffName,
      'تاریخ ثبت': t.createDateFa,
      'میزان رضایت': t.satisfactionRateName || 'ثبت نشده'
    }));
    exportToCSV(`dana_tickets_${Date.now()}`, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-l from-[#FAFAF7] via-white to-[#F5F4EE] rounded-3xl p-5 sm:p-6 border border-[#E2E0D8] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#545D4B] text-white flex items-center justify-center shadow-xs shrink-0">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#2D2C28]">
                  داشبورد تیکت‌های پشتیبانی IT (سامانه دانا پرداز)
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                  اتصال شبکه داخلی (it.novinchoob.local)
                </span>
              </div>
              <p className="text-xs text-[#75746E] mt-1 font-medium">
                استعلام خودکار و تحلیل هوشمند عملکرد کارشناسان، وضعیت‌ها و رضایت‌سنجی تیکت‌ها
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            {/* Sync Button */}
            <button
              type="button"
              onClick={handleStartSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#545D4B] hover:bg-[#434B3C] text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
              title="ارسال درخواست به سامانه دانا و به‌روزرسانی تیکت‌ها"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'در حال دریافت تیکت‌ها...' : 'همگام‌سازی تیکت‌ها'}</span>
            </button>

            {/* Direct JSON Import Button */}
            <button
              type="button"
              onClick={() => setIsJsonModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F4EE] text-[#545D4B] font-bold text-xs border border-[#DDDBCF] transition shadow-2xs cursor-pointer"
              title="درج مستقیم متن یا پاسخ JSON کپی‌شده از Network مرورگر"
            >
              <FileJson className="h-4 w-4 text-amber-700" />
              <span>درج مستقیم JSON</span>
            </button>

            {/* Config Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F4EE] text-[#545D4B] font-bold text-xs border border-[#DDDBCF] transition shadow-2xs cursor-pointer"
              title="تنظیم آدرس سرور دانا و کوکی‌های احراز هویت"
            >
              <Settings className="h-4 w-4 text-[#8A8880]" />
              <span>تنظیمات کوکی</span>
            </button>

            {/* CSV Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!filteredTickets.length}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F4EE] text-[#545D4B] font-bold text-xs border border-[#DDDBCF] transition shadow-2xs cursor-pointer disabled:opacity-40"
              title="خروجی اکسل / CSV از تیکت‌های فیلترشده"
            >
              <Download className="h-4 w-4 text-emerald-700" />
              <span>اکسل</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            syncStatusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{syncStatusMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatusMsg(null)}
              className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              بستن
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center justify-between text-[#75746E] text-xs font-bold">
            <span>کل تیکت‌ها</span>
            <LifeBuoy className="h-4 w-4 text-[#545D4B]" />
          </div>
          <div className="text-2xl font-black text-[#2D2C28] mt-2 font-mono">
            {formatNumber(tickets.length)}
          </div>
          <div className="text-[10px] text-[#8A8880] mt-1 font-medium">
            تعداد ردیف‌های ثبت‌شده در دیتابیس
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>انجام‌شده / بسته</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2 font-mono">
            {formatNumber(tickets.filter(t => t.status.includes('انجام') || t.status.includes('بسته')).length)}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-1 font-medium">
            تیکت‌های تکمیل و مختومه
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>کارشناسان IT فعال</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 mt-2 font-mono">
            {formatNumber(staffList.length)}
          </div>
          <div className="text-[10px] text-blue-600/80 mt-1 font-medium">
            پرسنل متولی پیگیری تیکت‌ها
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>آخرین همگام‌سازی</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xs font-black text-[#2D2C28] mt-2 font-mono truncate" dir="ltr">
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('fa-IR') : 'هنوز انجام نشده'}
          </div>
          <div className="text-[10px] text-[#8A8880] mt-1 font-medium">
            زمان آخرین فراخوانی از سامانه دانا
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart: Distribution by IT Staff */}
          <div className="lg:col-span-2 bg-[#FAFAF7] rounded-3xl p-5 border border-[#E2E0D8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#545D4B]" />
                <h3 className="text-xs font-bold text-[#2D2C28]">
                  توزیع تیکت‌ها به تفکیک کارشناس واحد IT
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#75746E]">
                {formatNumber(staffChartData.length)} کارشناس
              </span>
            </div>

            <div className="h-64 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'Vazirmatn' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#4B5563', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', fontSize: '11px', textAlign: 'right' }}
                    formatter={(val: any) => [`${formatNumber(val)} تیکت`, 'تعداد']}
                  />
                  <Bar dataKey="count" fill="#545D4B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Status Breakdown */}
          <div className="bg-[#FAFAF7] rounded-3xl p-5 border border-[#E2E0D8] shadow-xs space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-[#2D2C28]">
                  وضعیت‌های تیکت
                </h3>
              </div>
            </div>

            <div className="h-52 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', fontSize: '11px', textAlign: 'right' }}
                    formatter={(val: any) => [`${formatNumber(val)} تیکت`, 'تعداد']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#E8E6DF]">
              {statusChartData.map(st => (
                <div key={st.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="text-[#5A5852] font-medium">{st.name}</span>
                  </div>
                  <span className="font-bold text-[#2D2C28] font-mono">{formatNumber(st.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Table Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#E2E0D8] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#545D4B]" />
            <h3 className="text-sm font-black text-[#2D2C28]">
              فهرست و جستجوی تیکت‌ها
            </h3>
            <span className="bg-[#EFEFEA] text-[#4B5344] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#DDDBCF]">
              نمایش {formatNumber(filteredTickets.length)} از {formatNumber(tickets.length)}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#8A8880]" />
            <input
              type="text"
              placeholder="جستجو در شماره، عنوان، نام متقاضی یا کارشناس..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-xl pr-9 pl-3 py-2 text-xs text-[#2D2C28] placeholder-[#8A8880] focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
            />
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#75746E] mb-1">
              فیلتر کارشناس IT:
            </label>
            <select
              value={selectedStaff}
              onChange={e => setSelectedStaff(e.target.value)}
              className="w-full bg-white border border-[#DDDBCF] rounded-xl px-3 py-2 font-medium text-[#2D2C28] focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
            >
              <option value="all">همه کارشناسان ({formatNumber(tickets.length)})</option>
              {staffList.map(([staff, count]) => (
                <option key={staff} value={staff}>
                  {staff} ({formatNumber(count)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#75746E] mb-1">
              فیلتر وضعیت تیکت:
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-[#DDDBCF] rounded-xl px-3 py-2 font-medium text-[#2D2C28] focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
            >
              <option value="all">همه وضعیت‌ها</option>
              {statusList.map(([st, count]) => (
                <option key={st} value={st}>
                  {st} ({formatNumber(count)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {(selectedStaff !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStaff('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#DDDBCF] bg-white">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#EBEBE6] text-[#2D2C28] font-bold border-b border-[#DDDBCF]">
                <th className="py-2.5 px-3 text-center w-16 font-mono"># تیکت</th>
                <th className="py-2.5 px-3">عنوان تیکت</th>
                <th className="py-2.5 px-3 text-center">وضعیت</th>
                <th className="py-2.5 px-3">متقاضی (درخواست‌دهنده)</th>
                <th className="py-2.5 px-3">کارشناس IT</th>
                <th className="py-2.5 px-3 text-center">تاریخ ثبت (شمسی)</th>
                <th className="py-2.5 px-3 text-center">رضایت‌سنجی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEA]">
              {filteredTickets.length > 0 ? (
                filteredTickets.map(t => (
                  <tr key={t.id} className="hover:bg-[#F9F9F6] transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {t.ticketNumber}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#2D2C28] max-w-[280px]">
                      <span className="line-clamp-1" title={t.title}>
                        {t.title}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status.includes('انجام') || t.status.includes('بسته')
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : t.status.includes('بررسی')
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#5A5852] font-medium">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#8A8880]" />
                        <span>{t.applicantName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#2D2C28] font-bold">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                        {t.itStaffName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[#5A5852] whitespace-nowrap" dir="ltr">
                      {t.createDateFa}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {t.satisfactionRateName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span>{t.satisfactionRateName}</span>
                        </span>
                      ) : (
                        <span className="text-[#A09E96] text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A8880] text-xs">
                    {tickets.length === 0
                      ? 'هنوز هیچ تیکتی دریافت نشده است. لطفاً دکمه «همگام‌سازی تیکت‌ها» یا «درج مستقیم JSON» را بزنید.'
                      : 'هیچ تیکتی با این شرایط فیلتر یافت نشد.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Dana Ticket Connection & Cookie Configuration */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 border border-[#DDDBCF] shadow-2xl max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#545D4B]" />
                <h3 className="text-sm font-black text-[#2D2C28]">
                  تنظیمات اتصال و کوکی سامانه تیکتینگ دانا
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfigModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#2D2C28] mb-1">
                  آدرس وب‌سرویس سامانه دانا (API URL):
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-xl px-3 py-2 font-mono text-[11px] dir-ltr text-left focus:outline-none focus:ring-1 focus:ring-[#545D4B]"
                  placeholder="http://it.novinchoob.local/api/Entity/GetEntityRemoteDataDynamic"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D2C28] mb-1">
                  کوکی احراز هویت (ASP.NET Cookie):
                </label>
                <textarea
                  rows={4}
                  value={cookie}
                  onChange={e => setCookie(e.target.value)}
                  className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-xl p-3 font-mono text-[10px] dir-ltr text-left focus:outline-none focus:ring-1 focus:ring-[#545D4B] resize-y"
                  placeholder="ASP.NET_SessionId=...; __AntiXsrfToken=...; .ASPXAUTH=..."
                  required
                />
                <p className="text-[10px] text-[#75746E] mt-1 leading-relaxed">
                  💡 راهنما: وارد سامانه تیکتینگ مرورگر خود شوید، کلید F12 (Inspect) را بزنید، تب Network را باز کرده و روی درخواست GetEntityRemoteDataDynamic کلیک‌راست کنید و Copy as fetch بزنید، سپس مقدار بخش cookie را اینجا قرار دهید.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8E6DF]">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#545D4B] text-white font-bold hover:bg-[#434B3C] transition cursor-pointer shadow-xs"
                >
                  ذخیره تنظیمات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Direct JSON Import */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 border border-[#DDDBCF] shadow-2xl max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-amber-700" />
                <h3 className="text-sm font-black text-[#2D2C28]">
                  درج مستقیم پاسخ JSON از سامانه تیکتینگ دانا
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2D2C28]">
                متن JSON پاسخ (Response JSON شامل آرایه Rows):
              </label>
              <textarea
                rows={10}
                value={rawJsonInput}
                onChange={e => setRawJsonInput(e.target.value)}
                placeholder={'{\n  "TotalRows": 4,\n  "Rows": [\n    { "TicketNumber": 3041, "Title": "...", "StatusName": "انجام شده" }\n  ]\n}'}
                className="w-full bg-[#FAFAF7] border border-[#DDDBCF] rounded-xl p-3 font-mono text-[11px] dir-ltr text-left focus:outline-none focus:ring-1 focus:ring-[#545D4B] resize-y"
              />
              <p className="text-[11px] text-[#75746E] leading-relaxed">
                می‌توانید پاسخ تب Response را مستقیماً کپی کرده و اینجا پیست نمایید تا تیکت‌ها بلافاصله استخراج و در سامانه ذخیره شوند.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8E6DF]">
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition cursor-pointer text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleJsonSubmit}
                disabled={!rawJsonInput.trim()}
                className="px-5 py-2 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition cursor-pointer shadow-xs text-xs disabled:opacity-50"
              >
                پردازش و ثبت در دیتابیس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
