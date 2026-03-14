import { LineValue } from "../data/hexagrams";

export type FiveElement = "金" | "木" | "水" | "火" | "土";
export type EarthlyBranch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type HeavenlyStem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type SixRelative = "兄弟" | "子孙" | "妻财" | "官鬼" | "父母";
export type SixSpirit = "青龙" | "朱雀" | "勾陈" | "腾蛇" | "白虎" | "玄武";
export type WorldResponseRole = "世" | "应";
export type AnnotationResolution = "resolved" | "pending" | "needs_context";

export interface LineAnnotationStatus {
  naJia: AnnotationResolution;
  sixRelative: AnnotationResolution;
  sixSpirit: AnnotationResolution;
  worldResponse: AnnotationResolution;
}

export interface HexagramLineAnnotation {
  heavenlyStem: HeavenlyStem | null;
  earthlyBranch: EarthlyBranch | null;
  element: FiveElement | null;
  sixRelative: SixRelative | null;
  sixSpirit: SixSpirit | null;
  worldResponse: WorldResponseRole | null;
  status: LineAnnotationStatus;
}

export interface HexagramComputationContext {
  dayStem?: HeavenlyStem | null;
}

const STEMS: HeavenlyStem[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const SIX_SPIRIT_ORDER: SixSpirit[] = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];

const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = {
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

const PALACE_ELEMENTS: Record<string, FiveElement> = {
  乾: "金",
  兑: "金",
  离: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土",
};

const PALACE_BY_BINARY: Record<string, keyof typeof PALACE_ELEMENTS> = {
  "111111": "乾",
  "011111": "乾",
  "001111": "乾",
  "000111": "乾",
  "000011": "乾",
  "000001": "乾",
  "000101": "乾",
  "111101": "乾",
  "110110": "兑",
  "010110": "兑",
  "000110": "兑",
  "001110": "兑",
  "001010": "兑",
  "001000": "兑",
  "001100": "兑",
  "110100": "兑",
  "101101": "离",
  "001101": "离",
  "011101": "离",
  "010101": "离",
  "010001": "离",
  "010011": "离",
  "010111": "离",
  "101111": "离",
  "100100": "震",
  "000100": "震",
  "010100": "震",
  "011100": "震",
  "011000": "震",
  "011010": "震",
  "011110": "震",
  "100110": "震",
  "011011": "巽",
  "111011": "巽",
  "101011": "巽",
  "100011": "巽",
  "100111": "巽",
  "100101": "巽",
  "100001": "巽",
  "011001": "巽",
  "010010": "坎",
  "110010": "坎",
  "100010": "坎",
  "101010": "坎",
  "101110": "坎",
  "101100": "坎",
  "101000": "坎",
  "010000": "坎",
  "001001": "艮",
  "101001": "艮",
  "111001": "艮",
  "110001": "艮",
  "110101": "艮",
  "110111": "艮",
  "110011": "艮",
  "001011": "艮",
  "000000": "坤",
  "100000": "坤",
  "110000": "坤",
  "111000": "坤",
  "111100": "坤",
  "111110": "坤",
  "111010": "坤",
  "000010": "坤",
};

const TRIGRAM_NA_JIA: Record<string, { innerStem: HeavenlyStem; innerBranches: EarthlyBranch[]; outerStem: HeavenlyStem; outerBranches: EarthlyBranch[] }> = {
  乾: { innerStem: "甲", innerBranches: ["子", "寅", "辰"], outerStem: "壬", outerBranches: ["午", "申", "戌"] },
  震: { innerStem: "庚", innerBranches: ["子", "寅", "辰"], outerStem: "庚", outerBranches: ["午", "申", "戌"] },
  坎: { innerStem: "戊", innerBranches: ["寅", "辰", "午"], outerStem: "戊", outerBranches: ["申", "戌", "子"] },
  艮: { innerStem: "丙", innerBranches: ["辰", "午", "申"], outerStem: "丙", outerBranches: ["戌", "子", "寅"] },
  坤: { innerStem: "乙", innerBranches: ["未", "巳", "卯"], outerStem: "癸", outerBranches: ["丑", "亥", "酉"] },
  兑: { innerStem: "丁", innerBranches: ["巳", "卯", "丑"], outerStem: "丁", outerBranches: ["亥", "酉", "未"] },
  离: { innerStem: "己", innerBranches: ["卯", "丑", "亥"], outerStem: "己", outerBranches: ["酉", "未", "巳"] },
  巽: { innerStem: "辛", innerBranches: ["丑", "亥", "酉"], outerStem: "辛", outerBranches: ["未", "巳", "卯"] },
};

interface NaJiaAssignment {
  heavenlyStem: HeavenlyStem | null;
  earthlyBranch: EarthlyBranch | null;
  element: FiveElement | null;
}

function createPendingAnnotation(context: HexagramComputationContext = {}): HexagramLineAnnotation {
  return {
    heavenlyStem: null,
    earthlyBranch: null,
    element: null,
    sixRelative: null,
    sixSpirit: null,
    worldResponse: null,
    status: {
      naJia: "pending",
      sixRelative: "pending",
      sixSpirit: context.dayStem ? "pending" : "needs_context",
      worldResponse: "pending",
    },
  };
}

function computeNaJiaAssignments(_binary: string, lineCount: number): NaJiaAssignment[] {
  const lowerBinary = _binary.slice(0, 3);
  const upperBinary = _binary.slice(3);
  const lowerTrigram = getTrigramName(lowerBinary);
  const upperTrigram = getTrigramName(upperBinary);

  if (!lowerTrigram || !upperTrigram) {
    return Array.from({ length: lineCount }, () => ({
      heavenlyStem: null,
      earthlyBranch: null,
      element: null,
    }));
  }

  const lower = TRIGRAM_NA_JIA[lowerTrigram];
  const upper = TRIGRAM_NA_JIA[upperTrigram];

  return [
    ...lower.innerBranches.map((branch) => ({
      heavenlyStem: lower.innerStem,
      earthlyBranch: branch,
      element: BRANCH_ELEMENTS[branch],
    })),
    ...upper.outerBranches.map((branch) => ({
      heavenlyStem: upper.outerStem,
      earthlyBranch: branch,
      element: BRANCH_ELEMENTS[branch],
    })),
  ];
}

function computeSixRelatives(
  _binary: string,
  naJiaAssignments: NaJiaAssignment[],
): Array<SixRelative | null> {
  const palace = PALACE_BY_BINARY[_binary];
  if (!palace) {
    return naJiaAssignments.map(() => null);
  }

  const palaceElement = PALACE_ELEMENTS[palace];
  return naJiaAssignments.map((assignment) => {
    if (!assignment.element) return null;
    return resolveSixRelative(palaceElement, assignment.element);
  });
}

function computeSixSpirits(
  lineCount: number,
  _context: HexagramComputationContext,
): Array<SixSpirit | null> {
  if (!_context.dayStem) {
    return Array.from({ length: lineCount }, () => null);
  }

  const startSpirit = getStartingSixSpirit(_context.dayStem);
  const startIndex = SIX_SPIRIT_ORDER.indexOf(startSpirit);

  return Array.from({ length: lineCount }, (_, index) => SIX_SPIRIT_ORDER[(startIndex + index) % SIX_SPIRIT_ORDER.length]);
}

function computeWorldResponseRoles(_binary: string, lineCount: number): Array<WorldResponseRole | null> {
  // TODO: 按卦宫规则标定世应。
  return Array.from({ length: lineCount }, () => null);
}

export function buildHexagramLineAnnotations(
  binary: string,
  lineValues: LineValue[],
  context: HexagramComputationContext = {},
): HexagramLineAnnotation[] {
  const naJiaAssignments = computeNaJiaAssignments(binary, lineValues.length);
  const sixRelatives = computeSixRelatives(binary, naJiaAssignments);
  const sixSpirits = computeSixSpirits(lineValues.length, context);
  const worldResponseRoles = computeWorldResponseRoles(binary, lineValues.length);

  return lineValues.map((_, index) => {
    const annotation = createPendingAnnotation(context);
    const naJia = naJiaAssignments[index];

    return {
      heavenlyStem: naJia.heavenlyStem,
      earthlyBranch: naJia.earthlyBranch,
      element: naJia.element,
      sixRelative: sixRelatives[index],
      sixSpirit: sixSpirits[index],
      worldResponse: worldResponseRoles[index],
      status: {
        naJia: naJia.earthlyBranch && naJia.element ? "resolved" : annotation.status.naJia,
        sixRelative: sixRelatives[index] ? "resolved" : annotation.status.sixRelative,
        sixSpirit: sixSpirits[index] ? "resolved" : annotation.status.sixSpirit,
        worldResponse: worldResponseRoles[index] ? "resolved" : annotation.status.worldResponse,
      },
    };
  });
}

export function getDayStemForDate(date: Date): HeavenlyStem {
  const localYear = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  let y = localYear % 100;
  let c = Math.floor(localYear / 100);

  if (month === 1 || month === 2) {
    month += 12;
    y -= 1;
    if (y < 0) {
      y += 100;
      c -= 1;
    }
  }

  const g = 4 * c + Math.floor(c / 4) + 5 * y + Math.floor(y / 4) + Math.floor((3 * (month + 1)) / 5) + day - 3;
  const normalized = ((g - 1) % 10 + 10) % 10;
  return STEMS[normalized];
}

function getTrigramName(binary: string): keyof typeof TRIGRAM_NA_JIA | null {
  const mapping: Record<string, keyof typeof TRIGRAM_NA_JIA> = {
    "111": "乾",
    "110": "兑",
    "101": "离",
    "100": "震",
    "011": "巽",
    "010": "坎",
    "001": "艮",
    "000": "坤",
  };

  return mapping[binary] ?? null;
}

function resolveSixRelative(self: FiveElement, target: FiveElement): SixRelative {
  if (self === target) return "兄弟";
  if (generates(self, target)) return "子孙";
  if (overcomes(self, target)) return "妻财";
  if (overcomes(target, self)) return "官鬼";
  return "父母";
}

function generates(from: FiveElement, to: FiveElement): boolean {
  return (
    (from === "木" && to === "火") ||
    (from === "火" && to === "土") ||
    (from === "土" && to === "金") ||
    (from === "金" && to === "水") ||
    (from === "水" && to === "木")
  );
}

function overcomes(from: FiveElement, to: FiveElement): boolean {
  return (
    (from === "木" && to === "土") ||
    (from === "土" && to === "水") ||
    (from === "水" && to === "火") ||
    (from === "火" && to === "金") ||
    (from === "金" && to === "木")
  );
}

function getStartingSixSpirit(dayStem: HeavenlyStem): SixSpirit {
  if (dayStem === "甲" || dayStem === "乙") return "青龙";
  if (dayStem === "丙" || dayStem === "丁") return "朱雀";
  if (dayStem === "戊") return "勾陈";
  if (dayStem === "己") return "腾蛇";
  if (dayStem === "庚" || dayStem === "辛") return "白虎";
  return "玄武";
}
