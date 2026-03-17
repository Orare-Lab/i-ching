import { useState } from "react";
import Markdown from "react-markdown";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { DivinationOutcomeTag, DivinationSummary, DivinationTopic } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { parseInterpretation } from "../lib/interpretation";
import { OUTCOME_OPTIONS, TOPIC_OPTIONS } from "../lib/personalArchive";

interface HistoryViewProps {
  history: DivinationSummary[];
  onDelete: (id: string) => void;
  loadDetail: (id: string) => string | null;
  onUpdateRecord: (id: string, patch: { topic?: DivinationTopic; outcomeTag?: DivinationOutcomeTag; outcomeNote?: string }) => void;
}

export function HistoryView({ history, onDelete, loadDetail, onUpdateRecord }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <p className="font-serif text-lg tracking-widest">暂无解卦记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {history.map((record) => {
        const isExpanded = expandedId === record.id;
        const detail = isExpanded ? loadDetail(record.id) : null;
        const parsedDetail = parseInterpretation(detail || "");
        const date = new Date(record.date).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        });

        return (
          <div key={record.id} className="glass-panel rounded-3xl overflow-hidden transition-all">
            <div 
              className="p-6 sm:p-8 cursor-pointer hover:bg-stone-200/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 text-sm text-stone-500">
                  <span>{date}</span>
                  <span className="w-1 h-1 rounded-full bg-stone-400"></span>
                  <span className="text-[#8b2b22]/80">
                    {record.originalName} {record.movingLines.length > 0 ? `→ ${record.changedName}` : '(无变卦)'}
                  </span>
                </div>
                <h3 className="text-lg font-serif text-stone-900">
                  {record.question}
                </h3>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(record.id);
                  }}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-600/10 rounded-full transition-colors"
                  title="删除记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="p-2 text-stone-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-stone-200"
                >
                  <div className="p-6 sm:p-8 bg-white/60">
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {record.lines.map((line, i) => (
                        <div key={i} className="px-3 py-1 rounded-full bg-stone-100/50 border border-stone-200 text-xs font-mono text-stone-500">
                          第{i+1}爻: {line}
                        </div>
                      ))}
                    </div>
                    <div className="mb-6 grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <div className="text-xs tracking-[0.2em] text-stone-500">问题主题</div>
                        <select
                          value={record.topic}
                          onChange={(event) => onUpdateRecord(record.id, { topic: event.target.value as DivinationTopic })}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none"
                        >
                          {TOPIC_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <div className="text-xs tracking-[0.2em] text-stone-500">后续结果</div>
                        <select
                          value={record.outcomeTag}
                          onChange={(event) => onUpdateRecord(record.id, { outcomeTag: event.target.value as DivinationOutcomeTag })}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none"
                        >
                          {OUTCOME_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 sm:col-span-2">
                        <div className="text-xs tracking-[0.2em] text-stone-500">后续备注</div>
                        <textarea
                          value={record.outcomeNote}
                          onChange={(event) => onUpdateRecord(record.id, { outcomeNote: event.target.value })}
                          rows={3}
                          placeholder="例如：两周后拿到 offer，过程比预期更慢。"
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-700 outline-none"
                        />
                      </label>
                    </div>
                    <p className="mb-4 text-sm text-stone-500">{record.excerpt}</p>
                    <div className="markdown-body font-serif leading-relaxed text-stone-800 prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                      <Markdown>{parsedDetail.answer || detail || "未找到完整解卦内容。"}</Markdown>
                    </div>
                    {parsedDetail.reasoning && (
                      <details className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        <summary className="cursor-pointer text-sm text-stone-600 select-none">查看解卦依据</summary>
                        <div className="mt-4 markdown-body font-serif leading-relaxed text-stone-700 prose prose-stone prose-base max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                          <Markdown>{parsedDetail.reasoning}</Markdown>
                        </div>
                      </details>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
