import { LineValue } from "./data/hexagrams";

export interface DivinationRecord {
  id: string;
  date: string;
  question: string;
  lines: LineValue[];
  originalName: string;
  changedName: string;
  movingLines: number[];
  interpretation: string;
}
