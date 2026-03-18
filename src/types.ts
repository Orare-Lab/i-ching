import { LineValue } from "./data/hexagrams";

export type DivinationTopic =
  | "未分类"
  | "感情"
  | "工作"
  | "财运"
  | "学业"
  | "健康"
  | "家庭"
  | "出行"
  | "其他";

export type DivinationOutcomeTag = "待观察" | "应验" | "部分应验" | "未应验";

export interface DivinationSummary {
  id: string;
  date: string;
  question: string;
  lines: LineValue[];
  originalName: string;
  changedName: string;
  movingLines: number[];
  originalBinary: string;
  changedBinary: string;
  signature: string;
  topic: DivinationTopic;
  outcomeTag: DivinationOutcomeTag;
  outcomeNote: string;
  excerpt: string;
}

export interface DivinationRecord extends Omit<DivinationSummary, "excerpt"> {
  interpretation: string;
}

export type BaziGender = "male" | "female";
export type BaziCalendarType = "solar" | "lunar";

export interface BaziPillar {
  stem: string;
  branch: string;
  label: string;
  stemElement: string;
  branchElement: string;
  hiddenStems: string[];
  animal: string;
}

export interface BaziChart {
  name: string;
  gender: BaziGender;
  calendarType: BaziCalendarType;
  solarDateText: string;
  lunarDateText: string;
  zodiac: string;
  dayMaster: string;
  pillars: {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    hour: BaziPillar;
  };
  elementCounts: Record<string, number>;
  warnings: string[];
}
