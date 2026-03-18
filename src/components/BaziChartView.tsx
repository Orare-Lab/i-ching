import { BaziChart } from "../types";

const pillarOrder: Array<keyof BaziChart["pillars"]> = ["year", "month", "day", "hour"];
const pillarTitles: Record<keyof BaziChart["pillars"], string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
};

export function BaziChartView({ chart }: { chart: BaziChart }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <article className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs tracking-[0.25em] text-[#8b2b22]">BAZI CHART</div>
              <h3 className="mt-2 text-2xl font-serif tracking-[0.18em] text-stone-900">四柱排盘</h3>
            </div>
            <div className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs tracking-[0.18em] text-stone-500">
              {chart.gender === "male" ? "男命" : "女命"}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">命主</div>
              <div className="mt-2 text-lg font-serif text-stone-900">{chart.name || "未填写姓名"}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">起盘方式</div>
              <div className="mt-2 text-lg font-serif text-stone-900">{chart.calendarType === "solar" ? "公历录入" : "农历录入"}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">公历</div>
              <div className="mt-2 text-base font-serif text-stone-900">{chart.solarDateText}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">农历</div>
              <div className="mt-2 text-base font-serif text-stone-900">{chart.lunarDateText}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {pillarOrder.map((key) => {
              const pillar = chart.pillars[key];
              return (
                <div key={key} className="rounded-[1.5rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,241,234,0.95))] px-4 py-5">
                  <div className="text-[11px] tracking-[0.24em] text-stone-400">{pillarTitles[key]}</div>
                  <div className="mt-3 text-3xl font-serif tracking-[0.2em] text-stone-900">{pillar.label}</div>
                  <div className="mt-4 space-y-2 text-sm text-stone-600">
                    <div>天干五行：{pillar.stemElement}</div>
                    <div>地支五行：{pillar.branchElement}</div>
                    <div>生肖 / 宫位：{pillar.animal}</div>
                    <div>藏干：{pillar.hiddenStems.join("、")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="text-xs tracking-[0.25em] text-[#8b2b22]">SUMMARY</div>
          <h3 className="mt-2 text-xl font-serif tracking-[0.16em] text-stone-900">命盘摘要</h3>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">日主</div>
              <div className="mt-2 text-2xl font-serif text-[#8b2b22]">{chart.dayMaster}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/75 px-4 py-4">
              <div className="text-[11px] tracking-[0.2em] text-stone-400">生肖</div>
              <div className="mt-2 text-lg font-serif text-stone-900">{chart.zodiac}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/85 px-4 py-4">
            <div className="text-[11px] tracking-[0.2em] text-stone-400">五行分布（按八字明字）</div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Object.entries(chart.elementCounts).map(([element, count]) => (
                <div key={element} className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-center">
                  <div className="text-lg font-serif text-stone-900">{element}</div>
                  <div className="mt-1 text-sm text-stone-500">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <article className="glass-panel rounded-3xl p-5 sm:p-6">
        <div className="text-sm font-serif text-stone-900">排盘说明</div>
        <div className="mt-3 space-y-2 text-sm leading-7 text-stone-600">
          {chart.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </article>
    </section>
  );
}
