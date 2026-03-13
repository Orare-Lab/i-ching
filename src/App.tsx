import { useState } from "react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles, History, ArrowLeft } from "lucide-react";
import { Coin } from "./components/Coin";
import { HexagramLine } from "./components/HexagramLine";
import { LineValue, parseHexagram } from "./data/hexagrams";
import { getGuaci, getYaoci } from "./data/ichingTexts";
import { interpretHexagram } from "./services/aiService";
import { cn } from "./lib/utils";
import { DivinationRecord } from "./types";
import { HistoryView } from "./components/HistoryView";

export default function App() {
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<LineValue[]>([]);
  const [isTossing, setIsTossing] = useState(false);
  const [coins, setCoins] = useState<[0 | 1, 0 | 1, 0 | 1]>([0, 0, 0]);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DivinationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('divination_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const tossCoins = () => {
    if (lines.length >= 6 || isTossing) return;

    setIsTossing(true);
    
    const newCoins: [0 | 1, 0 | 1, 0 | 1] = [
      Math.floor(Math.random() * 2) as 0 | 1,
      Math.floor(Math.random() * 2) as 0 | 1,
      Math.floor(Math.random() * 2) as 0 | 1,
    ];

    setCoins(newCoins);

    const score = newCoins.reduce((acc, curr) => acc + (curr === 1 ? 3 : 2), 0) as LineValue;

    setTimeout(() => {
      setLines((prev) => [...prev, score]);
      setIsTossing(false);
    }, 1500);
  };

  const autoToss = () => {
    if (isTossing) return;
    
    setLines([]);
    setInterpretation(null);
    
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 6) {
        clearInterval(interval);
        return;
      }
      
      const newCoins: [0 | 1, 0 | 1, 0 | 1] = [
        Math.floor(Math.random() * 2) as 0 | 1,
        Math.floor(Math.random() * 2) as 0 | 1,
        Math.floor(Math.random() * 2) as 0 | 1,
      ];
      const score = newCoins.reduce((acc, curr) => acc + (curr === 1 ? 3 : 2), 0) as LineValue;
      
      setLines((prev) => [...prev, score]);
      count++;
    }, 500);
  };

  const reset = () => {
    setLines([]);
    setCoins([0, 0, 0]);
    setInterpretation(null);
    setQuestion("");
  };

  const handleInterpret = async () => {
    if (lines.length < 6 || !hexData) return;
    
    setIsInterpreting(true);
    try {
      const result = await interpretHexagram(question, lines);
      setInterpretation(result);

      const newRecord: DivinationRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        question: question || "无特定问题，求测近期运势",
        lines: [...lines],
        originalName: hexData.originalName,
        changedName: hexData.changedName,
        movingLines: hexData.movingLines,
        interpretation: result,
      };

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('divination_history', JSON.stringify(updatedHistory));
    } catch (error: any) {
      alert(error.message || "解卦失败，请检查网络或API Key配置。");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    const updatedHistory = history.filter(r => r.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('divination_history', JSON.stringify(updatedHistory));
  };

  const hexData = lines.length === 6 ? parseHexagram(lines) : null;

  return (
    <div className="min-h-screen bg-[#f4f1ea] paper-texture text-stone-800 font-sans selection:bg-[#8b2b22]/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b2b22]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-stone-500/5 blur-[120px] pointer-events-none" />

      <header className="relative z-10 border-b border-[#e8e4d9] bg-[#fdfbf7]/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#8b2b22]/30 flex items-center justify-center bg-gradient-to-br from-[#8b2b22]/10 to-transparent">
              <span className="font-serif text-[#8b2b22] text-base sm:text-lg">爻</span>
            </div>
            <h1 className="text-lg sm:text-xl font-serif tracking-[0.2em] text-stone-900">六爻起卦</h1>
          </div>
          <div className="flex items-center gap-2">
            {showHistory ? (
              <button 
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500 hover:text-stone-900 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                返回起卦
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500 hover:text-stone-900 text-sm"
                >
                  <History className="w-4 h-4" />
                  历史记录
                </button>
                <button 
                  onClick={reset}
                  className="p-2.5 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500 hover:text-stone-900"
                  title="重新起卦"
                >
                  <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-16">
        
        {showHistory ? (
          <HistoryView history={history} onDelete={handleDeleteHistory} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Input Section */}
              <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col">
                <label htmlFor="question" className="block text-xs sm:text-sm font-medium text-stone-500 mb-2 uppercase tracking-widest">
                  所测何事
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="心诚则灵，如：近期事业发展如何？"
                  className="w-full flex-1 min-h-[100px] bg-white/60 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 placeholder:text-stone-400 focus:border-[#8b2b22]/40 focus:ring-1 focus:ring-[#8b2b22]/40 transition-all outline-none font-serif text-base sm:text-lg resize-none"
                  disabled={lines.length > 0}
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  {["事业发展", "财运走势", "感情姻缘", "身体健康", "学业考试", "出行平安"].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setQuestion(preset)}
                      disabled={lines.length > 0}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border",
                        question === preset 
                          ? "bg-[#8b2b22]/10 text-[#8b2b22] border-[#8b2b22]/30" 
                          : "bg-stone-100/50 text-stone-500 border-stone-200 hover:bg-stone-200/50 hover:text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </section>

              {/* Tossing Area */}
              <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center">
                <div className="flex gap-4 sm:gap-6 mb-6 h-24 items-center">
                  <Coin value={coins[0]} isTossing={isTossing} delay={0} />
                  <Coin value={coins[1]} isTossing={isTossing} delay={0.1} />
                  <Coin value={coins[2]} isTossing={isTossing} delay={0.2} />
                </div>

                <div className="flex gap-3 sm:gap-4 w-full max-w-sm">
                  <button
                    onClick={tossCoins}
                    disabled={lines.length >= 6 || isTossing}
                    className="flex-1 bg-gradient-to-r from-[#8b2b22] to-[#6b1e16] hover:from-[#9c3227] hover:to-[#8b2b22] disabled:from-stone-300 disabled:to-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-medium tracking-widest text-base sm:text-lg transition-all shadow-[0_0_20px_rgba(139,43,34,0.2)] hover:shadow-[0_0_25px_rgba(139,43,34,0.4)] disabled:shadow-none active:scale-[0.98]"
                  >
                    {lines.length >= 6 ? "起卦完成" : `摇卦 (${lines.length}/6)`}
                  </button>
                  <button
                    onClick={autoToss}
                    disabled={lines.length >= 6 || isTossing}
                    className="px-6 bg-stone-100/50 hover:bg-stone-200/50 border border-stone-200 disabled:bg-transparent disabled:border-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-stone-600 py-3 rounded-2xl font-medium tracking-widest transition-all active:scale-[0.98]"
                  >
                    自动
                  </button>
                </div>
              </section>
            </div>

        {/* Hexagram Display */}
        {lines.length > 0 && (
          <section className="glass-panel rounded-3xl p-6 sm:p-8 overflow-hidden">
            <motion.div layout className="flex flex-col lg:flex-row gap-8 lg:gap-12 justify-center">
              
              {/* 本卦 / 摇卦中 */}
              <motion.div layout className="flex flex-col items-center lg:items-start w-full lg:w-1/2 max-w-md">
                <motion.div layout className="text-center lg:text-left mb-4 min-h-[4rem]">
                  {hexData ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h3 className="text-xs sm:text-sm text-stone-500 uppercase tracking-[0.3em] mb-1">本卦</h3>
                      <p className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-widest">{hexData.originalName}</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h3 className="text-xs sm:text-sm text-stone-500 uppercase tracking-[0.3em] mb-1 mt-2">起卦中...</h3>
                    </motion.div>
                  )}
                </motion.div>
                
                {hexData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6 text-stone-700 font-serif leading-relaxed text-sm bg-stone-100/50 p-4 rounded-2xl border border-stone-200 w-full">
                    <span className="text-[#8b2b22] mr-2 font-bold">卦辞:</span>
                    {getGuaci(hexData.originalBinary)}
                  </motion.div>
                )}

                <motion.div layout className="flex flex-col-reverse items-center justify-center py-2 w-full">
                  {lines.map((line, i) => (
                    <HexagramLine key={i} value={line} index={i} />
                  ))}
                  {!hexData && Array.from({ length: 6 - lines.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-[280px] sm:max-w-[320px] my-1.5 sm:my-2">
                      <div className="w-8 sm:w-10" />
                      <div className="flex-1 h-3 sm:h-4 border-2 border-dashed border-stone-300 opacity-50" />
                      <div className="w-6 sm:w-8" />
                    </div>
                  ))}
                </motion.div>

                {hexData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 space-y-2 w-full">
                    {lines.map((line, i) => {
                      const isMoving = line === 6 || line === 9;
                      return (
                        <div key={i} className={cn(
                          "font-serif text-sm p-3 rounded-xl border transition-colors",
                          isMoving ? "bg-[#8b2b22]/5 border-[#8b2b22]/20 text-[#8b2b22]" : "bg-transparent border-stone-200 text-stone-600"
                        )}>
                          {getYaoci(hexData.originalBinary, i)}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>

              {/* 变卦 */}
              {hexData && (
                <motion.div 
                  initial={{ opacity: 0, x: 40 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.4, duration: 0.6, type: "spring", bounce: 0.2 }}
                  className="flex flex-col items-center lg:items-start w-full lg:w-1/2 max-w-md relative"
                >
                  {/* Divider for desktop */}
                  <div className="hidden lg:block absolute -left-6 top-0 bottom-0 w-px bg-stone-200" />
                  
                  {hexData.movingLines.length > 0 ? (
                    <>
                      <div className="text-center lg:text-left mb-4 min-h-[4rem]">
                        <h3 className="text-xs sm:text-sm text-stone-500 uppercase tracking-[0.3em] mb-1">变卦</h3>
                        <p className="text-3xl sm:text-4xl font-serif text-[#8b2b22] tracking-widest">{hexData.changedName}</p>
                      </div>
                      
                      <div className="mb-6 text-stone-700 font-serif leading-relaxed text-sm bg-stone-100/50 p-4 rounded-2xl border border-stone-200 w-full">
                        <span className="text-[#8b2b22] mr-2 font-bold">卦辞:</span>
                        {getGuaci(hexData.changedBinary)}
                      </div>

                      <div className="flex flex-col-reverse items-center justify-center py-2 w-full">
                        {hexData.changedLineValues.map((line, i) => (
                          <HexagramLine key={`changed-${i}`} value={line} index={i} />
                        ))}
                      </div>

                      <div className="mt-6 space-y-2 w-full">
                        {hexData.changedLineValues.map((line, i) => {
                          const wasMoving = lines[i] === 6 || lines[i] === 9;
                          return (
                            <div key={i} className={cn(
                              "font-serif text-sm p-3 rounded-xl border transition-colors",
                              wasMoving ? "bg-[#8b2b22]/5 border-[#8b2b22]/20 text-[#8b2b22]" : "bg-transparent border-stone-200 text-stone-600"
                            )}>
                              {getYaoci(hexData.changedBinary, i)}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px]">
                      <div className="text-stone-500 font-serif text-base sm:text-lg tracking-widest border border-stone-200 bg-stone-100/50 px-6 py-3 rounded-2xl">
                        本次起卦无动爻，无变卦
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* AI Master Button */}
            {hexData && !interpretation && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex justify-center pt-8 border-t border-stone-200 mt-8"
              >
                <button
                  onClick={handleInterpret}
                  disabled={isInterpreting}
                  className="flex items-center justify-center gap-3 bg-stone-800 hover:bg-stone-900 text-[#fdfbf7] py-4 px-12 rounded-2xl font-medium transition-all disabled:opacity-70 active:scale-[0.98] shadow-[0_0_20px_rgba(44,40,37,0.1)] hover:shadow-[0_0_30px_rgba(44,40,37,0.2)]"
                >
                  {isInterpreting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      大师解卦中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                      AI 大师解卦
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </section>
        )}

        {/* Interpretation Result */}
        {interpretation && !showHistory && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 prose prose-stone prose-base sm:prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal"
          >
            <div className="markdown-body font-serif leading-relaxed text-stone-800">
              <Markdown>{interpretation}</Markdown>
            </div>
          </motion.section>
        )}
          </>
        )}

      </main>
    </div>
  );
}
