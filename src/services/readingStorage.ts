import type { DrawnCard, ReadingResult, SpreadType } from "../types/tarot";

const STORAGE_KEY = "moonlit-tarot-readings";

export type SavedReading = {
  id: string;
  createdAt: string;
  topic: string;
  question: string;
  spreadType: SpreadType;
  cards: DrawnCard[];
  result: ReadingResult;
};

export function saveReading(reading: Omit<SavedReading, "id" | "createdAt">): SavedReading {
  const savedReading: SavedReading = {
    ...reading,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const readings = getSavedReadings();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([savedReading, ...readings].slice(0, 30)));
  return savedReading;
}

export function getSavedReadings(): SavedReading[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function copyReadingText(reading: Omit<SavedReading, "id" | "createdAt">) {
  const cardLines = reading.cards
    .map(
      (card) =>
        `${card.selectionOrder ?? ""}. ${card.koreanName} - ${card.orientation === "upright" ? "정방향" : "역방향"} (${card.position})`,
    )
    .join("\n");

  const text = [
    `[${reading.topic} 타로 리딩]`,
    "",
    "질문:",
    reading.question,
    "",
    `배열: ${reading.spreadType === "one-card" ? "한 장 리딩" : reading.spreadType === "three-card" ? "세 장 리딩" : "일곱 장 리딩"}`,
    "",
    "선택 카드:",
    cardLines,
    "",
    "전체 해석:",
    reading.result.overallReading,
    "",
    "핵심 흐름 한눈에 보기:",
    `현재 흐름: ${reading.result.highlights.currentFlow}`,
    `가장 큰 장애물: ${reading.result.highlights.mainObstacle}`,
    `열려 있는 가능성: ${reading.result.highlights.possibility}`,
    `지금 필요한 태도: ${reading.result.highlights.recommendedAttitude}`,
    "",
    "카드별 해석:",
    ...reading.result.cardReadings.map(
      (card) => `${card.position} - ${card.koreanName}: ${card.interpretation}`,
    ),
    "",
    "카드 간 연결 해석:",
    reading.result.cardConnection,
    "",
    "현실적인 조언:",
    reading.result.practicalAdvice,
    "",
    `지금 기억하면 좋은 한마디: ${reading.result.finalMessage}`,
    "",
    reading.result.disclaimer,
  ]
    .filter(Boolean)
    .join("\n");

  await window.navigator.clipboard.writeText(text);
}
