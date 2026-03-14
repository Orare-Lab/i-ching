import { DivinationRecord, DivinationSummary } from "../types";
import { parseInterpretation } from "./interpretation";

const HISTORY_SUMMARY_KEY = "divination_history_summaries";
const HISTORY_LEGACY_KEY = "divination_history";
const HISTORY_DETAIL_PREFIX = "divination_history_detail_";
const MAX_HISTORY_ITEMS = 50;

function summarizeInterpretation(interpretation: string) {
  const plainText = (parseInterpretation(interpretation).answer || interpretation)
    .replace(/[#>*`~-]/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.slice(0, 120) || "暂无摘要";
}

function toSummary(record: DivinationRecord): DivinationSummary {
  return {
    id: record.id,
    date: record.date,
    question: record.question,
    lines: record.lines,
    originalName: record.originalName,
    changedName: record.changedName,
    movingLines: record.movingLines,
    excerpt: summarizeInterpretation(record.interpretation),
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSummaries(history: DivinationSummary[]) {
  localStorage.setItem(HISTORY_SUMMARY_KEY, JSON.stringify(history));
}

function writeDetail(id: string, interpretation: string) {
  localStorage.setItem(`${HISTORY_DETAIL_PREFIX}${id}`, interpretation);
}

function removeDetail(id: string) {
  localStorage.removeItem(`${HISTORY_DETAIL_PREFIX}${id}`);
}

function migrateLegacyHistory() {
  const legacyRecords = readJson<DivinationRecord[]>(HISTORY_LEGACY_KEY, []);
  if (legacyRecords.length === 0) {
    return [];
  }

  const nextHistory = legacyRecords.slice(0, MAX_HISTORY_ITEMS).map((record) => {
    writeDetail(record.id, record.interpretation);
    return toSummary(record);
  });

  writeSummaries(nextHistory);
  localStorage.removeItem(HISTORY_LEGACY_KEY);
  return nextHistory;
}

export function loadHistorySummaries() {
  const summaries = readJson<DivinationSummary[]>(HISTORY_SUMMARY_KEY, []);
  return summaries.length > 0 ? summaries : migrateLegacyHistory();
}

export function loadHistoryDetail(id: string) {
  return localStorage.getItem(`${HISTORY_DETAIL_PREFIX}${id}`);
}

export function saveHistoryRecord(record: DivinationRecord) {
  const nextHistory = [toSummary(record), ...loadHistorySummaries().filter((item) => item.id !== record.id)].slice(
    0,
    MAX_HISTORY_ITEMS,
  );

  writeDetail(record.id, record.interpretation);
  writeSummaries(nextHistory);

  const validIds = new Set(nextHistory.map((item) => item.id));
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(HISTORY_DETAIL_PREFIX)) {
      continue;
    }
    const id = key.slice(HISTORY_DETAIL_PREFIX.length);
    if (!validIds.has(id)) {
      removeDetail(id);
    }
  }

  return nextHistory;
}

export function deleteHistoryRecord(id: string) {
  const nextHistory = loadHistorySummaries().filter((item) => item.id !== id);
  writeSummaries(nextHistory);
  removeDetail(id);
  return nextHistory;
}
