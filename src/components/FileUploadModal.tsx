import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Table,
  Layers,
  Sparkles
} from 'lucide-react';
import { RawLetterItem, RawEraItem } from '../types';
import { parseImportFile, ParsedFileInfo } from '../utils/fileImporter';
import { formatNumber } from '../utils/parser';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLetters: (letters: RawLetterItem[], append: boolean) => void;
  onImportEra: (eraItems: RawEraItem[], append: boolean) => void;
  activeTab: 'removeEdit' | 'era' | 'slideshow' | string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onImportLetters,
  onImportEra,
  activeTab
}) => {
  const [importMode, setImportMode] = useState<'letters' | 'era'>(activeTab === 'era' ? 'era' : 'letters');
  const [appendData, setAppendData] = useState<boolean>(true);
  const [filesList, setFilesList] = useState<ParsedFileInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewFileIndex, setPreviewFileIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    const newFiles: ParsedFileInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsedInfo = await parseImportFile(file);
        newFiles.push(parsedInfo);
      } catch (err: any) {
        setErrorMessage(err.message || `خطا در پردازش فایل ${file.name}`);
        setIsProcessing(false);
        return;
      }
    }

    setFilesList(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleApplyImport = () => {
    if (filesList.length === 0) {
      setErrorMessage('لطفاً حداقل یک فایل اکسل (.xlsx / .xls) یا JSON انتخاب کنید.');
      return;
    }

    const aggregated: any[] = [];
    filesList.forEach(f => aggregated.push(...f.data));

    if (importMode === 'letters') {
      onImportLetters(aggregated, appendData);
      setSuccessMessage(`${formatNumber(aggregated.length)} نامه با موفقیت ${appendData ? 'اضافه شد' : 'جایگزین شد'}.`);
    } else {
      onImportEra(aggregated, appendData);
      setSuccessMessage(`${formatNumber(aggregated.length)} رکورد فرآیندی با موفقیت ${appendData ? 'اضافه شد' : 'جایگزین شد'}.`);
    }

    setTimeout(() => {
      onClose();
      setFilesList([]);
      setSuccessMessage(null);
      setPreviewFileIndex(null);
    }, 1200);
  };

  const removeFileFromList = (index: number) => {
    setFilesList(prev => prev.filter((_, i) => i !== index));
    if (previewFileIndex === index) {
      setPreviewFileIndex(null);
    }
  };

  const totalRecords = filesList.reduce((acc, f) => acc + f.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2C28]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#FAFAF7] p-6 shadow-2xl border border-[#DDDBCF] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D2C28]">ورود داده‌ها (Excel / JSON)</h3>
              <p className="text-xs text-[#75746E]">
                پشتیبانی از فایل‌های اکسل <code className="bg-[#EFEFEA] px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800">.xlsx</code>، <code className="bg-[#EFEFEA] px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800">.xls</code> و <code className="bg-[#EFEFEA] px-1 py-0.5 rounded text-[11px] font-mono text-[#545D4B]">.json</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#8A8880] hover:bg-[#EFEFEA] hover:text-[#2D2C28] transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Target Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#75746E] mb-2">
              مقصد ورود داده‌ها:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('letters')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
                  importMode === 'letters'
                    ? 'bg-[#EFEFEA] border-[#DDDBCF] text-[#2D2C28] font-bold shadow-xs'
                    : 'bg-[#F5F5F0] border-[#E8E6DF] text-[#75746E] hover:bg-[#EFEFEA]'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>تب حذف و ویرایش نامه‌ها</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('era')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
                  importMode === 'era'
                    ? 'bg-[#EDF2EB] border-[#D4DFD1] text-[#2E462C] font-bold shadow-xs'
                    : 'bg-[#F5F5F0] border-[#E8E6DF] text-[#75746E] hover:bg-[#EFEFEA]'
                }`}
              >
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>تب فرآیندهای ERA</span>
              </button>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50 scale-[0.99] shadow-inner'
                : 'border-[#DDDBCF] hover:border-emerald-600 bg-[#F5F5F0] hover:bg-[#EFEFEA]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".xlsx,.xls,.json,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/csv"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs border border-emerald-200">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="p-3 rounded-2xl bg-[#FAFAF7] text-[#545D4B] shadow-xs border border-[#DDDBCF]">
                  <FileText className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-[#2D2C28]">
                  برای انتخاب فایل‌ها کلیک کنید یا فایل‌ها را به اینجا بکشید (Drag & Drop)
                </div>
                <p className="text-xs text-[#75746E]">
                  در فایل‌های اکسل، <strong>ردیف اول سرستون‌ها (Keys)</strong> و ردیف‌های بعد مقادیر هر رکورد خواهند بود.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#8A8880] mt-1">
                <span className="bg-[#EFEFEA] px-2 py-0.5 rounded-md font-mono border border-[#DDDBCF]">.XLSX</span>
                <span className="bg-[#EFEFEA] px-2 py-0.5 rounded-md font-mono border border-[#DDDBCF]">.XLS</span>
                <span className="bg-[#EFEFEA] px-2 py-0.5 rounded-md font-mono border border-[#DDDBCF]">.JSON</span>
                <span className="bg-[#EFEFEA] px-2 py-0.5 rounded-md font-mono border border-[#DDDBCF]">.CSV</span>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {filesList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#75746E]">
                <span>فایل‌های انتخاب شده ({formatNumber(filesList.length)} فایل):</span>
                <button
                  onClick={() => {
                    setFilesList([]);
                    setPreviewFileIndex(null);
                  }}
                  className="text-[#9C3A27] hover:underline cursor-pointer"
                >
                  پاک کردن همه
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {filesList.map((file, idx) => {
                  const isExcel = file.format === 'xlsx' || file.format === 'xls' || file.format === 'csv';
                  const sampleKeys = file.data.length > 0 ? Object.keys(file.data[0]).slice(0, 4) : [];

                  return (
                    <div
                      key={idx}
                      className="bg-[#EFEFEA] border border-[#DDDBCF] rounded-2xl p-3 text-xs text-[#2D2C28] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          {isExcel ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200">
                              EXCEL {file.format.toUpperCase()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200">
                              JSON
                            </span>
                          )}
                          <span className="font-bold truncate text-[#2D2C28]">{file.name}</span>
                          <span className="text-[#8A8880] text-[10px]">({file.size})</span>
                          {file.sheetName && (
                            <span className="text-emerald-700 text-[11px] font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              شیت: {file.sheetName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-[#FAFAF7] px-2.5 py-1 rounded-xl font-bold text-emerald-800 border border-[#DDDBCF]">
                            {formatNumber(file.count)} رکورد
                          </span>
                          <button
                            onClick={() => removeFileFromList(idx)}
                            className="p-1 text-[#8A8880] hover:text-[#9C3A27] rounded-lg hover:bg-[#FAECE8] transition cursor-pointer"
                            title="حذف این فایل"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Header Keys Preview Chip List */}
                      {sampleKeys.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#DDDBCF]/60 text-[11px] text-[#75746E]">
                          <span className="text-[#8A8880]">سرستون‌ها (Keys):</span>
                          {sampleKeys.map((keyName, kIdx) => (
                            <span
                              key={kIdx}
                              className="bg-white px-2 py-0.5 rounded-md border border-[#DDDBCF] font-mono text-[#2D2C28]"
                            >
                              {keyName}
                            </span>
                          ))}
                          {Object.keys(file.data[0]).length > 4 && (
                            <span className="text-[10px] text-[#8A8880]">
                              +{formatNumber(Object.keys(file.data[0]).length - 4)} ستون دیگر
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Merge Strategy Options */}
          <div className="bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#DDDBCF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[#2D2C28] font-bold">نحوه اعمال داده‌های جدید:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="appendMode"
                  checked={appendData}
                  onChange={() => setAppendData(true)}
                  className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-[#2D2C28] font-medium">افزودن به داده‌های فعلی (Append)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="appendMode"
                  checked={!appendData}
                  onChange={() => setAppendData(false)}
                  className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-[#2D2C28] font-medium">جایگزینی کل داده‌ها (Replace)</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-[#FAECE8] text-[#8A2E1D] rounded-2xl text-xs border border-[#F2D1CA]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-[#EDF2EB] text-[#2E462C] rounded-2xl text-xs border border-[#D4DFD1]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#E8E6DF] pt-4 shrink-0">
          <div className="text-xs text-[#75746E]">
            {totalRecords > 0 && (
              <span>مجموع: <strong className="text-[#2D2C28]">{formatNumber(totalRecords)} رکورد</strong> آماده ورود</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5A5852] hover:bg-[#EFEFEA] rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleApplyImport}
              disabled={filesList.length === 0 || isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition cursor-pointer"
            >
              تأیید و بارگذاری ({formatNumber(totalRecords)} رکورد)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
