export type TopicId =
  | "love"
  | "money"
  | "career"
  | "study"
  | "relationship"
  | "daily"
  | "their-mind"
  | "custom";

export type SpreadType = "one-card" | "three-card" | "seven-card";

export type CardOrientation = "upright" | "reversed";

export type TarotCardData = {
  id: number;
  arcana: "major" | "minor";
  suit: null | "cups" | "wands" | "swords" | "pentacles";
  number: number;
  name: string;
  koreanName: string;
  image: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
};

export type DrawnCard = TarotCardData & {
  drawId: string;
  orientation: CardOrientation;
  isReversed: boolean;
  position: string;
  selectionOrder?: number;
};

export type ReadingResult = {
  title: string;
  overallReading: string;
  highlights: {
    currentFlow: string;
    mainObstacle: string;
    possibility: string;
    recommendedAttitude: string;
  };
  cardReadings: {
    position: string;
    cardName: string;
    koreanName: string;
    orientation: CardOrientation;
    interpretation: string;
  }[];
  cardConnection: string;
  practicalAdvice: string;
  finalMessage: string;
  disclaimer: string;
  generatedBy: "gemini" | "fallback";
};
