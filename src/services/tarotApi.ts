import type { DrawnCard, ReadingResult, SpreadType } from "../types/tarot";

export type ReadingRequest = {
  topic: string;
  question: string;
  spreadType: SpreadType;
  cards: {
    position: string;
    name: string;
    koreanName: string;
    orientation: "upright" | "reversed";
    keywords: string[];
    meaning: string;
  }[];
};

export async function requestTarotReading(input: {
  topic: string;
  question: string;
  spreadType: SpreadType;
  cards: DrawnCard[];
}): Promise<ReadingResult> {
  const payload: ReadingRequest = {
    topic: input.topic,
    question: input.question.trim(),
    spreadType: input.spreadType,
    cards: input.cards.map((card) => ({
      position: card.position,
      name: card.name,
      koreanName: card.koreanName,
      orientation: card.orientation,
      keywords:
        card.orientation === "upright" ? card.uprightKeywords : card.reversedKeywords,
      meaning: card.orientation === "upright" ? card.uprightMeaning : card.reversedMeaning,
    })),
  };

  const response = await fetch("/api/tarot/reading", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message ??
        body?.message ??
        "타로 해석을 불러오지 못했습니다.",
    );
  }

  return body.data;
}
