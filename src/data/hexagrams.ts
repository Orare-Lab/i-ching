import { buildHexagramLineAnnotations, HexagramComputationContext, HexagramLineAnnotation } from "../lib/hexagramAnnotations";

export const hexagramNames: Record<string, string> = {
  "111111": "乾为天", "000000": "坤为地", "100010": "水雷屯", "010001": "山水蒙",
  "111010": "水天需", "010111": "天水讼", "010000": "地水师", "000010": "水地比",
  "111011": "风天小畜", "110111": "天泽履", "111000": "地天泰", "000111": "天地否",
  "101111": "天火同人", "111101": "火天大有", "001000": "地山谦", "000100": "雷地豫",
  "100110": "泽雷随", "011001": "山风蛊", "110000": "地泽临", "000011": "风地观",
  "100101": "火雷噬嗑", "101001": "山火贲", "000001": "山地剥", "100000": "地雷复",
  "100111": "天雷无妄", "111001": "山天大畜", "100001": "山雷颐", "011110": "泽风大过",
  "010010": "坎为水", "101101": "离为火", "001110": "泽山咸", "011100": "雷风恒",
  "001111": "天山遁", "111100": "雷天大壮", "000101": "火地晋", "101000": "地火明夷",
  "101011": "风火家人", "110101": "火泽睽", "001010": "水山蹇", "010100": "雷水解",
  "110001": "山泽损", "100011": "风雷益", "111110": "泽天夬", "011111": "天风姤",
  "000110": "泽地萃", "011000": "地风升", "010110": "泽水困", "011010": "水风井",
  "101110": "泽火革", "011101": "火风鼎", "100100": "震为雷", "001001": "艮为山",
  "001011": "风山渐", "110100": "雷泽归妹", "101100": "雷火丰", "001101": "火山旅",
  "011011": "巽为风", "110110": "兑为泽", "010011": "风水涣", "110010": "水泽节",
  "110011": "风泽中孚", "001100": "雷山小过", "101010": "水火既济", "010101": "火水未济"
};

export type LineValue = 6 | 7 | 8 | 9;
export type LinePositionName = "初" | "二" | "三" | "四" | "五" | "上";

export interface HexagramLineDetail {
  index: number;
  lineNumber: number;
  positionName: LinePositionName;
  value: LineValue;
  isYang: boolean;
  isMoving: boolean;
  label: string;
  marker: "○" | "×" | null;
  annotation: HexagramLineAnnotation;
}

export interface ParsedHexagram {
  originalBinary: string;
  changedBinary: string;
  originalName: string;
  changedName: string;
  movingLines: number[];
  changedLineValues: LineValue[];
  originalLines: HexagramLineDetail[];
  changedLines: HexagramLineDetail[];
  originalTrigrams: { upper: string; lower: string };
  changedTrigrams: { upper: string; lower: string };
}

const POSITION_NAMES: LinePositionName[] = ["初", "二", "三", "四", "五", "上"];
const TRIGRAM_NAMES: Record<string, string> = {
  "111": "乾",
  "110": "兑",
  "101": "离",
  "100": "震",
  "011": "巽",
  "010": "坎",
  "001": "艮",
  "000": "坤",
};

function buildLineLabel(value: LineValue, index: number): string {
  const isYang = value === 7 || value === 9;
  const yinYangChar = isYang ? "九" : "六";
  const positionChar = POSITION_NAMES[index];
  return index === 0 || index === 5 ? `${positionChar}${yinYangChar}` : `${yinYangChar}${positionChar}`;
}

function buildLineDetail(
  value: LineValue,
  index: number,
  annotation: HexagramLineAnnotation,
): HexagramLineDetail {
  const isYang = value === 7 || value === 9;
  const isMoving = value === 6 || value === 9;

  return {
    index,
    lineNumber: index + 1,
    positionName: POSITION_NAMES[index],
    value,
    isYang,
    isMoving,
    label: buildLineLabel(value, index),
    marker: isMoving ? (value === 9 ? "○" : "×") : null,
    annotation,
  };
}

export function createHexagramLineDetail(value: LineValue, index: number): HexagramLineDetail {
  return buildLineDetail(value, index, {
    heavenlyStem: null,
    earthlyBranch: null,
    element: null,
    sixRelative: null,
    sixSpirit: null,
    worldResponse: null,
    status: {
      naJia: "pending",
      sixRelative: "pending",
      sixSpirit: "needs_context",
      worldResponse: "pending",
    },
  });
}

export function getTrigramPair(binary: string) {
  return {
    lower: TRIGRAM_NAMES[binary.slice(0, 3)] || "未知",
    upper: TRIGRAM_NAMES[binary.slice(3)] || "未知",
  };
}

export function parseHexagram(lines: LineValue[], context: HexagramComputationContext = {}): ParsedHexagram {
  const original = lines.map(line => (line === 7 || line === 9 ? 1 : 0));
  const changed = lines.map(line => {
      if (line === 9) return 0; // 老阳变阴
      if (line === 6) return 1; // 老阴变阳
      return line === 7 ? 1 : 0; // 其余不变
  });

  const changedLineValues = lines.map(line => {
      if (line === 9) return 8 as LineValue; // 老阳变少阴
      if (line === 6) return 7 as LineValue; // 老阴变少阳
      return line; // 其余不变 (7 or 8)
  });

  const originalBinary = original.join('');
  const changedBinary = changed.join('');
  const originalAnnotations = buildHexagramLineAnnotations(originalBinary, lines, context);
  const changedAnnotations = buildHexagramLineAnnotations(changedBinary, changedLineValues, context);

  return {
      originalBinary,
      changedBinary,
      originalName: hexagramNames[originalBinary] || "未知",
      changedName: hexagramNames[changedBinary] || "未知",
      movingLines: lines.map((l, i) => (l === 9 || l === 6 ? i + 1 : null)).filter(v => v !== null),
      changedLineValues,
      originalLines: lines.map((line, index) => buildLineDetail(line, index, originalAnnotations[index])),
      changedLines: changedLineValues.map((line, index) => buildLineDetail(line, index, changedAnnotations[index])),
      originalTrigrams: getTrigramPair(originalBinary),
      changedTrigrams: getTrigramPair(changedBinary),
  };
}
