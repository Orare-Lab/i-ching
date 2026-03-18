import { BaziCalendarType, BaziChart, BaziGender, BaziPillar } from "../types";

const SHANGHAI_OFFSET = "+08:00";
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const;
const STEM_ELEMENTS: Record<string, string> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};
const BRANCH_ELEMENTS: Record<string, string> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};
const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};
const LUNAR_MONTH_NAMES: Record<string, number> = {
  正月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  冬月: 11,
  腊月: 12,
};

export interface BuildBaziChartInput {
  name: string;
  gender: BaziGender;
  calendarType: BaziCalendarType;
  solarDate?: string;
  solarTime: string;
  lunarYear?: number;
  lunarMonth?: number;
  lunarDay?: number;
  lunarLeapMonth?: boolean;
}

interface LunarDateParts {
  year: number;
  yearPillar: string;
  month: number;
  day: number;
  isLeapMonth: boolean;
  displayText: string;
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function buildBaziChart(input: BuildBaziChartInput): BaziChart {
  const birthDate = resolveBirthDate(input);
  const localParts = getLocalDateParts(birthDate);
  const lunarParts = getLunarDateParts(birthDate);

  const yearPillar = getYearPillar(localParts);
  const monthPillar = getMonthPillar(localParts, yearPillar.stem);
  const dayPillar = getDayPillar(localParts);
  const hourPillar = getHourPillar(localParts.hour, dayPillar.stem);

  return {
    name: input.name.trim(),
    gender: input.gender,
    calendarType: input.calendarType,
    solarDateText: formatSolarDateText(localParts),
    lunarDateText: lunarParts.displayText,
    zodiac: yearPillar.animal,
    dayMaster: dayPillar.stem,
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    elementCounts: countVisibleElements([yearPillar, monthPillar, dayPillar, hourPillar]),
    warnings: [
      "月柱按北京时间的常用节令交接日近似计算，节气交界前后一天建议人工复核。",
      "当前排盘未换算真太阳时，极端经度差场景可能存在小时柱偏差。",
      "23:00-00:59 子时按当日处理，如你采用子初换日流派，请再核对一次。",
    ],
  };
}

function resolveBirthDate(input: BuildBaziChartInput): Date {
  if (!input.solarTime) {
    throw new Error("请选择出生时间。");
  }

  if (input.calendarType === "solar") {
    if (!input.solarDate) {
      throw new Error("请选择公历出生日期。");
    }
    return buildDate(input.solarDate, input.solarTime);
  }

  if (!input.lunarYear || !input.lunarMonth || !input.lunarDay) {
    throw new Error("请完整填写农历出生年月日。");
  }

  const matchedDate = findSolarDateForLunarDate({
    year: input.lunarYear,
    month: input.lunarMonth,
    day: input.lunarDay,
    isLeapMonth: Boolean(input.lunarLeapMonth),
  });

  return buildDate(matchedDate, input.solarTime);
}

function buildDate(date: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const value = new Date(`${date}T${normalizedTime}${SHANGHAI_OFFSET}`);
  if (Number.isNaN(value.getTime())) {
    throw new Error("出生日期或时间格式不正确。");
  }
  return value;
}

function findSolarDateForLunarDate(target: {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}) {
  const start = new Date(`${target.year}-01-01T12:00:00${SHANGHAI_OFFSET}`);
  const end = new Date(`${target.year + 1}-03-01T12:00:00${SHANGHAI_OFFSET}`);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const lunarParts = getLunarDateParts(cursor);
    if (
      lunarParts.year === target.year &&
      lunarParts.month === target.month &&
      lunarParts.day === target.day &&
      lunarParts.isLeapMonth === target.isLeapMonth
    ) {
      return formatIsoDate(getLocalDateParts(cursor));
    }
  }

  throw new Error("未找到对应的农历日期，请检查月份、日期和闰月选择。");
}

function getLunarDateParts(date: Date): LunarDateParts {
  const text = new Intl.DateTimeFormat("zh-Hans-CN-u-ca-chinese", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const match = text.match(/^(\d{4})([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年(闰?[^0-9]+?)(\d{1,2})$/);
  if (!match) {
    throw new Error(`无法解析农历日期：${text}`);
  }

  const [, yearText, yearPillar, monthTextRaw, dayText] = match;
  const isLeapMonth = monthTextRaw.startsWith("闰");
  const monthText = isLeapMonth ? monthTextRaw.slice(1) : monthTextRaw;
  const month = LUNAR_MONTH_NAMES[monthText];

  if (!month) {
    throw new Error(`暂不支持解析农历月份：${monthTextRaw}`);
  }

  return {
    year: Number(yearText),
    yearPillar,
    month,
    day: Number(dayText),
    isLeapMonth,
    displayText: `${yearText}年${monthTextRaw}${dayText}日`,
  };
}

function getLocalDateParts(date: Date): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function getYearPillar(localParts: LocalDateParts) {
  const year = getBaziYear(localParts);
  const stemIndex = mod(year - 4, 10);
  const branchIndex = mod(year - 4, 12);
  return createPillar(stemIndex, branchIndex);
}

function getBaziYear(localParts: LocalDateParts) {
  const marker = localParts.month * 100 + localParts.day;
  return marker < 204 ? localParts.year - 1 : localParts.year;
}

function getMonthPillar(localParts: LocalDateParts, yearStem: string) {
  const monthBranchIndex = getMonthBranchIndex(localParts);
  const monthOffset = mod(monthBranchIndex - 2, 12);
  const stemStart = getYinMonthStemStartIndex(yearStem);
  const stemIndex = mod(stemStart + monthOffset, 10);
  return createPillar(stemIndex, monthBranchIndex);
}

function getMonthBranchIndex(localParts: LocalDateParts) {
  const marker = localParts.month * 100 + localParts.day;

  if (marker >= 204 && marker < 306) return 2;
  if (marker >= 306 && marker < 405) return 3;
  if (marker >= 405 && marker < 506) return 4;
  if (marker >= 506 && marker < 606) return 5;
  if (marker >= 606 && marker < 707) return 6;
  if (marker >= 707 && marker < 808) return 7;
  if (marker >= 808 && marker < 908) return 8;
  if (marker >= 908 && marker < 1008) return 9;
  if (marker >= 1008 && marker < 1107) return 10;
  if (marker >= 1107 && marker < 1207) return 11;
  if (marker >= 1207 || marker < 106) return 0;
  return 1;
}

function getYinMonthStemStartIndex(yearStem: string) {
  if (yearStem === "甲" || yearStem === "己") return 2;
  if (yearStem === "乙" || yearStem === "庚") return 4;
  if (yearStem === "丙" || yearStem === "辛") return 6;
  if (yearStem === "丁" || yearStem === "壬") return 8;
  return 0;
}

function getDayPillar(localParts: LocalDateParts) {
  const reference = new Date(`1984-02-02T12:00:00${SHANGHAI_OFFSET}`);
  const current = new Date(`${formatIsoDate(localParts)}T12:00:00${SHANGHAI_OFFSET}`);
  const diffDays = Math.round((current.getTime() - reference.getTime()) / 86_400_000);
  const index = mod(diffDays, 60);
  return createPillar(index % 10, index % 12);
}

function getHourPillar(hour: number, dayStem: string) {
  const hourBranchIndex = Math.floor(mod(hour + 1, 24) / 2);
  const stemStart = getZiHourStemStartIndex(dayStem);
  const stemIndex = mod(stemStart + hourBranchIndex, 10);
  return createPillar(stemIndex, hourBranchIndex);
}

function getZiHourStemStartIndex(dayStem: string) {
  if (dayStem === "甲" || dayStem === "己") return 0;
  if (dayStem === "乙" || dayStem === "庚") return 2;
  if (dayStem === "丙" || dayStem === "辛") return 4;
  if (dayStem === "丁" || dayStem === "壬") return 6;
  return 8;
}

function createPillar(stemIndex: number, branchIndex: number): BaziPillar {
  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];
  return {
    stem,
    branch,
    label: `${stem}${branch}`,
    stemElement: STEM_ELEMENTS[stem],
    branchElement: BRANCH_ELEMENTS[branch],
    hiddenStems: BRANCH_HIDDEN_STEMS[branch],
    animal: ANIMALS[branchIndex],
  };
}

function countVisibleElements(pillars: BaziPillar[]) {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((pillar) => {
    counts[pillar.stemElement] += 1;
    counts[pillar.branchElement] += 1;
  });
  return counts;
}

function formatSolarDateText(localParts: LocalDateParts) {
  return `${localParts.year}年${pad(localParts.month)}月${pad(localParts.day)}日 ${pad(localParts.hour)}:${pad(localParts.minute)}`;
}

function formatIsoDate(localParts: Pick<LocalDateParts, "year" | "month" | "day">) {
  return `${localParts.year}-${pad(localParts.month)}-${pad(localParts.day)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function mod(value: number, base: number) {
  return ((value % base) + base) % base;
}
