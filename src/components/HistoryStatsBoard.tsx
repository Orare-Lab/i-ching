import { hexagramNames } from "../data/hexagrams";
import { buildHexagramFrequencyStats } from "../lib/personalArchive";
import { DivinationSummary } from "../types";

interface HistoryStatsBoardProps {
  history: DivinationSummary[];
}

export function HistoryStatsBoard({ history }: HistoryStatsBoardProps) {
  const { totalRecords, uniqueHexagrams, counts } = buildHexagramFrequencyStats(history);
  const rankedHexagrams = Object.entries(hexagramNames)
    .map(([binary, name]) => {
      const count = counts.get(binary) || 0;
      const ratio = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
      return { binary, name, count, ratio };
    })
    .sort((a, b) => (b.count === a.count ? a.binary.localeCompare(b.binary) : b.count - a.count));

  const topHexagram = rankedHexagrams.find((item) => item.count > 0) || null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="text-xs tracking-[0.3em] text-[#8b2b22]">统计看板</div>
        <h2 className="mt-3 font-serif text-2xl text-stone-900">64 卦频率</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">按你个人历史记录的本卦统计，右侧仍是逐条明细。</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
            <div className="text-[11px] tracking-[0.2em] text-stone-400">总记录</div>
            <div className="mt-2 text-2xl font-serif text-stone-900">{totalRecords}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
            <div className="text-[11px] tracking-[0.2em] text-stone-400">出现过的卦</div>
            <div className="mt-2 text-2xl font-serif text-stone-900">{uniqueHexagrams}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
            <div className="text-[11px] tracking-[0.2em] text-stone-400">最高频</div>
            <div className="mt-2 text-base font-serif text-stone-900">{topHexagram?.name || "暂无"}</div>
            <div className="mt-1 text-xs text-stone-500">{topHexagram ? `${topHexagram.count} 次` : "还没有历史记录"}</div>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-serif text-stone-900">64 卦频率表</div>
          <div className="text-xs text-stone-500">按出现次数降序</div>
        </div>

        <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {rankedHexagrams.map((item, index) => (
            <div key={item.binary} className="rounded-2xl border border-stone-200 bg-white/75 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] text-stone-500">
                      #{index + 1}
                    </span>
                    <span className="font-serif text-stone-900">{item.name}</span>
                  </div>
                  <div className="mt-1 text-[11px] tracking-[0.18em] text-stone-400">{item.binary}</div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-stone-900">{item.count} 次</div>
                  <div className="text-xs text-stone-500">{item.ratio}%</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[#8b2b22]/70 transition-[width]"
                  style={{ width: `${item.ratio}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
