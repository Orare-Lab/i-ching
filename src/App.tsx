import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import { Loader2, RefreshCw, Sparkles, History, ArrowLeft, BookOpen, GitCompareArrows, CircleDot, Layers3, Waypoints, Coins, Users, Stars } from "lucide-react";
import { Coin } from "./components/Coin";
import { HexagramLine } from "./components/HexagramLine";
import { LineValue, createHexagramLineDetail, parseHexagram } from "./data/hexagrams";
import { getGuaci, getYaoci } from "./data/ichingTexts";
import { interpretHexagram } from "./services/aiService";
import { generateLine } from "./lib/divination";
import { deleteHistoryRecord, loadHistoryDetail, loadHistorySummaries, saveHistoryRecord, updateHistoryRecord } from "./lib/history";
import { parseInterpretation } from "./lib/interpretation";
import { buildHexagramSignature, buildPersonalHexagramInsights, formatHistoryDate, inferTopicFromQuestion, OUTCOME_OPTIONS, TOPIC_OPTIONS } from "./lib/personalArchive";
import { buildBaziChart } from "./lib/bazi";
import { cn } from "./lib/utils";
import { BaziCalendarType, BaziChart, BaziGender, DivinationOutcomeTag, DivinationRecord, DivinationSummary, DivinationTopic } from "./types";
import { HistoryView } from "./components/HistoryView";
import { HistoryStatsBoard } from "./components/HistoryStatsBoard";
import { BaziChartView } from "./components/BaziChartView";
import { getDayStemForDate } from "./lib/hexagramAnnotations";

const TOSS_DURATION_MS = 1500;
const PAGE_STORAGE_KEY = "liuyao-page";
const PRACTICE_STORAGE_KEY = "iching-practice";
const BAGUA_ROTATION_DURATION_S = 36;
const TAIJI_ROTATION_DURATION_S = 24;
const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VIEWPORT_HEIGHT = WHEEL_ITEM_HEIGHT * 4;
const WHEEL_SPACER_HEIGHT = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;
const DEFAULT_SOLAR_DATE = formatDatePartsToIso(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
const SOLAR_YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => 1926 + index);
const LUNAR_YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => 1926 + index);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);
const TIME_SLOT_OPTIONS = [
  { label: "子时", hour: 23, range: "23:00-00:59" },
  { label: "丑时", hour: 1, range: "01:00-02:59" },
  { label: "寅时", hour: 3, range: "03:00-04:59" },
  { label: "卯时", hour: 5, range: "05:00-06:59" },
  { label: "辰时", hour: 7, range: "07:00-08:59" },
  { label: "巳时", hour: 9, range: "09:00-10:59" },
  { label: "午时", hour: 11, range: "11:00-12:59" },
  { label: "未时", hour: 13, range: "13:00-14:59" },
  { label: "申时", hour: 15, range: "15:00-16:59" },
  { label: "酉时", hour: 17, range: "17:00-18:59" },
  { label: "戌时", hour: 19, range: "19:00-20:59" },
  { label: "亥时", hour: 21, range: "21:00-22:59" },
] as const;
const basics = [
  {
    key: "lines",
    title: "阴阳与四象",
    icon: CircleDot,
    body: "先看阴阳，再分老阴、少阴、少阳、老阳。",
    points: ["6 = 老阴", "7 = 少阳", "8 = 少阴", "9 = 老阳"],
  },
  {
    key: "bagua",
    title: "四象生八卦",
    icon: Layers3,
    body: "四象再分，就能展开成八卦。",
    points: ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"],
  },
  {
    key: "change",
    title: "什么会变化",
    icon: GitCompareArrows,
    body: "老阴老阳会动，少阴少阳不动。",
    points: ["6：老阴 -> 阳", "9：老阳 -> 阴", "7 / 8 不变"],
  },
  {
    key: "reading",
    title: "怎么看结果",
    icon: Waypoints,
    body: "按这个顺序看，最不容易乱。",
    points: ["本卦：当下", "动爻：关键", "变卦：后势"],
  },
  {
    key: "relations",
    title: "六亲看什么",
    icon: Users,
    body: "六亲不是家谱，而是把事物分成几类角色。",
    points: ["兄弟：同类/竞争", "子孙：结果/放松", "妻财：财物/资源", "官鬼：压力/工作", "父母：文书/庇护", "结果区：先看你问的是哪一亲"],
  },
  {
    key: "spirits",
    title: "六神看什么",
    icon: Stars,
    body: "六神像气氛标签，帮你看事情怎么发生。",
    points: ["青龙：顺喜", "朱雀：言语", "勾陈：拖延", "腾蛇：虚惊", "白虎：冲突", "玄武：隐情", "结果区：再看它带着什么气氛"],
  },
  {
    key: "order",
    title: "怎么读六爻",
    icon: Layers3,
    body: "一卦六层，顺序从下往上记。",
    points: ["初 -> 二 -> 三 -> 四 -> 五 -> 上", "记录顺序：自下而上"],
  },
  {
    key: "coins",
    title: "三枚钱币怎么看",
    icon: Coins,
    body: "正面记 2，背面记 3，三枚相加就是爻数。",
    points: ["3 正 = 6", "2 正 1 背 = 7", "1 正 2 背 = 8", "3 背 = 9"],
  },
];

function IntroLine({ type, moving = false }: { type: "yang" | "yin"; moving?: boolean }) {
  if (type === "yang") {
    return (
      <div className="flex h-3 w-full max-w-24 min-w-0 items-center gap-2">
        <div className={`h-full flex-1 ${moving ? "bg-[#8b2b22]" : "bg-stone-700"}`} />
        <span className="w-4 text-center text-sm font-bold text-[#8b2b22]">{moving ? "○" : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex h-3 w-full max-w-24 min-w-0 items-center gap-2">
      <div className="flex flex-1 justify-between">
        <div className={`h-3 w-[42%] ${moving ? "bg-[#8b2b22]" : "bg-stone-700"}`} />
        <div className={`h-3 w-[42%] ${moving ? "bg-[#8b2b22]" : "bg-stone-700"}`} />
      </div>
      <span className="w-4 text-center text-sm font-bold text-[#8b2b22]">{moving ? "×" : ""}</span>
    </div>
  );
}

function IntroStep({ index, label }: { index: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#8b2b22]/15 bg-white/80 px-3 py-1 text-[11px] tracking-[0.18em] text-stone-500">
      <span className="text-[#8b2b22]">{index}</span>
      <span>{label}</span>
    </div>
  );
}

function IntroCoinTriple({ pattern }: { pattern: ("front" | "back")[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {pattern.map((side, index) => (
        <span
          key={`${side}-${index}`}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-serif",
            side === "front"
              ? "border-stone-300 bg-stone-100 text-stone-600"
              : "border-[#8b2b22]/25 bg-[#8b2b22]/8 text-[#8b2b22]",
          )}
        >
          {side === "front" ? "正" : "背"}
        </span>
      ))}
    </div>
  );
}

function TrigramBraceColumn({ upper, lower }: { upper: string; lower: string }) {
  return (
      <div className="flex w-10 sm:w-12 flex-col justify-between py-2 text-stone-500">
        <div className="flex h-[calc(50%-0.25rem)] items-center">
        <span className="text-[72px] leading-none text-stone-300 sm:text-[84px]">{"}"}</span>
          <span className="ml-1 text-sm sm:text-base font-serif">{upper}</span>
        </div>
        <div className="flex h-[calc(50%-0.25rem)] items-center">
        <span className="text-[72px] leading-none text-stone-300 sm:text-[84px]">{"}"}</span>
          <span className="ml-1 text-sm sm:text-base font-serif">{lower}</span>
        </div>
      </div>
  );
}

function IntroTrigram({ binary }: { binary: string }) {
  return (
    <div className="flex w-6 flex-col-reverse items-center gap-1">
      {binary.split("").map((bit, index) => (
        <div key={`${binary}-${index}`} className="w-full">
          {bit === "1" ? (
            <div className="h-1.5 w-full bg-stone-700" />
          ) : (
            <div className="flex justify-between">
              <div className="h-1.5 w-[42%] bg-stone-700" />
              <div className="h-1.5 w-[42%] bg-stone-700" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeaderTaijiIcon() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      className="relative h-7 w-7 overflow-hidden rounded-full border border-[#8b2b22]/35 bg-stone-900"
    >
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[#f4f1ea]" />
      <div className="absolute left-1/2 top-0 h-1/2 w-1/2 -translate-x-1/2 rounded-full bg-stone-900" />
      <div className="absolute left-1/2 bottom-0 h-1/2 w-1/2 -translate-x-1/2 rounded-full bg-[#f4f1ea]" />
      <div className="absolute left-1/2 top-1/4 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4f1ea]" />
      <div className="absolute left-1/2 top-3/4 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900" />
    </motion.div>
  );
}

function WheelColumn({
  label,
  value,
  options,
  onChange,
  formatOption,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  formatOption?: (value: number) => string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const isInternalScroll = useRef(false);

  useEffect(() => {
    if (isInternalScroll.current) {
      isInternalScroll.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const container = scrollRef.current;
      if (!container) return;

      const index = options.indexOf(value);
      if (index === -1) return;

      container.scrollTo({
        top: index * WHEEL_ITEM_HEIGHT,
        behavior: "smooth",
      });
    }, 10);

    return () => window.clearTimeout(timer);
  }, [options, value]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const snapToNearest = () => {
    const container = scrollRef.current;
    if (!container) return;

    const nextIndex = Math.max(0, Math.min(options.length - 1, Math.round(container.scrollTop / WHEEL_ITEM_HEIGHT)));
    const nextValue = options[nextIndex];
    if (nextValue === undefined || nextValue === value) return;

    isInternalScroll.current = true;
    onChange(nextValue);
  };

  const handleScroll = () => {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
    }

    snapTimerRef.current = window.setTimeout(() => {
      snapToNearest();
    }, 100);
  };

  return (
    <div className="relative rounded-2xl border border-stone-200 bg-white/80 px-2 py-3">
      <div className="mb-2 text-center text-[11px] tracking-[0.2em] text-stone-400">{label}</div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-xl border border-[#8b2b22]/15 bg-[#8b2b22]/6" />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="snap-y snap-mandatory overflow-y-auto scroll-smooth text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            height: `${WHEEL_VIEWPORT_HEIGHT}px`,
            scrollPaddingBlock: `${WHEEL_SPACER_HEIGHT}px`,
          }}
        >
          <div style={{ height: `${WHEEL_SPACER_HEIGHT}px` }} />
          {options.map((option) => {
            return (
              <button
                key={`${label}-${option}`}
                type="button"
                onClick={() => {
                  isInternalScroll.current = true;
                  onChange(option);
                }}
                className={cn(
                  "block h-10 w-full snap-center rounded-xl font-serif text-base transition-all",
                  option === value ? "text-[#8b2b22]" : "text-stone-500 hover:text-stone-900",
                )}
              >
                {formatOption ? formatOption(option) : option}
              </button>
            );
          })}
          <div style={{ height: `${WHEEL_SPACER_HEIGHT}px` }} />
        </div>
      </div>
    </div>
  );
}

function TimeWheelPicker({
  hour,
  onHourChange,
}: {
  hour: number;
  onHourChange: (value: number) => void;
}) {
  const slotHours = TIME_SLOT_OPTIONS.map((option) => option.hour);
  return (
    <WheelColumn
      label="时段"
      value={hour}
      options={slotHours}
      onChange={onHourChange}
      formatOption={(value) => {
        const matched = TIME_SLOT_OPTIONS.find((option) => option.hour === value);
        return matched ? matched.label : `${value}时`;
      }}
    />
  );
}

function EdgeTrigram({
  name,
  binary,
  className,
  keepUpright = false,
}: {
  name: string;
  binary: string;
  className: string;
  keepUpright?: boolean;
}) {
  return (
    <div className={cn("absolute flex items-center justify-center", className)}>
      {keepUpright ? (
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: BAGUA_ROTATION_DURATION_S, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[11px] font-serif text-stone-700">{name}</span>
          <IntroTrigram binary={binary} />
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-serif text-stone-700">{name}</span>
          <IntroTrigram binary={binary} />
        </div>
      )}
    </div>
  );
}

function formatDatePartsToIso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSolarDate(value: string) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
    };
  }

  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  };
}

function parseTimeParts(value: string) {
  const matched = value.match(/^(\d{2}):(\d{2})$/);
  if (!matched) {
    return { hour: 11 };
  }

  return {
    hour: Number(matched[1]),
  };
}

function formatTimeParts(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getSolarDayCount(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [inviteCode, setInviteCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRedeemingInvite, setIsRedeemingInvite] = useState(false);
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<LineValue[]>([]);
  const [isTossing, setIsTossing] = useState(false);
  const [coins, setCoins] = useState<[0 | 1, 0 | 1, 0 | 1]>([0, 0, 0]);
  const [tossRound, setTossRound] = useState(0);
  const [basicInterpretation, setBasicInterpretation] = useState<string | null>(null);
  const [deepInterpretation, setDeepInterpretation] = useState<string | null>(null);
  const [technicalInterpretation, setTechnicalInterpretation] = useState<string | null>(null);
  const [isInterpretingStage, setIsInterpretingStage] = useState<null | "basic" | "deep" | "technical">(null);
  const [currentInterpretationRecordId, setCurrentInterpretationRecordId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DivinationSummary[]>(() => loadHistorySummaries());
  const [castingDate, setCastingDate] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<"cast" | "learn">("cast");
  const [activePractice, setActivePractice] = useState<"liuyao" | "bazi">("liuyao");
  const [activeGuide, setActiveGuide] = useState<"liuyao" | "bazi">("liuyao");
  const [baziName, setBaziName] = useState("");
  const [baziGender, setBaziGender] = useState<BaziGender>("male");
  const [baziCalendarType, setBaziCalendarType] = useState<BaziCalendarType>("solar");
  const [baziSolarDate, setBaziSolarDate] = useState(DEFAULT_SOLAR_DATE);
  const [baziTime, setBaziTime] = useState("12:00");
  const [baziLunarYear, setBaziLunarYear] = useState(String(new Date().getFullYear()));
  const [baziLunarMonth, setBaziLunarMonth] = useState("1");
  const [baziLunarDay, setBaziLunarDay] = useState("1");
  const [baziLeapMonth, setBaziLeapMonth] = useState(false);
  const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
  const [baziError, setBaziError] = useState<string | null>(null);
  const tossLockRef = useRef(false);
  const autoTossingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me");
        if (!response.ok) {
          const rawText = await response.text().catch(() => "");
          let errorDetail = rawText;

          try {
            const parsed = rawText ? JSON.parse(rawText) : null;
            errorDetail =
              parsed && typeof parsed === "object"
                ? JSON.stringify(parsed)
                : rawText;
          } catch {
            errorDetail = rawText;
          }

          throw new Error(
            `加载登录状态失败: /api/me -> ${response.status}${errorDetail ? ` ${errorDetail}` : ""}`,
          );
        }

        const data = await response.json();
        if (!cancelled) {
          setAuthStatus(data.authenticated ? "authenticated" : "unauthenticated");
        }
      } catch (error) {
        if (!cancelled) {
          setAuthStatus("unauthenticated");
          setAuthError(
            error instanceof Error ? error.message : "无法确认登录状态，请稍后重试。",
          );
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const savedPage = window.localStorage.getItem(PAGE_STORAGE_KEY);
      if (savedPage === "cast" || savedPage === "learn") {
        setActivePage(savedPage);
      }

      const savedPractice = window.localStorage.getItem(PRACTICE_STORAGE_KEY);
      if (savedPractice === "liuyao" || savedPractice === "bazi") {
        setActivePractice(savedPractice);
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  useEffect(() => {
    const { year, month, day } = parseSolarDate(baziSolarDate);
    const maxDay = getSolarDayCount(year, month);
    if (day > maxDay) {
      setBaziSolarDate(formatDatePartsToIso(year, month, maxDay));
    }
  }, [baziSolarDate]);

  useEffect(() => {
    const day = Number(baziLunarDay);
    if (day > 30) {
      setBaziLunarDay("30");
    } else if (day < 1) {
      setBaziLunarDay("1");
    }
  }, [baziLunarDay]);

  const appendGeneratedLine = async () => {
    if (lines.length >= 6 || tossLockRef.current) return false;

    tossLockRef.current = true;
    const { coins: nextCoins, score } = generateLine();
    if (lines.length === 0 && !castingDate) {
      setCastingDate(new Date().toISOString());
    }
    setIsTossing(true);
    setTossRound((prev) => prev + 1);
    setCoins(nextCoins);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, TOSS_DURATION_MS));
      setLines((prev) => [...prev, score]);
      return true;
    } finally {
      setIsTossing(false);
      if (!autoTossingRef.current) {
        tossLockRef.current = false;
      }
    }
  };

  const tossCoins = async () => {
    await appendGeneratedLine();
  };

  const autoToss = async () => {
    if (tossLockRef.current) return;

    autoTossingRef.current = true;
    tossLockRef.current = true;
    setCastingDate(new Date().toISOString());
    setLines([]);
    setCoins([0, 0, 0]);
    setTossRound(0);
    setBasicInterpretation(null);
    setDeepInterpretation(null);
    setTechnicalInterpretation(null);
    setCurrentInterpretationRecordId(null);

    try {
      for (let count = 0; count < 6; count += 1) {
        tossLockRef.current = false;
        const appended = await appendGeneratedLine();
        if (!appended) {
          break;
        }
      }
    } finally {
      autoTossingRef.current = false;
      tossLockRef.current = false;
    }
  };

  const reset = () => {
    setLines([]);
    setCoins([0, 0, 0]);
    setTossRound(0);
    setBasicInterpretation(null);
    setDeepInterpretation(null);
    setTechnicalInterpretation(null);
    setCurrentInterpretationRecordId(null);
    setQuestion("");
    setCastingDate(null);
  };

  const handleGenerateBazi = () => {
    try {
      const nextChart = buildBaziChart({
        name: baziName || "未署名命主",
        gender: baziGender,
        calendarType: baziCalendarType,
        solarDate: baziSolarDate,
        solarTime: baziTime,
        lunarYear: baziLunarYear ? Number(baziLunarYear) : undefined,
        lunarMonth: baziLunarMonth ? Number(baziLunarMonth) : undefined,
        lunarDay: baziLunarDay ? Number(baziLunarDay) : undefined,
        lunarLeapMonth: baziLeapMonth,
      });
      setBaziChart(nextChart);
      setBaziError(null);
    } catch (error) {
      setBaziChart(null);
      setBaziError(error instanceof Error ? error.message : "排盘失败，请检查输入信息。");
    }
  };

  const buildStoredInterpretation = (basic: string, deep?: string, technical?: string) => {
    const sections = [`## 浅显解读\n\n${basic.trim()}`];
    if (deep?.trim()) {
      sections.push(`## 深度解读\n\n${deep.trim()}`);
    }
    if (technical?.trim()) {
      sections.push(`## 术数细读\n\n${technical.trim()}`);
    }
    return sections.join("\n\n");
  };

  const handleInterpret = async (stage: "basic" | "deep" | "technical") => {
    if (lines.length < 6 || !hexData) return;

    if (stage === "deep" && !basicInterpretation?.trim()) {
      return;
    }
    if (stage === "technical" && !deepInterpretation?.trim()) {
      return;
    }

    setIsInterpretingStage(stage);
    if (stage === "basic") {
      setBasicInterpretation("");
      setDeepInterpretation(null);
      setTechnicalInterpretation(null);
    } else if (stage === "deep") {
      setDeepInterpretation("");
      setTechnicalInterpretation(null);
    } else {
      setTechnicalInterpretation("");
    }
    try {
      const result = await interpretHexagram(question, lines, {
        castedAt: castingDate,
        stage,
        onChunk: (_chunk, fullText) => {
          if (stage === "basic") {
            setBasicInterpretation(fullText);
          } else if (stage === "deep") {
            setDeepInterpretation(fullText);
          } else {
            setTechnicalInterpretation(fullText);
          }
        },
      });

      if (stage === "basic") {
        const recordId = Date.now().toString();
        const newRecord: DivinationRecord = {
          id: recordId,
          date: new Date().toISOString(),
          question: question || "无特定问题，求测近期运势",
          lines: [...lines],
          originalName: hexData.originalName,
          changedName: hexData.changedName,
          movingLines: hexData.movingLines,
          originalBinary: hexData.originalBinary,
          changedBinary: hexData.changedBinary,
          signature: buildHexagramSignature(hexData.originalBinary, hexData.changedBinary, hexData.movingLines),
          topic: inferTopicFromQuestion(question || "无特定问题，求测近期运势"),
          outcomeTag: "待观察",
          outcomeNote: "",
          interpretation: buildStoredInterpretation(result),
        };

        setCurrentInterpretationRecordId(recordId);
        setHistory(saveHistoryRecord(newRecord));
      } else if (stage === "deep") {
        const fullInterpretation = buildStoredInterpretation(basicInterpretation || "", result);
        const newRecord: DivinationRecord = {
          id: currentInterpretationRecordId || Date.now().toString(),
          date: new Date().toISOString(),
          question: question || "无特定问题，求测近期运势",
          lines: [...lines],
          originalName: hexData.originalName,
          changedName: hexData.changedName,
          movingLines: hexData.movingLines,
          originalBinary: hexData.originalBinary,
          changedBinary: hexData.changedBinary,
          signature: buildHexagramSignature(hexData.originalBinary, hexData.changedBinary, hexData.movingLines),
          topic: currentHistoryRecord?.topic || inferTopicFromQuestion(question || "无特定问题，求测近期运势"),
          outcomeTag: currentHistoryRecord?.outcomeTag || "待观察",
          outcomeNote: currentHistoryRecord?.outcomeNote || "",
          interpretation: fullInterpretation,
        };

        setHistory(saveHistoryRecord(newRecord));
      } else {
        const fullInterpretation = buildStoredInterpretation(
          basicInterpretation || "",
          deepInterpretation || "",
          result,
        );
        const newRecord: DivinationRecord = {
          id: currentInterpretationRecordId || Date.now().toString(),
          date: new Date().toISOString(),
          question: question || "无特定问题，求测近期运势",
          lines: [...lines],
          originalName: hexData.originalName,
          changedName: hexData.changedName,
          movingLines: hexData.movingLines,
          originalBinary: hexData.originalBinary,
          changedBinary: hexData.changedBinary,
          signature: buildHexagramSignature(hexData.originalBinary, hexData.changedBinary, hexData.movingLines),
          topic: currentHistoryRecord?.topic || inferTopicFromQuestion(question || "无特定问题，求测近期运势"),
          outcomeTag: currentHistoryRecord?.outcomeTag || "待观察",
          outcomeNote: currentHistoryRecord?.outcomeNote || "",
          interpretation: fullInterpretation,
        };

        setHistory(saveHistoryRecord(newRecord));
      }
    } catch (error: any) {
      if (stage === "basic") {
        setBasicInterpretation(null);
      } else if (stage === "deep") {
        setDeepInterpretation(null);
      } else {
        setTechnicalInterpretation(null);
      }
      if (typeof error?.message === "string" && error.message.includes("邀请码")) {
        setAuthStatus("unauthenticated");
        setAuthError("登录状态已失效，请重新输入邀请码。");
      }
      alert(error.message || "解卦失败，请检查网络或API Key配置。");
    } finally {
      setIsInterpretingStage(null);
    }
  };

  const handleRedeemInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCode.trim()) {
      setAuthError("请输入邀请码。");
      return;
    }

    setIsRedeemingInvite(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/redeem-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "邀请码校验失败。");
      }

      setInviteCode("");
      setAuthStatus("authenticated");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "邀请码校验失败。");
    } finally {
      setIsRedeemingInvite(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setAuthStatus("unauthenticated");
      setAuthError(null);
      reset();
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(deleteHistoryRecord(id));
  };

  const handleUpdateHistoryRecord = (
    id: string,
    patch: { topic?: DivinationTopic; outcomeTag?: DivinationOutcomeTag; outcomeNote?: string },
  ) => {
    setHistory(updateHistoryRecord(id, patch));
  };

  const persistPage = (page: "cast" | "learn") => {
    try {
      window.localStorage.setItem(PAGE_STORAGE_KEY, page);
    } catch {
      // Ignore storage write failures.
    }
  };

  const handleSelectPage = (page: "cast" | "learn") => {
    setActivePage(page);
    persistPage(page);
  };

  const handleSelectPractice = (practice: "liuyao" | "bazi") => {
    setActivePractice(practice);
    try {
      window.localStorage.setItem(PRACTICE_STORAGE_KEY, practice);
    } catch {
      // Ignore storage write failures.
    }
  };

  const computationDate = castingDate ? new Date(castingDate) : new Date();
  const solarPickerValue = parseSolarDate(baziSolarDate);
  const solarDayOptions = Array.from({ length: getSolarDayCount(solarPickerValue.year, solarPickerValue.month) }, (_, index) => index + 1);
  const lunarPickerValue = {
    year: Number(baziLunarYear) || LUNAR_YEAR_OPTIONS[0],
    month: Number(baziLunarMonth) || 1,
    day: Number(baziLunarDay) || 1,
  };
  const timePickerValue = parseTimeParts(baziTime);
  const hexData = lines.length === 6
    ? parseHexagram(lines, { dayStem: getDayStemForDate(computationDate) })
    : null;
  const parsedBasicInterpretation = parseInterpretation(basicInterpretation || "");
  const parsedDeepInterpretation = parseInterpretation(deepInterpretation || "");
  const parsedTechnicalInterpretation = parseInterpretation(technicalInterpretation || "");
  const currentHistoryRecord = currentInterpretationRecordId
    ? history.find((item) => item.id === currentInterpretationRecordId) || null
    : null;
  const personalHexagramInsights =
    hexData && basicInterpretation !== null
      ? buildPersonalHexagramInsights(history, currentInterpretationRecordId, hexData)
      : null;
  const updateSolarPicker = (patch: Partial<typeof solarPickerValue>) => {
    const nextYear = patch.year ?? solarPickerValue.year;
    const nextMonth = patch.month ?? solarPickerValue.month;
    const nextMaxDay = getSolarDayCount(nextYear, nextMonth);
    const nextDay = Math.min(patch.day ?? solarPickerValue.day, nextMaxDay);
    setBaziSolarDate(formatDatePartsToIso(nextYear, nextMonth, nextDay));
  };
  const updateTimePicker = (patch: Partial<typeof timePickerValue>) => {
    const nextHour = patch.hour ?? timePickerValue.hour;
    setBaziTime(formatTimeParts(nextHour));
  };
  const basicsSection = (
    <section className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b2b22]/40 to-transparent" />
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#8b2b22]/20 bg-[#8b2b22]/8 flex items-center justify-center text-[#8b2b22]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif tracking-[0.2em] text-stone-900">六爻入门</h2>
            <p className="mt-1 text-sm text-stone-500 font-serif">五分钟看懂六爻怎么起、怎么读。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {basics.slice(0, 6).map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(244,241,234,0.9))] p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-stone-900 text-[#fdfbf7] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg text-stone-900">{item.title}</h3>
              </div>
              <div className="mb-4 rounded-2xl border border-stone-200 bg-[#f4f1ea]/90 px-4 py-4">
                {item.key === "lines" && (
                  <div className="space-y-4">
                    <IntroStep index="01" label="先认阴阳，再认四象" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="text-[11px] tracking-[0.2em] text-stone-400">阴</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-stone-700">断开</span>
                          <IntroLine type="yin" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="text-[11px] tracking-[0.2em] text-stone-400">阳</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-stone-700">整线</span>
                          <IntroLine type="yang" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.2em] text-stone-400">6</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-[#8b2b22]">老阴</span>
                          <IntroLine type="yin" moving />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.2em] text-stone-400">8</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-stone-700">少阴</span>
                          <IntroLine type="yin" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.2em] text-stone-400">7</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-stone-700">少阳</span>
                          <IntroLine type="yang" />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.2em] text-stone-400">9</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-serif text-[#8b2b22]">老阳</span>
                          <IntroLine type="yang" moving />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-200 bg-white/70 px-3 py-2 text-xs text-stone-500">
                      <span>老阴老阳会动</span>
                      <span className="text-stone-300">→</span>
                      <span>少阴少阳不动</span>
                    </div>
                  </div>
                )}
                {item.key === "bagua" && (
                  <div className="space-y-4">
                    <IntroStep index="02" label="四象展开成八卦" />
                    <div className="relative mx-auto h-64 w-64">
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: TAIJI_ROTATION_DURATION_S, ease: "easeInOut" }}
                        className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-stone-300 bg-white shadow-sm"
                      >
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-stone-900" />
                        <div className="absolute left-1/2 top-0 h-18 w-18 -translate-x-1/2 rounded-full bg-white" />
                        <div className="absolute bottom-0 left-1/2 h-18 w-18 -translate-x-1/2 rounded-full bg-stone-900" />
                        <div className="absolute left-1/2 top-1/4 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900" />
                        <div className="absolute left-1/2 top-3/4 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stone-300/50 bg-white" />
                      </motion.div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: BAGUA_ROTATION_DURATION_S, ease: "easeInOut" }}
                        className="absolute inset-0"
                      >
                        <EdgeTrigram name="乾" binary="111" className="left-1/2 top-0 -translate-x-1/2" keepUpright />
                        <EdgeTrigram name="巽" binary="011" className="right-7 top-7" keepUpright />
                        <EdgeTrigram name="坎" binary="010" className="right-0 top-1/2 -translate-y-1/2" keepUpright />
                        <EdgeTrigram name="艮" binary="001" className="right-7 bottom-7" keepUpright />
                        <EdgeTrigram name="坤" binary="000" className="left-1/2 bottom-0 -translate-x-1/2" keepUpright />
                        <EdgeTrigram name="震" binary="100" className="left-7 bottom-7" keepUpright />
                        <EdgeTrigram name="离" binary="101" className="left-0 top-1/2 -translate-y-1/2" keepUpright />
                        <EdgeTrigram name="兑" binary="110" className="left-7 top-7" keepUpright />
                      </motion.div>
                    </div>
                    <div className="text-center text-xs text-stone-500">太极在中，一圈八卦按方位展开。</div>
                  </div>
                )}
                {item.key === "order" && (
                  <div className="space-y-4">
                    <IntroStep index="03" label="从下往上读" />
                    <div className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-1 text-[#8b2b22]">
                          <span className="text-xs tracking-[0.2em]">往上读</span>
                          <span className="text-xl">↑</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "上", active: false },
                            { label: "五", active: false },
                            { label: "四", active: false },
                            { label: "三", active: false },
                            { label: "二", active: false },
                            { label: "初", active: true },
                          ].map(({ label, active }) => (
                            <div key={label} className="flex items-center gap-3">
                              <div className="w-5 text-[11px] tracking-[0.2em] text-stone-400">{label}</div>
                              <div
                                className={cn(
                                  "h-3 w-28 rounded-full border",
                                  active
                                    ? "border-[#8b2b22]/30 bg-[#8b2b22]/10"
                                    : "border-stone-200 bg-white",
                                )}
                              />
                              {active && (
                                <span className="rounded-full bg-[#8b2b22]/10 px-2 py-1 text-[11px] text-[#8b2b22]">
                                  起点
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 text-center text-xs text-stone-500">
                        初爻在最下，上爻在最上，记录和读卦都按这个方向。
                      </div>
                    </div>
                  </div>
                )}
                {item.key === "coins" && (
                  <div className="space-y-4">
                    <IntroStep index="02" label="先算出爻数" />
                    <div className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-4">
                      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm font-serif text-stone-700">
                        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                          <span>正 正 正</span>
                          <span className="text-stone-500">2+2+2</span>
                        </div>
                        <div className="flex items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-white">6</div>
                        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                          <span>背 正 正</span>
                          <span className="text-stone-500">3+2+2</span>
                        </div>
                        <div className="flex items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-white">7</div>
                        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                          <span>背 背 正</span>
                          <span className="text-stone-500">3+3+2</span>
                        </div>
                        <div className="flex items-center justify-center rounded-xl bg-stone-900 px-3 py-2 text-white">8</div>
                        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                          <span>背 背 背</span>
                          <span className="text-stone-500">3+3+3</span>
                        </div>
                        <div className="flex items-center justify-center rounded-xl bg-[#8b2b22] px-3 py-2 text-white">9</div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-stone-500">
                        <span className="rounded-full bg-stone-100 px-2 py-1">正面 = 2</span>
                        <span className="text-stone-300">·</span>
                        <span className="rounded-full bg-stone-100 px-2 py-1">背面 = 3</span>
                      </div>
                    </div>
                  </div>
                )}
                {item.key === "change" && (
                  <div className="space-y-4">
                    <IntroStep index="03" label="老变少不变" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                      <div className="space-y-3 min-w-0">
                        <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] tracking-[0.2em] text-stone-400">6</span>
                            <span className="text-xs text-[#8b2b22]">老阴</span>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <span className="shrink-0 text-sm font-serif text-stone-700">老阴动</span>
                            <div className="flex min-w-0 flex-1 justify-end">
                              <IntroLine type="yin" moving />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] tracking-[0.2em] text-stone-400">9</span>
                            <span className="text-xs text-[#8b2b22]">老阳</span>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <span className="shrink-0 text-sm font-serif text-stone-700">老阳动</span>
                            <div className="flex min-w-0 flex-1 justify-end">
                              <IntroLine type="yang" moving />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-center gap-2 text-[#8b2b22] sm:flex-col">
                        <span className="text-xl sm:hidden">↓</span>
                        <span className="hidden text-xl sm:inline">→</span>
                        <span className="text-[11px] tracking-[0.2em]">变</span>
                      </div>
                      <div className="space-y-3 min-w-0">
                        <div className="rounded-2xl border border-[#8b2b22]/20 bg-[#8b2b22]/6 px-3 py-3">
                          <div className="mb-2 text-[11px] tracking-[0.2em] text-stone-400">结果</div>
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <span className="shrink-0 text-sm font-serif text-stone-700">变阳</span>
                            <div className="flex min-w-0 flex-1 justify-end">
                              <IntroLine type="yang" />
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[#8b2b22]/20 bg-[#8b2b22]/6 px-3 py-3">
                          <div className="mb-2 text-[11px] tracking-[0.2em] text-stone-400">结果</div>
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <span className="shrink-0 text-sm font-serif text-stone-700">变阴</span>
                            <div className="flex min-w-0 flex-1 justify-end">
                              <IntroLine type="yin" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                      <span>少阴少阳静</span>
                      <span className="text-stone-300">·</span>
                      <span>老阴老阳动</span>
                    </div>
                  </div>
                )}
                {item.key === "reading" && (
                  <div className="space-y-4">
                    <IntroStep index="04" label="按顺序判断" />
                    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="text-[11px] tracking-[0.2em] text-stone-400">STEP 1</div>
                        <div className="mt-2 text-sm font-serif text-stone-800">本卦</div>
                        <div className="mt-1 text-xs text-stone-500">看当下</div>
                      </div>
                      <div className="text-[#8b2b22] text-lg">→</div>
                      <div className="rounded-2xl border border-[#8b2b22]/20 bg-[#8b2b22]/6 px-3 py-3">
                        <div className="text-[11px] tracking-[0.2em] text-stone-400">STEP 2</div>
                        <div className="mt-2 text-sm font-serif text-stone-800">动爻</div>
                        <div className="mt-1 text-xs text-stone-500">看关键</div>
                      </div>
                      <div className="text-[#8b2b22] text-lg">→</div>
                      <div className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                        <div className="text-[11px] tracking-[0.2em] text-stone-400">STEP 3</div>
                        <div className="mt-2 text-sm font-serif text-stone-800">变卦</div>
                        <div className="mt-1 text-xs text-stone-500">看后势</div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-stone-500">先定现状，再抓变化，最后看趋势。</div>
                  </div>
                )}
                {item.key === "relations" && (
                  <div className="space-y-4">
                    <IntroStep index="05" label="先定所问对象" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["兄弟", "同类 / 竞争"],
                        ["子孙", "结果 / 放松"],
                        ["妻财", "财物 / 资源"],
                        ["官鬼", "压力 / 工作"],
                        ["父母", "文书 / 庇护"],
                      ].map(([name, hint], idx) => (
                        <div
                          key={name}
                          className={cn(
                            "rounded-2xl border bg-white/90 px-3 py-3",
                            idx === 4 ? "col-span-2 border-[#8b2b22]/20 bg-[#8b2b22]/6" : "border-stone-200",
                          )}
                        >
                          <div className="text-sm font-serif text-stone-800">{name}</div>
                          <div className="mt-1 text-xs text-stone-500">{hint}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center text-xs text-stone-500">到结果区时，先找你问的是哪一亲，再看它旺不旺、动不动。</div>
                  </div>
                )}
                {item.key === "spirits" && (
                  <div className="space-y-4">
                    <IntroStep index="06" label="再看事情气氛" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["青龙", "顺喜"],
                        ["朱雀", "言语"],
                        ["勾陈", "拖延"],
                        ["腾蛇", "虚惊"],
                        ["白虎", "冲突"],
                        ["玄武", "隐情"],
                      ].map(([name, hint]) => (
                        <div key={name} className="rounded-2xl border border-stone-200 bg-white/90 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-serif text-stone-800">{name}</span>
                            <span className="text-xs text-stone-500">{hint}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center text-xs text-stone-500">到结果区时，再看对应那一亲带着什么气氛和表现方式。</div>
                  </div>
                )}
              </div>
              <p className="text-sm leading-7 text-stone-700 font-serif">{item.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.points.map((point) => (
                  <div
                    key={point}
                    className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-600"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["order", "coins"] as const).map((key, rowIndex) => {
          const item = basics.find((entry) => entry.key === key);
          if (!item) return null;
          const Icon = item.icon;

          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + rowIndex * 0.1 }}
              className="rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(244,241,234,0.9))] p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-stone-900 text-[#fdfbf7] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg text-stone-900">{item.title}</h3>
              </div>
              <div className="mb-4 rounded-2xl border border-stone-200 bg-[#f4f1ea]/90 px-4 py-4">
                {item.key === "order" && (
                  <div className="space-y-4">
                    <IntroStep index="07" label="从下往上读" />
                    <div className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-1 text-[#8b2b22]">
                          <span className="text-xs tracking-[0.2em]">往上读</span>
                          <span className="text-xl">↑</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "上", active: false },
                            { label: "五", active: false },
                            { label: "四", active: false },
                            { label: "三", active: false },
                            { label: "二", active: false },
                            { label: "初", active: true },
                          ].map(({ label, active }) => (
                            <div key={label} className="flex items-center gap-3">
                              <div className="w-5 text-[11px] tracking-[0.2em] text-stone-400">{label}</div>
                              <div
                                className={cn(
                                  "h-3 w-28 rounded-full border",
                                  active
                                    ? "border-[#8b2b22]/30 bg-[#8b2b22]/10"
                                    : "border-stone-200 bg-white",
                                )}
                              />
                              {active && (
                                <span className="rounded-full bg-[#8b2b22]/10 px-2 py-1 text-[11px] text-[#8b2b22]">
                                  起点
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 text-center text-xs text-stone-500">
                        初爻在最下，上爻在最上，记录和读卦都按这个方向。
                      </div>
                    </div>
                  </div>
                )}
                {item.key === "coins" && (
                  <div className="space-y-4">
                    <IntroStep index="08" label="先算出爻数" />
                    <div className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-serif text-stone-700">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <IntroCoinTriple pattern={["front", "front", "front"]} />
                              <span className="text-center text-xs text-stone-500">2 + 2 + 2</span>
                            </div>
                            <div />
                            <span className="rounded-lg bg-[#8b2b22] px-2.5 py-1 text-white">6</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <IntroCoinTriple pattern={["back", "front", "front"]} />
                              <span className="text-center text-xs text-stone-500">3 + 2 + 2</span>
                            </div>
                            <div />
                            <span className="rounded-lg bg-stone-900 px-2.5 py-1 text-white">7</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <IntroCoinTriple pattern={["back", "back", "front"]} />
                              <span className="text-center text-xs text-stone-500">3 + 3 + 2</span>
                            </div>
                            <div />
                            <span className="rounded-lg bg-stone-900 px-2.5 py-1 text-white">8</span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[#8b2b22]/20 bg-[#8b2b22]/6 px-3 py-3">
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                              <IntroCoinTriple pattern={["back", "back", "back"]} />
                              <span className="text-center text-xs text-stone-500">3 + 3 + 3</span>
                            </div>
                            <div />
                            <span className="rounded-lg bg-[#8b2b22] px-2.5 py-1 text-white">9</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-stone-500">
                        <span className="rounded-full bg-stone-100 px-2 py-1">正面 = 2</span>
                        <span className="text-stone-300">·</span>
                        <span className="rounded-full bg-stone-100 px-2 py-1">背面 = 3</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm leading-7 text-stone-700 font-serif">{item.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.points.map((point) => (
                  <div
                    key={point}
                    className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-600"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600 font-serif">
        实操提示：先想问题，再摇六次，每次生成一爻，系统会按自下而上的顺序成卦。
      </div>
    </section>
  );

  const baziBasicsSection = (
    <section className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8b2b22]/40 to-transparent" />
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#8b2b22]/20 bg-[#8b2b22]/8 flex items-center justify-center text-[#8b2b22]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif tracking-[0.2em] text-stone-900">八字入门</h2>
            <p className="mt-1 text-sm text-stone-500 font-serif">先认四柱，再看日主、月份和五行分布。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: "四柱是什么",
            icon: Layers3,
            body: "八字由年、月、日、时四柱组成，每柱各有一个天干和一个地支。",
            points: ["年柱：家世/早年", "月柱：时令/环境", "日柱：自身/婚姻核心", "时柱：晚景/子女/想法"],
          },
          {
            title: "先看日主",
            icon: CircleDot,
            body: "日柱天干叫日主，是看命盘强弱和喜忌的核心出发点。",
            points: ["甲乙属木", "丙丁属火", "戊己属土", "庚辛属金", "壬癸属水"],
          },
          {
            title: "为什么重月令",
            icon: Waypoints,
            body: "月支代表时令，决定日主处在什么季节，这会直接影响旺衰判断。",
            points: ["春木旺", "夏火旺", "秋金旺", "冬水旺", "土随四季转换起调节作用"],
          },
          {
            title: "五行怎么看",
            icon: Stars,
            body: "不能只看数量多少，还要看月份、透干、通根和生克关系。",
            points: ["多不一定旺", "少不一定弱", "先看有没有根", "再看有没有帮扶或克制"],
          },
          {
            title: "天干与地支",
            icon: GitCompareArrows,
            body: "天干偏外显，地支偏内在与环境，地支里还藏着藏干。",
            points: ["天干：表层表现", "地支：内里结构", "藏干：支中所含之气"],
          },
          {
            title: "排盘输入要点",
            icon: Users,
            body: "八字排盘最怕时间错。出生日期、时辰、历法和闰月信息要尽量准确。",
            points: ["公历/农历不要混", "闰月要单独标明", "子时和节气边界要复核", "医院记录优先于记忆"],
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className="rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(244,241,234,0.9))] p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-stone-900 text-[#fdfbf7] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg text-stone-900">{item.title}</h3>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-[#f4f1ea]/90 px-4 py-4">
                <p className="text-sm leading-7 text-stone-600">{item.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.points.map((point) => (
                    <span key={point} className="rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-xs text-stone-600">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#f4f1ea] text-stone-800 flex items-center justify-center px-6">
        <div className="glass-panel rounded-3xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#8b2b22]" />
          <p className="mt-4 font-serif tracking-[0.2em] text-stone-600">正在确认访问权限</p>
        </div>
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#f4f1ea] paper-texture text-stone-800 px-4 py-8 sm:px-6">
        <div className="max-w-3xl mx-auto min-h-[calc(100vh-4rem)] flex items-center">
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8 lg:p-10 w-full relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-48 h-48 rounded-full bg-[#8b2b22]/10 blur-[100px] pointer-events-none" />
            <div className="max-w-xl">
              <p className="text-xs tracking-[0.45em] text-[#8b2b22] mb-4">INVITE ONLY</p>
              <h1 className="text-3xl sm:text-4xl font-serif tracking-[0.2em] text-stone-900">易学</h1>
              <p className="mt-4 text-sm sm:text-base leading-8 text-stone-600 font-serif">
                当前站点已开启邀请码访问控制。输入有效邀请码后，才可进入六爻起卦与八字排盘流程。
              </p>

              <form onSubmit={handleRedeemInvite} className="mt-8 space-y-4">
                <label htmlFor="inviteCode" className="block text-xs tracking-[0.3em] text-stone-500">
                  邀请码
                </label>
                <input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="请输入邀请码"
                  className="w-full rounded-2xl border border-stone-200 bg-white/80 px-5 py-4 text-lg font-serif outline-none transition-all focus:border-[#8b2b22]/40 focus:ring-1 focus:ring-[#8b2b22]/40"
                  autoComplete="one-time-code"
                />
                {authError && <p className="text-sm text-[#8b2b22]">{authError}</p>}
                <button
                  type="submit"
                  disabled={isRedeemingInvite}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-stone-900 px-6 py-4 text-[#fdfbf7] transition-all hover:bg-stone-800 disabled:opacity-70"
                >
                  {isRedeemingInvite ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" strokeWidth={1.5} />}
                  验证邀请码
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] paper-texture text-stone-800 font-sans selection:bg-[#8b2b22]/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b2b22]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-stone-500/5 blur-[120px] pointer-events-none" />

      <header className="relative z-10 border-b border-[#e8e4d9] bg-[#fdfbf7]/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10">
              <HeaderTaijiIcon />
            </div>
            <h1 className="text-lg sm:text-xl font-serif tracking-[0.2em] text-stone-900">易学</h1>
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
                <div className="hidden sm:flex items-center rounded-full border border-stone-200 bg-white/70 p-1">
                  <button
                    type="button"
                    onClick={() => handleSelectPage("cast")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm transition-colors",
                      activePage === "cast" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                    )}
                  >
                    数术
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPage("learn")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm transition-colors",
                      activePage === "learn" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                    )}
                  >
                    入门
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500 hover:text-stone-900 text-sm"
                >
                  退出
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-16">
        
        {showHistory ? (
          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <HistoryStatsBoard history={history} />
            <HistoryView
              history={history}
              onDelete={handleDeleteHistory}
              loadDetail={loadHistoryDetail}
              onUpdateRecord={handleUpdateHistoryRecord}
            />
          </div>
        ) : (
          <>
            <div className="flex sm:hidden items-center justify-center rounded-full border border-stone-200 bg-white/70 p-1 max-w-5xl mx-auto">
              <button
                type="button"
                onClick={() => handleSelectPage("cast")}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm transition-colors",
                  activePage === "cast" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500",
                )}
              >
                数术
              </button>
              <button
                type="button"
                onClick={() => handleSelectPage("learn")}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm transition-colors",
                  activePage === "learn" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500",
                )}
              >
                入门
              </button>
            </div>

            {activePage === "cast" ? (
              <>
                <section className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex rounded-full border border-stone-200 bg-white/75 p-1">
                      <button
                        type="button"
                        onClick={() => handleSelectPractice("liuyao")}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm transition-colors",
                          activePractice === "liuyao" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                        )}
                      >
                        六爻起卦
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPractice("bazi")}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm transition-colors",
                          activePractice === "bazi" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                        )}
                      >
                        八字排盘
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (activePractice === "liuyao") {
                          setShowHistory(true);
                        }
                      }}
                      disabled={activePractice !== "liuyao"}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm transition-colors",
                        activePractice === "liuyao"
                          ? "bg-white/80 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          : "bg-white/50 text-stone-300 cursor-default",
                      )}
                    >
                      <History className="w-4 h-4" />
                      历史记录
                    </button>
                  </div>
                </section>

                {activePractice === "liuyao" ? (
                <>
                <section className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto overflow-hidden relative">
                  <div className="absolute top-[-20%] right-[-5%] h-56 w-56 rounded-full bg-[#8b2b22]/8 blur-[110px] pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-xs tracking-[0.35em] text-[#8b2b22]">DIVINATION</p>
                    <h2 className="mt-3 text-2xl sm:text-3xl font-serif tracking-[0.18em] text-stone-900">立即起卦</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 font-serif sm:text-base">
                      先写问题，再摇六次。如需教程可点击导航栏“入门”页面查看。
                    </p>
                  </div>
                </section>
                <section className="space-y-4 max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center relative">
                <button
                  onClick={reset}
                  className="absolute right-5 top-5 sm:right-6 sm:top-6 p-2.5 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500 hover:text-stone-900"
                  title="重新起卦"
                >
                  <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <div className="flex gap-4 sm:gap-6 mb-6 h-24 items-center">
                  <Coin value={coins[0]} tossRound={tossRound} delay={0} />
                  <Coin value={coins[1]} tossRound={tossRound} delay={0.1} />
                  <Coin value={coins[2]} tossRound={tossRound} delay={0.2} />
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
                </section>

                {/* Hexagram Display */}
                {lines.length > 0 && (
          <section className="glass-panel rounded-3xl p-6 sm:p-8 overflow-hidden">
            <motion.div layout className="flex flex-col lg:flex-row gap-8 lg:gap-12 justify-center">
              
              {/* 本卦 / 摇卦中 */}
              <motion.div layout className="flex flex-col items-center lg:items-start w-full lg:w-1/2 max-w-md">
                <motion.div layout className="mb-4 min-h-[4rem] w-full flex items-center justify-center text-center">
                  {hexData ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full flex-col items-center">
                      <h3 className="text-xs sm:text-sm text-stone-500 uppercase tracking-[0.3em] mb-1">本卦</h3>
                      <p className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-widest">{hexData.originalName}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-h-[4rem] w-full flex-col items-center justify-center text-center"
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#8b2b22]/15 bg-white/65 px-4 py-1.5 text-sm sm:text-base font-serif tracking-[0.2em] text-stone-700 shadow-sm">
                        <span>起卦中</span>
                        <span className="flex items-center gap-1">
                          {[0, 1, 2].map((dot) => (
                            <motion.span
                              key={dot}
                              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.18, ease: "easeInOut" }}
                              className="h-1 w-1 rounded-full bg-[#8b2b22]/60"
                            />
                          ))}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] sm:text-xs tracking-[0.25em] text-stone-400">
                        第 {Math.min(lines.length + 1, 6)} 爻生成中
                      </p>
                      <p className="mt-1 text-[11px] sm:text-xs tracking-[0.2em] text-stone-400/90">
                        已成 {lines.length} / 6 爻
                      </p>
                    </motion.div>
                  )}
                </motion.div>
                
                {hexData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6 min-h-[6.5rem] text-stone-700 font-serif leading-relaxed text-sm bg-stone-100/50 p-4 rounded-2xl border border-stone-200 w-full">
                    <span className="text-[#8b2b22] mr-2 font-bold">卦辞:</span>
                    {getGuaci(hexData.originalBinary)}
                  </motion.div>
                )}

                {hexData && (
                  <div className="mb-2 flex items-center justify-center gap-2 w-full">
                    <div className="grid w-full max-w-[24rem] grid-cols-[2.5rem_minmax(0,1fr)_2.8rem_2.8rem_3rem] items-center gap-1.5 px-1 text-[10px] tracking-[0.18em] text-stone-400 sm:max-w-[29rem] sm:grid-cols-[3rem_minmax(0,1fr)_3.5rem_3.5rem_3.75rem] sm:gap-2 sm:text-xs">
                      <span className="text-right">爻位</span>
                      <span className="text-center">爻象</span>
                      <span className="text-center">六亲</span>
                      <span className="text-center">六神</span>
                      <span className="text-center">纳甲</span>
                    </div>
                    <div className="w-10 sm:w-12 text-center text-[10px] tracking-[0.18em] text-stone-400 sm:text-xs">
                      经卦
                    </div>
                  </div>
                )}
                <div className="flex items-stretch justify-center gap-2 w-full">
                  <motion.div layout className="flex flex-col-reverse items-center justify-center py-2 w-full max-w-[24rem] sm:max-w-[29rem]">
                    {(hexData ? hexData.originalLines : lines.map((line, i) => createHexagramLineDetail(line, i))).map((line) => (
                      <HexagramLine key={line.index} line={line} />
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
                    <TrigramBraceColumn upper={hexData.originalTrigrams.upper} lower={hexData.originalTrigrams.lower} />
                  )}
                </div>

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
                      <div className="mb-4 min-h-[4rem] w-full flex flex-col items-center justify-center text-center">
                        <h3 className="text-xs sm:text-sm text-stone-500 uppercase tracking-[0.3em] mb-1">变卦</h3>
                        <p className="text-3xl sm:text-4xl font-serif text-[#8b2b22] tracking-widest">{hexData.changedName}</p>
                      </div>
                      
                      <div className="mb-6 min-h-[6.5rem] text-stone-700 font-serif leading-relaxed text-sm bg-stone-100/50 p-4 rounded-2xl border border-stone-200 w-full">
                        <span className="text-[#8b2b22] mr-2 font-bold">卦辞:</span>
                        {getGuaci(hexData.changedBinary)}
                      </div>

                      <div className="mb-2 flex items-center justify-center gap-2 w-full">
                        <div className="grid w-full max-w-[24rem] grid-cols-[2.5rem_minmax(0,1fr)_2.8rem_2.8rem_3rem] items-center gap-1.5 px-1 text-[10px] tracking-[0.18em] text-stone-400 sm:max-w-[29rem] sm:grid-cols-[3rem_minmax(0,1fr)_3.5rem_3.5rem_3.75rem] sm:gap-2 sm:text-xs">
                          <span className="text-right">爻位</span>
                          <span className="text-center">爻象</span>
                          <span className="text-center">六亲</span>
                          <span className="text-center">六神</span>
                          <span className="text-center">纳甲</span>
                        </div>
                        <div className="w-10 sm:w-12 text-center text-[10px] tracking-[0.18em] text-stone-400 sm:text-xs">
                          经卦
                        </div>
                      </div>
                      <div className="flex items-stretch justify-center gap-2 w-full">
                        <div className="flex flex-col-reverse items-center justify-center py-2 w-full max-w-[24rem] sm:max-w-[29rem]">
                          {hexData.changedLines.map((line) => (
                            <HexagramLine key={`changed-${line.index}`} line={line} />
                          ))}
                        </div>
                        <TrigramBraceColumn upper={hexData.changedTrigrams.upper} lower={hexData.changedTrigrams.lower} />
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
            {hexData && !basicInterpretation && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex justify-center pt-8 border-t border-stone-200 mt-8"
              >
                <button
                  onClick={() => handleInterpret("basic")}
                  disabled={isInterpretingStage !== null}
                  className="flex items-center justify-center gap-3 bg-stone-800 hover:bg-stone-900 text-[#fdfbf7] py-4 px-12 rounded-2xl font-medium transition-all disabled:opacity-70 active:scale-[0.98] shadow-[0_0_20px_rgba(44,40,37,0.1)] hover:shadow-[0_0_30px_rgba(44,40,37,0.2)]"
                >
                  {isInterpretingStage === "basic" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      解卦中，请耐心等候
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
                {basicInterpretation !== null && !showHistory && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-3xl p-6 sm:p-8 max-w-none"
                  >
                    <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                      <div className="text-sm font-serif text-stone-700">阅读方式</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">先看浅显解读：结论与建议</span>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">再决定是否继续深度解卦</span>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1">深度版会详细解释卦辞、爻辞与推演依据</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white/70 px-5 py-5">
                      <div className="mb-3 text-sm font-serif tracking-[0.22em] text-[#8b2b22]">浅显解读</div>
                      <div className="markdown-body font-serif leading-relaxed text-stone-800 prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                        {parsedBasicInterpretation.answer ? (
                          <Markdown>{parsedBasicInterpretation.answer}</Markdown>
                        ) : parsedBasicInterpretation.reasoning ? (
                          <p className="text-stone-500">
                            {parsedBasicInterpretation.isReasoningPending ? "正在整理浅显解读..." : "正在接收浅显解读..."}
                          </p>
                        ) : (
                          <p className="text-stone-500">正在接收浅显解读...</p>
                        )}
                      </div>
                    </div>

                    {parsedBasicInterpretation.reasoning && (
                      <details className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                        <summary className="cursor-pointer text-sm text-stone-600 select-none">查看浅显解读依据</summary>
                        <div className="mt-4 markdown-body font-serif leading-relaxed text-stone-700 prose prose-stone prose-base max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                          <Markdown>{parsedBasicInterpretation.reasoning}</Markdown>
                        </div>
                      </details>
                    )}

                    {!deepInterpretation && (
                      <div className="mt-6 rounded-2xl border border-[#8b2b22]/15 bg-[#8b2b22]/5 px-5 py-5">
                        <div className="text-sm font-serif text-stone-800">继续看深一层的解释</div>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          第二次深度解卦会更详细解释卦辞、爻辞、动爻与变卦之间的关系，以及为什么会得出当前判断。
                        </p>
                        <button
                          onClick={() => handleInterpret("deep")}
                          disabled={isInterpretingStage !== null}
                          className="mt-4 inline-flex items-center justify-center gap-3 rounded-2xl bg-[#8b2b22] px-5 py-3 text-sm text-white transition-all disabled:opacity-70"
                        >
                          {isInterpretingStage === "deep" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              深度解卦中
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                              继续深度解卦
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {deepInterpretation !== null && (
                      <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 px-5 py-5">
                        <div className="mb-3 text-sm font-serif tracking-[0.22em] text-[#8b2b22]">深度解读</div>
                        <div className="markdown-body font-serif leading-relaxed text-stone-800 prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                          {parsedDeepInterpretation.answer ? (
                            <Markdown>{parsedDeepInterpretation.answer}</Markdown>
                          ) : parsedDeepInterpretation.reasoning ? (
                            <p className="text-stone-500">
                              {parsedDeepInterpretation.isReasoningPending ? "正在整理深度解读..." : "正在接收深度解读..."}
                            </p>
                          ) : (
                            <p className="text-stone-500">正在接收深度解读...</p>
                          )}
                        </div>

                        {parsedDeepInterpretation.reasoning && (
                          <details className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                            <summary className="cursor-pointer text-sm text-stone-600 select-none">查看深度解卦依据</summary>
                            <div className="mt-4 markdown-body font-serif leading-relaxed text-stone-700 prose prose-stone prose-base max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                              <Markdown>{parsedDeepInterpretation.reasoning}</Markdown>
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {deepInterpretation !== null && !technicalInterpretation && (
                      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5">
                        <div className="text-sm font-serif text-stone-800">想看术数细节？</div>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          术数细读只面向想继续深挖的用户，会展开六亲、六神、纳甲这些更细的判断依据，不默认展示。
                        </p>
                        <button
                          onClick={() => handleInterpret("technical")}
                          disabled={isInterpretingStage !== null}
                          className="mt-4 inline-flex items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm text-stone-700 transition-all disabled:opacity-70"
                        >
                          {isInterpretingStage === "technical" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              术数细读中
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                              查看术数细读
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {technicalInterpretation !== null && (
                      <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 px-5 py-5">
                        <div className="mb-3 text-sm font-serif tracking-[0.22em] text-[#8b2b22]">术数细读</div>
                        <div className="markdown-body font-serif leading-relaxed text-stone-800 prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                          {parsedTechnicalInterpretation.answer ? (
                            <Markdown>{parsedTechnicalInterpretation.answer}</Markdown>
                          ) : parsedTechnicalInterpretation.reasoning ? (
                            <p className="text-stone-500">
                              {parsedTechnicalInterpretation.isReasoningPending ? "正在整理术数细读..." : "正在接收术数细读..."}
                            </p>
                          ) : (
                            <p className="text-stone-500">正在接收术数细读...</p>
                          )}
                        </div>

                        {parsedTechnicalInterpretation.reasoning && (
                          <details className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                            <summary className="cursor-pointer text-sm text-stone-600 select-none">查看术数细读依据</summary>
                            <div className="mt-4 markdown-body font-serif leading-relaxed text-stone-700 prose prose-stone prose-base max-w-none prose-headings:font-serif prose-headings:font-normal prose-a:text-[#8b2b22] prose-strong:text-[#6b1e16] prose-strong:font-normal">
                              <Markdown>{parsedTechnicalInterpretation.reasoning}</Markdown>
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {currentInterpretationRecordId && (
                      <div className="mt-6 grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <div className="text-xs tracking-[0.2em] text-stone-500">给这次问题标个主题</div>
                          <select
                            value={currentHistoryRecord?.topic || "未分类"}
                            onChange={(event) =>
                              handleUpdateHistoryRecord(currentInterpretationRecordId, {
                                topic: event.target.value as DivinationTopic,
                              })
                            }
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
                          <div className="text-xs tracking-[0.2em] text-stone-500">后续结果先记一下</div>
                          <select
                            value={currentHistoryRecord?.outcomeTag || "待观察"}
                            onChange={(event) =>
                              handleUpdateHistoryRecord(currentInterpretationRecordId, {
                                outcomeTag: event.target.value as DivinationOutcomeTag,
                              })
                            }
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
                            value={currentHistoryRecord?.outcomeNote || ""}
                            onChange={(event) =>
                              handleUpdateHistoryRecord(currentInterpretationRecordId, {
                                outcomeNote: event.target.value,
                              })
                            }
                            rows={3}
                            placeholder="例如：一个月后项目推进了，但比预期慢。"
                            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-700 outline-none"
                          />
                        </label>
                      </div>
                    )}

                    {personalHexagramInsights && (
                      <div className="mt-6 rounded-2xl border border-[#8b2b22]/15 bg-[linear-gradient(180deg,rgba(139,43,34,0.05),rgba(255,255,255,0.9))] px-5 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-serif tracking-[0.22em] text-[#8b2b22]">同卦参考</div>
                            <p className="mt-2 text-sm leading-7 text-stone-600">只统计你自己的历史记录，不含其他用户数据。</p>
                          </div>
                          <div className="rounded-full border border-[#8b2b22]/15 bg-white px-3 py-1 text-xs text-[#8b2b22]">
                            {hexData?.originalName}
                            {hexData && hexData.movingLines.length > 0 ? ` → ${hexData.changedName}` : "（无变卦）"}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                            <div className="text-[11px] tracking-[0.2em] text-stone-400">同本卦</div>
                            <div className="mt-2 text-2xl font-serif text-stone-900">{personalHexagramInsights.sameOriginal.length}</div>
                            <div className="mt-1 text-xs text-stone-500">本卦相同</div>
                          </div>
                          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                            <div className="text-[11px] tracking-[0.2em] text-stone-400">同本卦 + 变卦</div>
                            <div className="mt-2 text-2xl font-serif text-stone-900">{personalHexagramInsights.samePair.length}</div>
                            <div className="mt-1 text-xs text-stone-500">走势结构相同</div>
                          </div>
                          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                            <div className="text-[11px] tracking-[0.2em] text-stone-400">完全同局</div>
                            <div className="mt-2 text-2xl font-serif text-stone-900">{personalHexagramInsights.sameSignature.length}</div>
                            <div className="mt-1 text-xs text-stone-500">动爻位置也相同</div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                            <div className="text-sm font-serif text-stone-800">最近相似记录</div>
                            {personalHexagramInsights.recentCases.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {personalHexagramInsights.recentCases.map((item) => (
                                  <div key={item.id} className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-3">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                                      <span>{formatHistoryDate(item.date)}</span>
                                      <span className="h-1 w-1 rounded-full bg-stone-300" />
                                      <span>{item.topic}</span>
                                      <span className="h-1 w-1 rounded-full bg-stone-300" />
                                      <span>{item.outcomeTag}</span>
                                    </div>
                                    <div className="mt-2 text-sm font-serif text-stone-800">{item.question}</div>
                                    {item.outcomeNote && (
                                      <div className="mt-2 text-xs leading-6 text-stone-500">{item.outcomeNote}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-stone-500">你还没有更早的同类记录。之后多回填几次，会慢慢出现自己的样本。</p>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                              <div className="text-sm font-serif text-stone-800">主题分布</div>
                              {personalHexagramInsights.topicBreakdown.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {personalHexagramInsights.topicBreakdown.map(([topic, count]) => (
                                    <div key={topic} className="flex items-center justify-between rounded-xl bg-stone-50/70 px-3 py-2 text-sm text-stone-700">
                                      <span>{topic}</span>
                                      <span>{count} 次</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-stone-500">先给历史问题补主题，这里才会开始成形。</p>
                              )}
                            </div>
                            <div className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-4">
                              <div className="text-sm font-serif text-stone-800">结果回看</div>
                              {personalHexagramInsights.outcomeBreakdown.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {personalHexagramInsights.outcomeBreakdown.map(([outcome, count]) => (
                                    <div key={outcome} className="flex items-center justify-between rounded-xl bg-stone-50/70 px-3 py-2 text-sm text-stone-700">
                                      <span>{outcome}</span>
                                      <span>{count} 次</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-stone-500">回填“应验 / 未应验”后，这里会形成你自己的卦象反馈统计。</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.section>
                )}
              </>
                ) : (
                  <>
                  <section className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto overflow-hidden relative">
                    <div className="absolute top-[-20%] right-[-5%] h-56 w-56 rounded-full bg-[#8b2b22]/8 blur-[110px] pointer-events-none" />
                    <div className="relative z-10">
                      <p className="text-xs tracking-[0.35em] text-[#8b2b22]">BAZI</p>
                      <h2 className="mt-3 text-2xl sm:text-3xl font-serif tracking-[0.18em] text-stone-900">八字排盘</h2>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 font-serif sm:text-base">
                        根据命主信息、历法方式、出生时间与性别，直接排出四柱八字。
                      </p>
                    </div>
                  </section>
                  <section className="space-y-4 max-w-5xl mx-auto">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <section className="glass-panel rounded-3xl p-5 sm:p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2 sm:col-span-2">
                            <div className="text-xs tracking-[0.2em] text-stone-500">命主信息</div>
                            <input
                              value={baziName}
                              onChange={(event) => setBaziName(event.target.value)}
                              placeholder="例如：王某 / 小名 / 匿名命主"
                              className="w-full rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 font-serif text-stone-900 outline-none transition-all focus:border-[#8b2b22]/40 focus:ring-1 focus:ring-[#8b2b22]/40"
                            />
                          </label>

                          <div className="space-y-2">
                            <div className="text-xs tracking-[0.2em] text-stone-500">命主性别</div>
                            <div className="flex rounded-2xl border border-stone-200 bg-white/70 p-1">
                              <button
                                type="button"
                                onClick={() => setBaziGender("male")}
                                className={cn("flex-1 rounded-xl px-4 py-2 text-sm transition-colors", baziGender === "male" ? "bg-stone-900 text-white" : "text-stone-500")}
                              >
                                男命
                              </button>
                              <button
                                type="button"
                                onClick={() => setBaziGender("female")}
                                className={cn("flex-1 rounded-xl px-4 py-2 text-sm transition-colors", baziGender === "female" ? "bg-stone-900 text-white" : "text-stone-500")}
                              >
                                女命
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs tracking-[0.2em] text-stone-500">起盘方式</div>
                            <div className="flex rounded-2xl border border-stone-200 bg-white/70 p-1">
                              <button
                                type="button"
                                onClick={() => setBaziCalendarType("solar")}
                                className={cn("flex-1 rounded-xl px-4 py-2 text-sm transition-colors", baziCalendarType === "solar" ? "bg-stone-900 text-white" : "text-stone-500")}
                              >
                                公历
                              </button>
                              <button
                                type="button"
                                onClick={() => setBaziCalendarType("lunar")}
                                className={cn("flex-1 rounded-xl px-4 py-2 text-sm transition-colors", baziCalendarType === "lunar" ? "bg-stone-900 text-white" : "text-stone-500")}
                              >
                                农历
                              </button>
                            </div>
                          </div>

                          {baziCalendarType === "solar" ? (
                            <div className="space-y-2 sm:col-span-2">
                              <div className="text-xs tracking-[0.2em] text-stone-500">公历出生日期</div>
                              <div className="grid grid-cols-4 gap-3">
                                <WheelColumn label="年" value={solarPickerValue.year} options={SOLAR_YEAR_OPTIONS} onChange={(value) => updateSolarPicker({ year: value })} formatOption={(value) => `${value}年`} />
                                <WheelColumn label="月" value={solarPickerValue.month} options={MONTH_OPTIONS} onChange={(value) => updateSolarPicker({ month: value })} formatOption={(value) => `${value}月`} />
                                <WheelColumn label="日" value={solarPickerValue.day} options={solarDayOptions} onChange={(value) => updateSolarPicker({ day: value })} formatOption={(value) => `${value}日`} />
                                <TimeWheelPicker hour={timePickerValue.hour} onHourChange={(value) => updateTimePicker({ hour: value })} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2 sm:col-span-2">
                                <div className="text-xs tracking-[0.2em] text-stone-500">农历出生日期</div>
                                <div className="grid grid-cols-4 gap-3">
                                  <WheelColumn label="年" value={lunarPickerValue.year} options={LUNAR_YEAR_OPTIONS} onChange={(value) => setBaziLunarYear(String(value))} formatOption={(value) => `${value}年`} />
                                  <WheelColumn label="月" value={lunarPickerValue.month} options={MONTH_OPTIONS} onChange={(value) => setBaziLunarMonth(String(value))} formatOption={(value) => `${value}月`} />
                                  <WheelColumn label="日" value={lunarPickerValue.day} options={DAY_OPTIONS.slice(0, 30)} onChange={(value) => setBaziLunarDay(String(value))} formatOption={(value) => `${value}日`} />
                                  <TimeWheelPicker hour={timePickerValue.hour} onHourChange={(value) => updateTimePicker({ hour: value })} />
                                </div>
                              </div>
                              <label className="inline-flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-700">
                                <input
                                  type="checkbox"
                                  checked={baziLeapMonth}
                                  onChange={(event) => setBaziLeapMonth(event.target.checked)}
                                  className="h-4 w-4 rounded border-stone-300 text-[#8b2b22] focus:ring-[#8b2b22]/40"
                                />
                                该月为闰月
                              </label>
                            </>
                          )}

                        </div>
                      </section>

                      <section className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                          <div className="text-xs tracking-[0.25em] text-[#8b2b22]">INPUT NOTE</div>
                          <h3 className="mt-2 text-xl font-serif tracking-[0.16em] text-stone-900">录入说明</h3>
                          <div className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                            <p>起盘方式按“公历 / 农历”录入。你原始需求里写了“农历或阴历”，两者是同义词，因此这里按实际可用的双模式实现。</p>
                            <p>农历模式会先换算为公历，再按北京时间排四柱。</p>
                            <p>如果出生时刻刚好贴近节气或子时换日，建议以专业万年历再交叉核一次。</p>
                          </div>
                        </div>

                        <div className="mt-6">
                          {baziError && <p className="mb-3 text-sm text-[#8b2b22]">{baziError}</p>}
                          <button
                            type="button"
                            onClick={handleGenerateBazi}
                            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-stone-900 px-6 py-3 text-white transition-all hover:bg-stone-800"
                          >
                            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                            开始排盘
                          </button>
                        </div>
                      </section>
                    </div>

                    {baziChart && <BaziChartView chart={baziChart} />}
                  </section>
                  </>
                )}
              </>
            ) : (
              <>
                <section className="max-w-5xl mx-auto">
                  <div className="inline-flex rounded-full border border-stone-200 bg-white/75 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveGuide("liuyao")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm transition-colors",
                        activeGuide === "liuyao" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                      )}
                    >
                      起卦入门
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuide("bazi")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm transition-colors",
                        activeGuide === "bazi" ? "bg-stone-900 text-[#fdfbf7]" : "text-stone-500 hover:text-stone-900",
                      )}
                    >
                      排盘入门
                    </button>
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-5xl mx-auto overflow-hidden relative">
                  <div className="absolute top-[-20%] right-[-5%] h-56 w-56 rounded-full bg-stone-500/8 blur-[110px] pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-xs tracking-[0.35em] text-[#8b2b22]">GUIDE</p>
                    <h2 className="mt-3 text-2xl sm:text-3xl font-serif tracking-[0.18em] text-stone-900">
                      {activeGuide === "liuyao" ? "六爻入门" : "八字入门"}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 font-serif sm:text-base">
                      {activeGuide === "liuyao"
                        ? "本教程包含六爻最关键的基础概念。提问和摇卦可点击导航栏“数术”。"
                        : "本教程包含八字排盘最基础的阅读方式，先建立四柱与五行的基本认识。"}
                    </p>
                  </div>
                </section>
                {activeGuide === "liuyao" ? basicsSection : baziBasicsSection}
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
