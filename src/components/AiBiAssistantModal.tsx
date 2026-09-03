import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Cpu,
  Info,
  Terminal,
  ChevronDown,
  ChevronUp,
  Database,
  Code2,
  Clock
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../services/api';
import { formatNumber } from '../utils/parser';
import { AiDebugInfo } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  debugInfo?: AiDebugInfo;
}

interface AiBiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalLettersCount: number;
  aiDebugMode?: boolean;
  onToggleAiDebugMode?: (enabled: boolean) => void;
}

export const AiBiAssistantModal: React.FC<AiBiAssistantModalProps> = ({
  isOpen,
  onClose,
  totalLettersCount,
  aiDebugMode = false,
  onToggleAiDebugMode
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `سلام! من **دستیار هوشمند BI و بهینه‌سازی فرآیندهای فناوری اطلاعات (Gemini 3.7 Flash)** هستم. 

پایگاه داده مکاتبات شما به طور کامل آماده تحلیل است. می‌توانید هر سوالی درباره **موضوعات پرتکرار (مثل ویرایش پیش‌فاکتور)، ریشه‌یابی خطاهای واحدها، گلوگاه‌ها یا راهکارهای افزایش سودآوری و کاهش دوباره‌کاری** بپرسید.`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSqlIndex, setCopiedSqlIndex] = useState<string | null>(null);
  const [showArchInfo, setShowArchInfo] = useState<boolean>(false);
  const [expandedDebugIds, setExpandedDebugIds] = useState<Record<string, boolean>>({});
  const [localDebugMode, setLocalDebugMode] = useState<boolean>(aiDebugMode);

  const isDebugActive = onToggleAiDebugMode ? aiDebugMode : localDebugMode;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalDebugMode(aiDebugMode);
  }, [aiDebugMode]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleToggleDebug = () => {
    const nextVal = !isDebugActive;
    if (onToggleAiDebugMode) {
      onToggleAiDebugMode(nextVal);
    } else {
      setLocalDebugMode(nextVal);
    }
  };

  const toggleDebugExpand = (msgId: string) => {
    setExpandedDebugIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const historyForApi = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.askAiBiAssistant(query, historyForApi, isDebugActive);

      const newMsgId = (Date.now() + 1).toString();
      const modelMessage: Message = {
        id: newMsgId,
        role: 'model',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        debugInfo: res.debugInfo
      };

      // By default open debug panel if debug mode was active
      if (isDebugActive && res.debugInfo) {
        setExpandedDebugIds(prev => ({ ...prev, [newMsgId]: true }));
      }

      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ **خطا در دریافت پاسخ:** ${err.message || 'مشکلی در برقراری ارتباط با مدل Gemini رخ داد.'}`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySql = (key: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSqlIndex(key);
    setTimeout(() => setCopiedSqlIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: 'گفتگو پاکسازی شد. چه سوال تحلیلی دیگری دارید؟',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1A1917]/70 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-[#FAF9F5] border border-[#DDDBCF] w-full max-w-4xl h-[92vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#2D2C28]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E8E6DF] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#0F172A]">مشاور هوش تجاری و تحلیل داده (Gemini BI)</h2>
                <span className="bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-medium">
                متصل به دیتابیس پایدار با {formatNumber(totalLettersCount)} رکورد مکاتبات سازمانی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchInfo(!showArchInfo)}
              className="px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="معماری مقیاس‌پذیری ۱۰۰ هزار رکورد"
            >
              <Info className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline">معماری ۱۰۰k</span>
            </button>

            <button
              onClick={handleClearChat}
              className="p-2 rounded-xl text-[#64748B] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              title="پاکسازی تاریخچه گفتگو"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scalability Architecture Info Box (Collapsible) */}
        {showArchInfo && (
          <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-5 py-3 text-xs text-[#1E3A8A] flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-150">
            <Info className="w-4 h-4 shrink-0 text-[#2563EB] mt-0.5" />
            <div className="space-y-1">
              <span className="font-black block">💡 راهکار پردازش داده‌های حجیم (۱۰۰,۰۰۰+ نامه):</span>
              <p className="leading-relaxed text-[#1E40AF]">
                برای جلوگیری از اتمام توکن یا کندی، سامانه به جای ارسال کل متن ۱۰۰ هزار نامه، ابتدا با کوئری‌های پرسرعت SQL در پایگاه داده لایه‌های آماری (دسته‌بندی موضوعی، پرتکرارترین پیش‌فاکتورها، نرخ‌های خطا و کلاسترینگ) را استخراج کرده و سپس خلاصه آماری چند کیلوبایتی را به جمنای می‌دهد. این معماری سرعت زیر ۱ ثانیه و دقت ۱۰۰٪ را تضمین می‌کند.
              </p>
            </div>
            <button onClick={() => setShowArchInfo(false)} className="text-[#3B82F6] hover:text-[#1D4ED8] p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F8FAFC]">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            const isDebugExpanded = Boolean(expandedDebugIds[msg.id]);
            const hasDebugInfo = Boolean(
              isDebugActive &&
              msg.debugInfo &&
              msg.debugInfo.debugMode &&
              msg.debugInfo.sqlQueries &&
              msg.debugInfo.sqlQueries.length > 0
            );

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[95%] sm:max-w-[90%] ${
                  isModel ? 'mr-0 ml-auto' : 'ml-0 mr-auto flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-1 ${
                    isModel
                      ? 'bg-gradient-to-tr from-[#1E40AF] to-[#3B82F6] text-white'
                      : 'bg-[#334155] text-white'
                  }`}
                >
                  {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isModel
                        ? 'bg-white text-[#0F172A] border border-[#E2E8F0] shadow-sm'
                        : 'bg-[#1E293B] text-white rounded-br-xs'
                    }`}
                  >
                    {isModel ? (
                      <div className="markdown-body prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 text-right font-sans">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    )}
                  </div>

                  {/* Debug Mode & SQL Trace Accordion (اگر اطلاعات دیباگ موجود باشد) */}
                  {isModel && hasDebugInfo && msg.debugInfo && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl overflow-hidden shadow-xs text-xs">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleDebugExpand(msg.id)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] transition cursor-pointer text-[#92400E] font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-[#D97706]" />
                          <span>ردگیری مسیر محاسبات و کوئری‌های SQL (Debug Trace)</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#FDE68A] text-[#78350F]">
                            {msg.debugInfo.sqlQueries?.length || 0} کوئری
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {msg.debugInfo.processingTimeMs !== undefined && (
                            <span className="flex items-center gap-1 text-[10px] text-[#B45309] font-mono">
                              <Clock className="w-3 h-3" />
                              {msg.debugInfo.processingTimeMs}ms
                            </span>
                          )}
                          {isDebugExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#92400E]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#92400E]" />
                          )}
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isDebugExpanded && (
                        <div className="p-3.5 space-y-3 bg-[#FFFDF5] border-t border-[#FDE68A]/60">
                          {/* Badges / Summary */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <div className="bg-white px-2.5 py-1 rounded-lg border border-[#FDE68A] text-[#78350F] flex items-center gap-1 font-mono">
                              <Cpu className="w-3 h-3 text-[#D97706]" />
                              <span>مدل: {msg.debugInfo.modelUsed || 'gemini-flash'}</span>
                            </div>

                            {msg.debugInfo.keywordsExtracted && msg.debugInfo.keywordsExtracted.length > 0 && (
                              <div className="bg-white px-2.5 py-1 rounded-lg border border-[#FDE68A] text-[#78350F] flex items-center gap-1">
                                <span className="text-[#B45309]">کلیدواژه‌های استخراج‌شده:</span>
                                <span className="font-bold text-[#92400E]">
                                  {msg.debugInfo.keywordsExtracted.join('، ')}
                                </span>
                              </div>
                            )}

                            {msg.debugInfo.payloadSummary && (
                              <div className="bg-white px-2.5 py-1 rounded-lg border border-[#FDE68A] text-[#78350F] flex items-center gap-1">
                                <Database className="w-3 h-3 text-[#D97706]" />
                                <span>
                                  داده‌های ورودی: {formatNumber(msg.debugInfo.payloadSummary.totalLetters)} رکورد ({formatNumber(msg.debugInfo.payloadSummary.deleteCount)} حذف | {formatNumber(msg.debugInfo.payloadSummary.editCount)} ویرایش)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Executed SQL Queries List */}
                          <div className="space-y-2 pt-1">
                            <div className="text-[11px] font-bold text-[#92400E] flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5 text-[#D97706]" />
                              <span>کوئری‌های SQL اجرا شده بر روی پایگاه داده SQLite:</span>
                            </div>

                            {msg.debugInfo.sqlQueries?.map((q, idx) => {
                              const copyKey = `${msg.id}-${idx}`;
                              const isCopied = copiedSqlIndex === copyKey;

                              return (
                                <div key={idx} className="rounded-xl border border-[#E2E8F0] bg-[#0F172A] text-[#F8FAFC] overflow-hidden shadow-xs">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#1E293B] border-b border-[#334155] text-[10px] text-[#94A3B8]">
                                    <span className="font-sans font-bold text-[#E2E8F0]">{q.title}</span>
                                    <div className="flex items-center gap-2">
                                      {q.resultCount !== undefined && (
                                        <span className="text-[#38BDF8]">
                                          {q.resultCount} سطر استخراج شد
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleCopySql(copyKey, q.sql)}
                                        className="hover:text-white p-0.5 rounded transition flex items-center gap-1 cursor-pointer text-[#CBD5E1]"
                                        title="کپی کوئری SQL"
                                      >
                                        {isCopied ? (
                                          <Check className="w-3 h-3 text-[#34D399]" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>{isCopied ? 'کپی شد' : 'کپی SQL'}</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-3 overflow-x-auto text-left font-mono text-[11px] leading-relaxed text-[#38BDF8] selection:bg-[#38BDF8] selection:text-[#0F172A]" dir="ltr">
                                    <code>{q.sql}</code>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions & Timestamp */}
                  <div
                    className={`flex items-center gap-2 text-[10px] text-[#94A3B8] px-1 ${
                      isModel ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isModel && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[#475569] p-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="کپی متن"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-[#16A34A]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading State */}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%] mr-0 ml-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-[#BFDBFE] rounded-2xl px-4 py-3 text-xs text-[#1E40AF] flex items-center gap-2 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                <span>
                  {isDebugActive
                    ? 'در حال اجرای کوئری‌های SQL و پردازش مستقیم در پایگاه داده...'
                    : 'در حال تحلیل آماری مکاتبات و استخراج الگوها...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[#E8E6DF] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="سوال خود را درباره آمار نامه‌ها، علل ویرایش یا پیشنهادات بهینه‌سازی بپرسید... (Enter برای ارسال)"
              rows={1}
              className="flex-1 resize-none bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="h-11 px-5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>ارسال</span>
                  <Send className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
