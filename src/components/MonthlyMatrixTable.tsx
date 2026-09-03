import React, { useState, useMemo, useEffect } from 'react';
import { UnitMonthlyStat } from '../types';
import { PERSIAN_MONTH_NAMES, formatNumber } from '../utils/parser';
import {
  Search,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Building2,
  Trash2,
  Edit3
} from 'lucide-react';

interface MonthlyMatrixTableProps {
  unitStats: UnitMonthlyStat[];
  allMonths: string[];
  grandTotalDeletes: number;
  grandTotalEdits: number;
  grandTotalLetters: number;
  selectedMonth?: string;
  onSelectUnit?: (unitName: string) => void;
}

type SortField = 'unit' | 'month' | 'deletes' | 'edits' | 'total';
type SortOrder = 'asc' | 'desc';

interface TableRowItem {
  id: string;
  unit: string;
  month: string;
  monthLabel: string;
  deletes: number;
  edits: number;
  total: number;
}

export const MonthlyMatrixTable: React.FC<MonthlyMatrixTableProps> = ({
  unitStats,
  allMonths,
  grandTotalDeletes,
  grandTotalEdits,
  grandTotalLetters,
  selectedMonth,
  onSelectUnit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(selectedMonth || 'all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [hideZeroRows, setHideZeroRows] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Sync external selectedMonth if changed
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      setSelectedPeriod(selectedMonth);
      setCurrentPage(1);
    }
  }, [selectedMonth]);

  // Extract all distinct units
  const allUnitsList = useMemo(() => {
    return unitStats.map(s => s.unit).sort((a, b) => a.localeCompare(b));
  }, [unitStats]);

  // Build the flattened row list with "دوره زمانی" as a dedicated column
  const allRows = useMemo(() => {
    const rows: TableRowItem[] = [];

    unitStats.forEach(stat => {
      allMonths.forEach(m => {
        const [y, mm] = m.split('/');
        const monthLabel = `${PERSIAN_MONTH_NAMES[mm] || mm} ${y}`;
        const d = stat.months[m];

        const deletes = d?.uniqueDeleteCount || 0;
        const edits = d?.uniqueEditCount || 0;
        const total = d?.uniqueTotal || 0;

        rows.push({
          id: `${stat.unit}-${m}`,
          unit: stat.unit,
          month: m,
          monthLabel,
          deletes,
          edits,
          total
        });
      });
    });

    return rows;
  }, [unitStats, allMonths]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      // Period filter
      if (selectedPeriod !== 'all' && row.month !== selectedPeriod) {
        return false;
      }
      // Unit filter
      if (selectedUnit !== 'all' && row.unit !== selectedUnit) {
        return false;
      }
      // Zero rows filter
      if (hideZeroRows && row.total === 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchUnit = row.unit.toLowerCase().includes(q);
        const matchMonth = row.monthLabel.toLowerCase().includes(q) || row.month.includes(q);
        if (!matchUnit && !matchMonth) return false;
      }
      return true;
    });
  }, [allRows, selectedPeriod, selectedUnit, hideZeroRows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'unit') {
        cmp = a.unit.localeCompare(b.unit);
      } else if (sortField === 'month') {
        cmp = a.month.localeCompare(b.month);
      } else if (sortField === 'deletes') {
        cmp = a.deletes - b.deletes;
      } else if (sortField === 'edits') {
        cmp = a.edits - b.edits;
      } else if (sortField === 'total') {
        cmp = a.total - b.total;
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortField, sortOrder]);

  // Summary of filtered dataset
  const filteredSummary = useMemo(() => {
    let totDeletes = 0;
    let totEdits = 0;
    let totLetters = 0;
    const unitsSet = new Set<string>();
    const periodsSet = new Set<string>();

    filteredRows.forEach(r => {
      if (r.total > 0) {
        unitsSet.add(r.unit);
        periodsSet.add(r.month);
      }
      totDeletes += r.deletes;
      totEdits += r.edits;
      totLetters += r.total;
    });

    return {
      totDeletes,
      totEdits,
      totLetters,
      activeUnitsCount: unitsSet.size,
      activePeriodsCount: periodsSet.size
    };
  }, [filteredRows]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedPeriod('all');
    setSelectedUnit('all');
    setSearchQuery('');
    setHideZeroRows(true);
    setSortField('total');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return (
    <div className="bg-[#FAFAF7] rounded-3xl p-6 border border-[#E2E0D8] shadow-xs space-y-5">
      {/* Header with Title and Global View Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EFEFEA] text-[#545D4B] border border-[#DDDBCF]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D2C28]">
                جدول تفکیک نامه‌ها بر اساس واحد سازمانی و دوره زمانی
              </h3>
              <p className="text-xs text-[#75746E]">
                تفکیک ستونی دوره‌های زمانی (ماه) به همراه تعداد دقیق حذف، ویرایش و مجموع نامه‌های یکتای هر واحد
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF] text-xs font-bold shadow-2xs">
            <Layers className="h-3.5 w-3.5 text-[#545D4B]" />
            نامه‌های یکتا
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#DDDBCF]">
        {/* Time Period Filter (دوره زمانی) */}
        <div>
          <label className="block text-[11px] font-bold text-[#5A5852] mb-1">
            دوره زمانی (ماه):
          </label>
          <select
            value={selectedPeriod}
            onChange={e => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white border border-[#DDDBCF] rounded-xl px-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] font-bold transition"
          >
            <option value="all">همه دوره‌های زمانی ({allMonths.length} ماه)</option>
            {allMonths.map(m => {
              const [y, mm] = m.split('/');
              const mLabel = `${PERSIAN_MONTH_NAMES[mm] || mm} ${y}`;
              return (
                <option key={m} value={m}>
                  {mLabel} ({m})
                </option>
              );
            })}
          </select>
        </div>

        {/* Organizational Unit Filter */}
        <div>
          <label className="block text-[11px] font-bold text-[#5A5852] mb-1">
            واحد سازمانی:
          </label>
          <select
            value={selectedUnit}
            onChange={e => {
              setSelectedUnit(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white border border-[#DDDBCF] rounded-xl px-3 py-2 text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] font-medium transition"
          >
            <option value="all">همه واحدها ({allUnitsList.length} واحد)</option>
            {allUnitsList.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold text-[#5A5852] mb-1">
            جستجو در واحد یا دوره:
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#8A8880] pointer-events-none" />
            <input
              type="text"
              placeholder="نام واحد یا ماه..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-[#DDDBCF] rounded-xl text-[#2D2C28] focus:outline-none focus:ring-2 focus:ring-[#545D4B] transition font-medium"
            />
          </div>
        </div>

        {/* Toggle Zero Rows & Reset */}
        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#5A5852] bg-white px-3 py-2 rounded-xl border border-[#DDDBCF] cursor-pointer hover:bg-[#FAF9F5] transition flex-1">
            <input
              type="checkbox"
              checked={hideZeroRows}
              onChange={e => {
                setHideZeroRows(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded accent-[#545D4B] cursor-pointer"
            />
            <span className="text-[11px] truncate">فقط دوره‌های دارای نامه</span>
          </label>

          {(selectedPeriod !== 'all' || selectedUnit !== 'all' || searchQuery || !hideZeroRows) && (
            <button
              onClick={handleResetFilters}
              title="بازنشانی فیلترها"
              className="p-2 bg-white text-[#9C3A27] hover:bg-[#FAECE8] rounded-xl border border-[#DDDBCF] transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#EBEBE6]/60 px-4 py-2.5 rounded-xl border border-[#DDDBCF]">
        <div className="flex items-center gap-3 flex-wrap font-medium text-[#5A5852]">
          <span>تعداد رکوردهای نمایش: <strong className="text-[#2D2C28]">{formatNumber(sortedRows.length)}</strong> سطر</span>
          <span className="text-[#DDDBCF]">|</span>
          <span>مجموع حذف: <strong className="text-[#9C3A27]">{formatNumber(filteredSummary.totDeletes)}</strong></span>
          <span className="text-[#DDDBCF]">|</span>
          <span>مجموع ویرایش: <strong className="text-[#446347]">{formatNumber(filteredSummary.totEdits)}</strong></span>
          <span className="text-[#DDDBCF]">|</span>
          <span>مجموع کل: <strong className="text-[#2D2C28]">{formatNumber(filteredSummary.totLetters)}</strong></span>
        </div>
        <div className="text-[11px] text-[#75746E]">
          صفحه {formatNumber(currentPage)} از {formatNumber(totalPages)}
        </div>
      </div>

      {/* Main Table with "دوره زمانی" Column */}
      <div className="overflow-x-auto rounded-2xl border border-[#DDDBCF] bg-white shadow-2xs">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="bg-[#EBEBE6] text-[#2D2C28] font-bold border-b border-[#DDDBCF]">
              <th className="py-3 px-3 text-center w-14">ردیف</th>

              {/* Organizational Unit Column */}
              <th
                onClick={() => handleSort('unit')}
                className="py-3 px-4 min-w-[200px] cursor-pointer hover:bg-[#E2E0D8] transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#545D4B]" />
                  <span>واحد سازمانی</span>
                  <ArrowUpDown className="h-3 w-3 text-[#75746E]" />
                </div>
              </th>

              {/* Time Period Column (دوره زمانی) */}
              <th
                onClick={() => handleSort('month')}
                className="py-3 px-4 min-w-[170px] cursor-pointer hover:bg-[#E2E0D8] transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#545D4B]" />
                  <span>دوره زمانی</span>
                  <ArrowUpDown className="h-3 w-3 text-[#75746E]" />
                </div>
              </th>

              {/* Deletion Count Column */}
              <th
                onClick={() => handleSort('deletes')}
                className="py-3 px-3 text-center w-32 cursor-pointer hover:bg-[#E2E0D8] transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <Trash2 className="h-3.5 w-3.5 text-[#9C3A27]" />
                  <span>تعداد حذف</span>
                  <ArrowUpDown className="h-3 w-3 text-[#75746E]" />
                </div>
              </th>

              {/* Edit Count Column */}
              <th
                onClick={() => handleSort('edits')}
                className="py-3 px-3 text-center w-32 cursor-pointer hover:bg-[#E2E0D8] transition select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <Edit3 className="h-3.5 w-3.5 text-[#446347]" />
                  <span>تعداد ویرایش</span>
                  <ArrowUpDown className="h-3 w-3 text-[#75746E]" />
                </div>
              </th>

              {/* Total Letters Column */}
              <th
                onClick={() => handleSort('total')}
                className="py-3 px-4 text-center w-36 cursor-pointer hover:bg-[#E2E0D8] transition select-none bg-[#E5E5DE]"
              >
                <div className="flex items-center justify-center gap-1 font-black">
                  <span>مجموع کل</span>
                  <ArrowUpDown className="h-3 w-3 text-[#75746E]" />
                </div>
              </th>

              {/* Ratio / Visual Indicator */}
              <th className="py-3 px-4 text-center min-w-[130px]">
                نسبت و وضعیت
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E8E6DF]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#8A8880] font-medium">
                  هیچ موردی با فیلترهای انتخابی یافت نشد.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                const isZero = row.total === 0;
                const delPct = row.total > 0 ? Math.round((row.deletes / row.total) * 100) : 0;
                const editPct = row.total > 0 ? Math.round((row.edits / row.total) * 100) : 0;

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-[#F5F5F0] transition-colors group ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F5]'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="py-3 px-3 text-center font-mono text-[#75746E] text-[11px]">
                      {formatNumber(rowIndex)}
                    </td>

                    {/* Organizational Unit */}
                    <td className="py-3 px-4 font-bold text-[#2D2C28]">
                      <button
                        onClick={() => onSelectUnit && onSelectUnit(row.unit)}
                        className="text-right hover:text-[#545D4B] hover:underline transition cursor-pointer flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#545D4B] shrink-0" />
                        <span>{row.unit}</span>
                      </button>
                    </td>

                    {/* Time Period Column (دوره زمانی) */}
                    <td className="py-3 px-4 font-medium">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFEFEA] text-[#2D2C28] border border-[#DDDBCF]">
                        <span className="font-bold">{row.monthLabel}</span>
                        <span className="text-[10px] text-[#75746E] font-mono">({row.month})</span>
                      </div>
                    </td>

                    {/* Deletion Count */}
                    <td className="py-3 px-3 text-center">
                      {row.deletes > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAECE8] text-[#8A2E1D] font-bold border border-[#F2D1CA]">
                          <Trash2 className="h-3 w-3" />
                          <span>{formatNumber(row.deletes)}</span>
                        </span>
                      ) : (
                        <span className="text-[#C4C2B8] font-light">-</span>
                      )}
                    </td>

                    {/* Edit Count */}
                    <td className="py-3 px-3 text-center">
                      {row.edits > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EDF2EB] text-[#2E462C] font-bold border border-[#D4DFD1]">
                          <Edit3 className="h-3 w-3" />
                          <span>{formatNumber(row.edits)}</span>
                        </span>
                      ) : (
                        <span className="text-[#C4C2B8] font-light">-</span>
                      )}
                    </td>

                    {/* Total Count */}
                    <td className="py-3 px-4 text-center font-bold bg-[#FAF9F5] group-hover:bg-[#EFEFEA] transition-colors">
                      {isZero ? (
                        <span className="text-[#C4C2B8] font-light">-</span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-[#2D2C28] text-white rounded-lg text-xs font-black shadow-2xs">
                          {formatNumber(row.total)}
                        </span>
                      )}
                    </td>

                    {/* Progress / Ratio Bar */}
                    <td className="py-3 px-4 text-center">
                      {!isZero && (
                        <div className="flex flex-col gap-1 items-center">
                          <div className="w-24 h-2 bg-[#E5E5DE] rounded-full overflow-hidden flex">
                            <div
                              className="bg-[#9C3A27] h-full"
                              style={{ width: `${delPct}%` }}
                              title={`${delPct}% حذف`}
                            />
                            <div
                              className="bg-[#446347] h-full"
                              style={{ width: `${editPct}%` }}
                              title={`${editPct}% ویرایش`}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#75746E]">
                            <span>{delPct}% ح</span>
                            <span>•</span>
                            <span>{editPct}% و</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Summary Footer */}
          <tfoot>
            <tr className="bg-[#EBEBE6] font-extrabold text-[#2D2C28] border-t-2 border-[#DDDBCF]">
              <td colSpan={3} className="py-3 px-4 text-right">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#545D4B]" />
                  <span>مجموع کل سطرهای فیلتر شده ({formatNumber(sortedRows.length)} سطر)</span>
                </div>
              </td>
              <td className="py-3 px-3 text-center text-[#9C3A27]">
                <span className="inline-block px-2.5 py-1 bg-[#FAECE8] border border-[#F2D1CA] rounded-lg">
                  {formatNumber(filteredSummary.totDeletes)} حذف
                </span>
              </td>
              <td className="py-3 px-3 text-center text-[#446347]">
                <span className="inline-block px-2.5 py-1 bg-[#EDF2EB] border border-[#D4DFD1] rounded-lg">
                  {formatNumber(filteredSummary.totEdits)} ویرایش
                </span>
              </td>
              <td className="py-3 px-4 text-center bg-[#E5E5DE]">
                <span className="inline-block px-3 py-1 bg-[#2D2C28] text-white rounded-lg text-xs font-black shadow-xs">
                  {formatNumber(filteredSummary.totLetters)} کل
                </span>
              </td>
              <td className="py-3 px-4 text-center text-xs text-[#75746E] font-normal">
                {filteredSummary.activeUnitsCount} واحد در {filteredSummary.activePeriodsCount} دوره
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[#75746E]">
            نمایش {formatNumber((currentPage - 1) * pageSize + 1)} تا {formatNumber(Math.min(currentPage * pageSize, sortedRows.length))} از {formatNumber(sortedRows.length)} مورد
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-[#DDDBCF] text-[#5A5852] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 text-xs font-semibold">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#545D4B] text-white font-bold shadow-xs'
                        : 'text-[#5A5852] hover:bg-[#EFEFEA]'
                    }`}
                  >
                    {formatNumber(pageNum)}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-[#DDDBCF] text-[#5A5852] hover:bg-[#EFEFEA] disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
