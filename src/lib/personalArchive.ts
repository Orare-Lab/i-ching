import { ParsedHexagram } from "../data/hexagrams";
import { DivinationOutcomeTag, DivinationSummary, DivinationTopic } from "../types";

export const TOPIC_OPTIONS: DivinationTopic[] = ["未分类", "感情", "工作", "财运", "学业", "健康", "家庭", "出行", "其他"];
export const OUTCOME_OPTIONS: DivinationOutcomeTag[] = ["待观察", "应验", "部分应验", "未应验"];

const TOPIC_KEYWORDS: Array<{ topic: DivinationTopic; keywords: string[] }> = [
  { topic: "感情", keywords: ["感情", "恋爱", "前任", "复合", "结婚", "离婚", "暧昧", "对象", "桃花", "伴侣", "喜欢的人", "追求", "相亲"] },
  { topic: "工作", keywords: ["工作", "offer", "入职", "离职", "跳槽", "升职", "晋升", "面试", "上班", "同事", "老板", "项目", "创业", "事业"] },
  { topic: "财运", keywords: ["财运", "赚钱", "收入", "工资", "奖金", "副业", "投资", "股票", "基金", "理财", "生意", "回款", "客户"] },
  { topic: "学业", keywords: ["学业", "考试", "考研", "考公", "读书", "论文", "申请", "留学", "上岸", "复习", "成绩", "面试官"] },
  { topic: "健康", keywords: ["健康", "生病", "身体", "手术", "怀孕", "治疗", "恢复", "焦虑", "失眠", "体检", "症状", "医院"] },
  { topic: "家庭", keywords: ["家庭", "父母", "家里", "孩子", "亲人", "婆婆", "公婆", "夫妻", "家人", "搬家", "房子"] },
  { topic: "出行", keywords: ["出行", "旅行", "旅游", "出差", "航班", "高铁", "搬迁", "迁居", "路上", "行程", "远行"] },
];

export function buildHexagramSignature(originalBinary: string, changedBinary: string, movingLines: number[]) {
  return `${originalBinary}:${changedBinary}:${movingLines.join("-") || "static"}`;
}

export function inferTopicFromQuestion(question: string): DivinationTopic {
  const normalized = question.trim().toLowerCase();
  if (!normalized) {
    return "未分类";
  }

  let bestMatch: { topic: DivinationTopic; score: number } = { topic: "未分类", score: 0 };

  for (const entry of TOPIC_KEYWORDS) {
    const score = entry.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestMatch.score) {
      bestMatch = { topic: entry.topic, score };
    }
  }

  return bestMatch.score > 0 ? bestMatch.topic : "其他";
}

export function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildHexagramFrequencyStats(history: DivinationSummary[]) {
  const counts = new Map<string, number>();

  for (const item of history) {
    if (!item.originalBinary) {
      continue;
    }
    counts.set(item.originalBinary, (counts.get(item.originalBinary) || 0) + 1);
  }

  return {
    totalRecords: history.length,
    uniqueHexagrams: counts.size,
    counts,
  };
}

export function buildPersonalHexagramInsights(
  history: DivinationSummary[],
  currentRecordId: string | null,
  hexData: ParsedHexagram,
) {
  const comparableHistory = history.filter((item) => item.id !== currentRecordId);
  const sameOriginal = comparableHistory.filter((item) => item.originalBinary === hexData.originalBinary);
  const samePair = sameOriginal.filter((item) => item.changedBinary === hexData.changedBinary);
  const sameSignature = samePair.filter(
    (item) => item.signature === buildHexagramSignature(hexData.originalBinary, hexData.changedBinary, hexData.movingLines),
  );

  const topicCounts = new Map<DivinationTopic, number>();
  const outcomeCounts = new Map<DivinationOutcomeTag, number>();

  for (const item of samePair) {
    topicCounts.set(item.topic, (topicCounts.get(item.topic) || 0) + 1);
    outcomeCounts.set(item.outcomeTag, (outcomeCounts.get(item.outcomeTag) || 0) + 1);
  }

  return {
    sameOriginal,
    samePair,
    sameSignature,
    topicBreakdown: [...topicCounts.entries()].sort((a, b) => b[1] - a[1]),
    outcomeBreakdown: [...outcomeCounts.entries()].sort((a, b) => b[1] - a[1]),
    recentCases: samePair.slice(0, 3),
  };
}
