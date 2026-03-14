import { LineValue } from "./data/hexagrams";

export interface DivinationSummary {
  id: string;
  date: string;
  question: string;
  lines: LineValue[];
  originalName: string;
  changedName: string;
  movingLines: number[];
  excerpt: string;
}

export interface DivinationRecord extends Omit<DivinationSummary, "excerpt"> {
  interpretation: string;
}
