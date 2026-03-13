import { useState } from "react";
import Markdown from "react-markdown";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { DivinationRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface HistoryViewProps {
  history: DivinationRecord[];
  onDelete: (id: string) => void;
}

export function HistoryView({ history, onDelete }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="font-serif text-lg tracking-widest">暂无解卦记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {history.map((record) => {
        const isExpanded = expandedId === record.id;
        const date = new Date(record.date).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        });

        return (
          <div key={record.id} className="glass-panel rounded-3xl overflow-hidden transition-all">
            <div 
              className="p-6 sm:p-8 cursor-pointer hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 text-sm text-zinc-500">
                  <span>{date}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                  <span className="text-amber-500/80">
                    {record.originalName} {record.movingLines.length > 0 ? `→ ${record.changedName}` : '(无变卦)'}
                  </span>
                </div>
                <h3 className="text-lg font-serif text-zinc-200">
                  {record.question}
                </h3>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(record.id);
                  }}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                  title="删除记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="p-2 text-zinc-400">
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
                  className="border-t border-white/5"
                >
                  <div className="p-6 sm:p-8 bg-black/20">
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {record.lines.map((line, i) => (
                        <div key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-400">
                          第{i+1}爻: {line}
                        </div>
                      ))}
                    </div>
                    <div className="markdown-body font-serif leading-relaxed text-zinc-300 prose prose-invert prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-amber-500 prose-strong:text-amber-400 prose-strong:font-normal">
                      <Markdown>{record.interpretation}</Markdown>
                    </div>
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
