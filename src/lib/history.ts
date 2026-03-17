import { parseHexagram } from "../data/hexagrams";
import { buildHexagramSignature, inferTopicFromQuestion } from "./personalArchive";
import { DivinationOutcomeTag, DivinationRecord, DivinationSummary, DivinationTopic } from "../types";
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
    originalBinary: record.originalBinary,
    changedBinary: record.changedBinary,
    signature: record.signature,
    topic: record.topic,
    outcomeTag: record.outcomeTag,
    outcomeNote: record.outcomeNote,
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

function writeDetail(record: DivinationRecord) {
  localStorage.setItem(`${HISTORY_DETAIL_PREFIX}${record.id}`, JSON.stringify(record));
}

function removeDetail(id: string) {
  localStorage.removeItem(`${HISTORY_DETAIL_PREFIX}${id}`);
}

function asTopic(value: unknown, question: string): DivinationTopic {
  if (typeof value === "string" && value && value !== "未分类") {
    return value as DivinationTopic;
  }

  return inferTopicFromQuestion(question);
}

function asOutcomeTag(value: unknown): DivinationOutcomeTag {
  return typeof value === "string" ? (value as DivinationOutcomeTag) : "待观察";
}

function upgradeRecord(record: DivinationRecord | (Partial<DivinationRecord> & Pick<DivinationRecord, "id" | "date" | "question" | "lines" | "originalName" | "changedName" | "movingLines" | "interpretation">)) {
  const computed = record.lines.length === 6 ? parseHexagram(record.lines) : null;
  const originalBinary = typeof record.originalBinary === "string" && record.originalBinary ? record.originalBinary : computed?.originalBinary || "";
  const changedBinary = typeof record.changedBinary === "string" && record.changedBinary ? record.changedBinary : computed?.changedBinary || "";
  const movingLines = Array.isArray(record.movingLines) && record.movingLines.length > 0
    ? record.movingLines
    : computed?.movingLines || [];

  return {
    ...record,
    movingLines,
    originalBinary,
    changedBinary,
    signature:
      typeof record.signature === "string" && record.signature
        ? record.signature
        : buildHexagramSignature(originalBinary, changedBinary, movingLines),
    topic: asTopic(record.topic, record.question),
    outcomeTag: asOutcomeTag(record.outcomeTag),
    outcomeNote: typeof record.outcomeNote === "string" ? record.outcomeNote : "",
  } satisfies DivinationRecord;
}

function upgradeSummary(summary: DivinationSummary | (Partial<DivinationSummary> & Pick<DivinationSummary, "id" | "date" | "question" | "lines" | "originalName" | "changedName" | "movingLines" | "excerpt">)) {
  const computed = summary.lines.length === 6 ? parseHexagram(summary.lines) : null;
  const originalBinary = typeof summary.originalBinary === "string" && summary.originalBinary ? summary.originalBinary : computed?.originalBinary || "";
  const changedBinary = typeof summary.changedBinary === "string" && summary.changedBinary ? summary.changedBinary : computed?.changedBinary || "";
  const movingLines = Array.isArray(summary.movingLines) && summary.movingLines.length > 0
    ? summary.movingLines
    : computed?.movingLines || [];

  return {
    ...summary,
    movingLines,
    originalBinary,
    changedBinary,
    signature:
      typeof summary.signature === "string" && summary.signature
        ? summary.signature
        : buildHexagramSignature(originalBinary, changedBinary, movingLines),
    topic: asTopic(summary.topic, summary.question),
    outcomeTag: asOutcomeTag(summary.outcomeTag),
    outcomeNote: typeof summary.outcomeNote === "string" ? summary.outcomeNote : "",
  } satisfies DivinationSummary;
}

function migrateLegacyHistory() {
  const legacyRecords = readJson<DivinationRecord[]>(HISTORY_LEGACY_KEY, []);
  if (legacyRecords.length === 0) {
    return [];
  }

  const nextHistory = legacyRecords.slice(0, MAX_HISTORY_ITEMS).map((record) => {
    const upgraded = upgradeRecord(record);
    writeDetail(upgraded);
    return toSummary(upgraded);
  });

  writeSummaries(nextHistory);
  localStorage.removeItem(HISTORY_LEGACY_KEY);
  return nextHistory;
}

export function loadHistorySummaries() {
  const summaries = readJson<DivinationSummary[]>(HISTORY_SUMMARY_KEY, []);
  if (summaries.length === 0) {
    return migrateLegacyHistory();
  }

  const upgraded = summaries.map((item) => upgradeSummary(item));
  if (JSON.stringify(upgraded) !== JSON.stringify(summaries)) {
    writeSummaries(upgraded);
  }
  return upgraded;
}

export function loadHistoryDetail(id: string) {
  const raw = localStorage.getItem(`${HISTORY_DETAIL_PREFIX}${id}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DivinationRecord;
    return parsed.interpretation || null;
  } catch {
    return raw;
  }
}

export function saveHistoryRecord(record: DivinationRecord) {
  const nextHistory = [toSummary(record), ...loadHistorySummaries().filter((item) => item.id !== record.id)].slice(
    0,
    MAX_HISTORY_ITEMS,
  );

  writeDetail(record);
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

export function updateHistoryRecord(id: string, patch: Partial<Pick<DivinationSummary, "topic" | "outcomeTag" | "outcomeNote">>) {
  const nextHistory = loadHistorySummaries().map((item) => (item.id === id ? { ...item, ...patch } : item));
  writeSummaries(nextHistory);

  const raw = localStorage.getItem(`${HISTORY_DETAIL_PREFIX}${id}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DivinationRecord;
      localStorage.setItem(`${HISTORY_DETAIL_PREFIX}${id}`, JSON.stringify({ ...parsed, ...patch }));
    } catch {
      // Ignore legacy plain-text detail payloads.
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
