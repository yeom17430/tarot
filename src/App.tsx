import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CARD_BACK_IMAGE, tarotCards } from "./data/tarotCards";
import { requestTarotReading } from "./services/tarotApi";
import type { DrawnCard, ReadingResult, SpreadType, TopicId } from "./types/tarot";

type Step = "home" | "topic" | "spread" | "shuffle" | "reveal" | "loading" | "result";

const topics: { id: TopicId; label: string; icon: string; hint: string }[] = [
  { id: "love", label: "연애운", icon: "♥", hint: "끌림과 관계의 흐름" },
  { id: "money", label: "재물운", icon: "◆", hint: "돈의 기회와 균형" },
  { id: "career", label: "진로운", icon: "⌖", hint: "일과 방향성" },
  { id: "study", label: "학업운", icon: "▣", hint: "집중과 성취" },
  { id: "relationship", label: "인간관계", icon: "◎", hint: "거리와 소통" },
  { id: "daily", label: "오늘의 운세", icon: "☼", hint: "하루의 기운" },
  { id: "their-mind", label: "상대방의 마음", icon: "☾", hint: "말하지 않은 감정" },
  { id: "custom", label: "직접 질문", icon: "◌", hint: "내 질문으로 보기" },
];

const defaultQuestions: Record<TopicId, string> = {
  love: "현재 나의 연애 흐름과 필요한 조언을 알려주세요.",
  money: "현재 나의 재정적 흐름과 주의할 점을 알려주세요.",
  career: "현재 진로 방향과 앞으로 고려할 점을 알려주세요.",
  study: "현재 학업 흐름과 성장을 위한 조언을 알려주세요.",
  relationship: "현재 인간관계의 흐름과 조심해야 할 부분을 알려주세요.",
  daily: "오늘 하루의 전반적인 흐름과 주의할 점을 알려주세요.",
  "their-mind": "상대방의 현재 마음을 카드의 상징으로 조심스럽게 살펴봐 주세요.",
  custom: "",
};

const spreadLabels: Record<SpreadType, string> = {
  "one-card": "한 장 리딩",
  "three-card": "세 장 리딩",
  "seven-card": "일곱 장 리딩",
};

const spreadDescriptions: Record<SpreadType, string> = {
  "one-card": "빠르게 핵심 메시지를 확인합니다.",
  "three-card": "상황의 원인, 현재, 앞으로의 흐름을 확인합니다.",
  "seven-card": "여러 요소를 연결하여 더욱 세밀하게 해석합니다.",
};

const shuffleMessages = [
  "카드에 마음을 집중해보세요.",
  "당신의 질문을 조용히 떠올려보세요.",
  "카드가 당신의 현재 흐름을 읽고 있습니다.",
  "마음이 이끄는 카드를 선택해보세요.",
  "서두르지 말고 카드의 움직임을 바라보세요.",
];

const SHUFFLE_DURATION_MS = 1200;
const REVEAL_DELAY_MS: Record<SpreadType, number> = {
  "one-card": 240,
  "three-card": 240,
  "seven-card": 180,
};
const REVEAL_FLIP_DURATION_MS = 720;
const RESULT_AFTER_REVEAL_BUFFER_MS = 500;
const MIN_LOADING_STAGE_MS = 1200;

type ReadingImageInput = {
  topicLabel: string;
  spreadLabel: string;
  question: string;
  cards: DrawnCard[];
  result: ReadingResult;
};

const imagePreloadCache = new Map<string, Promise<void>>();

function preloadImage(src: string) {
  const cached = imagePreloadCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.decode) {
        image.decode().then(resolve).catch(resolve);
        return;
      }
      resolve();
    };
    image.onerror = () => resolve();
    image.src = src;
  });

  imagePreloadCache.set(src, promise);
  return promise;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function copyReadingAsImage(input: ReadingImageInput) {
  const pngBlob = await createReadingImageBlob(input);
  if (window.ClipboardItem && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      return "타로 리딩 결과 이미지를 복사했습니다.";
    } catch {
      // Mobile browsers often block image clipboard writes; fall through to share/download.
    }
  }

  const file = new File([pngBlob], "tarot-reading.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "타로 리딩 결과",
    });
    return "타로 리딩 결과 이미지를 공유했습니다.";
  }

  const url = URL.createObjectURL(pngBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tarot-reading.png";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "이미지 복사가 제한되어 PNG 파일로 저장했습니다.";
}

async function createReadingImageBlob(input: ReadingImageInput) {
  if ("fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  const width = input.cards.length >= 7 ? 1200 : input.cards.length >= 3 ? 900 : 680;
  const padding = 72;
  const contentWidth = width - padding * 2;
  const scale = window.innerWidth <= 760 ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지 복사를 지원하지 않는 브라우저입니다.");
  const cardImages = await Promise.all(input.cards.map((card) => loadCanvasImage(card.image)));

  const drawCommands: ((offsetY: number) => void)[] = [];
  let y = padding;

  const addCommand = (height: number, draw: (offsetY: number) => void) => {
    const commandY = y;
    drawCommands.push((offsetY) => draw(commandY + offsetY));
    y += height;
  };

  const setFont = (size: number, weight = 400) => {
    context.font = `${weight} ${size}px "Noto Serif KR", "Malgun Gothic", serif`;
  };

  const wrapLines = (text: string, maxWidth: number, size: number, weight = 400) => {
    setFont(size, weight);
    const lines: string[] = [];
    for (const paragraph of text.split(/\n+/)) {
      let line = "";
      for (const char of paragraph) {
        const next = `${line}${char}`;
        if (line && context.measureText(next).width > maxWidth) {
          lines.push(line);
          line = char.trimStart();
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const addCenteredText = (text: string, size: number, color: string, weight = 400, gap = 14) => {
    const lines = wrapLines(text, contentWidth, size, weight);
    const lineHeight = Math.round(size * 1.55);
    addCommand(lines.length * lineHeight + gap, (top) => {
      setFont(size, weight);
      context.fillStyle = color;
      context.textAlign = "center";
      lines.forEach((line, index) => {
        context.fillText(line, width / 2, top + lineHeight * (index + 0.8));
      });
    });
  };

  const addSectionTitle = (title: string) => {
    addCommand(54, (top) => {
      setFont(30, 700);
      context.fillStyle = "#d8e0ff";
      context.textAlign = "center";
      context.fillText(title, width / 2, top + 32);
    });
  };

  const addParagraph = (text: string) => {
    const lines = wrapLines(text, contentWidth, 25);
    const lineHeight = 42;
    addCommand(lines.length * lineHeight + 32, (top) => {
      setFont(25);
      context.fillStyle = "#d7cede";
      context.textAlign = "center";
      lines.forEach((line, index) => {
        context.fillText(line, width / 2, top + lineHeight * (index + 0.8));
      });
    });
  };

  addCenteredText("Moonlit Tarot", 20, "#d6b36a", 700, 8);
  addCenteredText(input.result.title || "타로 리딩 결과", 48, "#fff8e7", 700, 18);
  addCenteredText(`${input.topicLabel} · ${input.spreadLabel}`, 22, "#c9c1de", 400, 30);
  addCenteredText(`"${input.question}"`, 24, "#d9c89d", 400, 34);

  const captureRows = input.cards.length >= 7
    ? [input.cards.slice(0, 4), input.cards.slice(4, 7)]
    : [input.cards];
  const cardGridGapX = input.cards.length >= 7 ? 24 : 32;
  const cardGridGapY = input.cards.length >= 7 ? 54 : 0;
  const cardCellWidth = input.cards.length >= 7 ? 180 : 178;
  const cardWidth = input.cards.length >= 7 ? 120 : 132;
  const cardHeight = Math.round(cardWidth * 1.5);
  const positionSize = input.cards.length >= 7 ? 16 : 18;
  const nameSize = input.cards.length >= 7 ? 14 : 15;
  const orientationSize = input.cards.length >= 7 ? 13 : 14;
  const labelGap = 8;
  const labelLineHeight = Math.round(positionSize * 1.45);
  const cardLabelTopGap = 18;
  const captureCardItems = input.cards.map((card, index) => {
    const positionLines = wrapLines(card.position, cardCellWidth, positionSize, 700);
    const nameLines = wrapLines(card.name, cardCellWidth, nameSize, 700);

    return {
      card,
      image: cardImages[index],
      positionLines,
      nameLines,
      orientation: card.isReversed ? "역방향" : "정방향",
      labelHeight:
        positionLines.length * labelLineHeight +
        labelGap +
        nameLines.length * Math.round(nameSize * 1.45) +
        labelGap +
        Math.round(orientationSize * 1.45),
    };
  });
  const maxLabelHeight = Math.max(...captureCardItems.map((item) => item.labelHeight));
  const cardCellHeight = 10 + cardHeight + cardLabelTopGap + maxLabelHeight;
  const cardBlockHeight = captureRows.length * cardCellHeight + (captureRows.length - 1) * cardGridGapY + 34;

  addCommand(cardBlockHeight, (top) => {
    let itemIndex = 0;

    captureRows.forEach((row, rowIndex) => {
      const rowWidth = row.length * cardCellWidth + (row.length - 1) * cardGridGapX;
      const rowStartX = (width - rowWidth) / 2;
      const rowTop = top + rowIndex * (cardCellHeight + cardGridGapY);

      row.forEach((_, columnIndex) => {
        const item = captureCardItems[itemIndex];
        itemIndex += 1;

        const cellX = rowStartX + columnIndex * (cardCellWidth + cardGridGapX);
        const cardX = cellX + (cardCellWidth - cardWidth) / 2;
        const cardTop = rowTop + 10;
        const textX = cellX + cardCellWidth / 2;
        let textY = cardTop + cardHeight + cardLabelTopGap;

        context.strokeStyle = "#d6b36a";
        context.lineWidth = 2;
        roundRect(context, cardX, cardTop, cardWidth, cardHeight, 8);
        context.save();
        context.clip();
        if (item.image) {
          if (item.card.isReversed) {
            context.translate(cardX + cardWidth / 2, cardTop + cardHeight / 2);
            context.rotate(Math.PI);
            context.drawImage(item.image, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
          } else {
            context.drawImage(item.image, cardX, cardTop, cardWidth, cardHeight);
          }
        } else {
          const gradient = context.createLinearGradient(0, cardTop, 0, cardTop + cardHeight);
          gradient.addColorStop(0, "#f6ecd5");
          gradient.addColorStop(1, "#d8bf83");
          context.fillStyle = gradient;
          context.fillRect(cardX, cardTop, cardWidth, cardHeight);
          context.fillStyle = "#35224e";
          setFont(42, 700);
          context.textAlign = "center";
          context.fillText("☾", cardX + cardWidth / 2, cardTop + cardHeight / 2);
        }
        context.restore();
        context.stroke();

        context.textAlign = "center";
        context.fillStyle = "#d6b36a";
        setFont(positionSize, 700);
        item.positionLines.forEach((line) => {
          context.fillText(line, textX, textY);
          textY += labelLineHeight;
        });

        textY += labelGap;
        context.fillStyle = "#fff8e7";
        setFont(nameSize, 700);
        item.nameLines.forEach((line) => {
          context.fillText(line, textX, textY);
          textY += Math.round(nameSize * 1.45);
        });

        textY += labelGap;
        context.fillStyle = "#c9c1de";
        setFont(orientationSize, 400);
        context.fillText(item.orientation, textX, textY);
      });
    });
  });

  addSectionTitle("전체 종합 해석");
  addParagraph(input.result.overallReading);

  addSectionTitle("핵심 흐름");
  addParagraph(
    [
      `현재 흐름: ${input.result.highlights.currentFlow}`,
      `가장 큰 장애물: ${input.result.highlights.mainObstacle}`,
      `열려 있는 가능성: ${input.result.highlights.possibility}`,
      `지금 필요한 태도: ${input.result.highlights.recommendedAttitude}`,
    ].join("\n"),
  );

  addSectionTitle("카드 간 연결 해석");
  addParagraph(input.result.cardConnection);
  addSectionTitle("현실적인 조언");
  addParagraph(input.result.practicalAdvice);
  addSectionTitle("지금 기억하면 좋은 한마디");
  addParagraph(input.result.finalMessage);
  addParagraph(input.result.disclaimer);

  const height = Math.ceil(y + padding);
  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#090818");
  background.addColorStop(0.5, "#11122b");
  background.addColorStop(1, "#171334");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(214, 179, 106, 0.34)";
  context.lineWidth = 2;
  roundRect(context, 24, 24, width - 48, height - 48, 8);
  context.stroke();

  drawCommands.forEach((draw) => draw(0));

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("결과 이미지를 만들지 못했습니다."));
    }, "image/png");
  });
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function shuffleArray<T>(items: T[]): T[] {
  const copiedItems = [...items];
  for (let i = copiedItems.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copiedItems[i], copiedItems[randomIndex]] = [copiedItems[randomIndex], copiedItems[i]];
  }
  return copiedItems;
}

function getSpreadPositions(spreadType: SpreadType, topicId: TopicId | null): string[] {
  if (spreadType === "one-card") {
    if (topicId === "daily") return ["오늘의 핵심 흐름"];
    if (topicId === "their-mind") return ["상대방의 현재 마음"];
    return ["현재의 메시지"];
  }

  if (spreadType === "three-card") {
    if (topicId === "love") return ["나의 마음", "상대방의 마음", "관계의 흐름"];
    if (topicId === "career") return ["현재 나의 상태", "기회와 장애물", "앞으로의 방향"];
    if (topicId === "money") return ["현재 재정 상태", "주의해야 할 부분", "앞으로의 흐름"];
    return ["과거 또는 원인", "현재 상황", "미래 흐름 또는 조언"];
  }

  if (topicId === "love") {
    return [
      "나의 현재 마음",
      "상대방의 현재 마음",
      "관계의 과거 흐름",
      "현재 관계의 장애물",
      "관계에 도움이 되는 요소",
      "가까운 미래의 변화 가능성",
      "관계에 대한 최종 조언",
    ];
  }

  if (topicId === "career") {
    return [
      "현재 진로 상태",
      "나의 강점",
      "나의 약점 또는 불안 요소",
      "현재 마주한 장애물",
      "활용할 수 있는 기회",
      "가까운 미래의 흐름",
      "실천해야 할 조언",
    ];
  }

  return [
    "현재 상황",
    "과거의 영향",
    "숨겨진 감정 또는 원인",
    "현재의 장애물",
    "도움이 되는 요소",
    "가까운 미래의 흐름",
    "최종 조언",
  ];
}

function shuffleCards(spreadType: SpreadType, topicId: TopicId | null): DrawnCard[] {
  const positions = getSpreadPositions(spreadType, topicId);

  return shuffleArray(tarotCards).map((card, index) => ({
    ...card,
    drawId: `${card.id}-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    isReversed: Math.random() < 0.5,
    orientation: "upright",
    position: positions[index] ?? "숨겨진 카드",
  })).map((card) => ({
    ...card,
    orientation: card.isReversed ? "reversed" : "upright",
  }));
}

async function preloadCardImages(cards: DrawnCard[]) {
  await Promise.all([preloadImage(CARD_BACK_IMAGE), ...cards.map((card) => preloadImage(card.image))]);
}

function buildReading(
  topicLabel: string,
  question: string,
  spreadType: SpreadType,
  cards: DrawnCard[],
): ReadingResult {
  const firstCard = cards[0];
  const firstKeyword = firstCard
    ? firstCard.orientation === "upright"
      ? firstCard.uprightKeywords[0]
      : firstCard.reversedKeywords[0]
    : "흐름";
  const questionText = question ? `「${question}」라는 질문` : `${topicLabel}의 흐름`;
  const paragraphCount = spreadType === "seven-card" ? 5 : spreadType === "three-card" ? 3 : 2;
  const overallParagraphs = [
    `전체 흐름을 보면, ${questionText}은 한 가지 답으로 급하게 정리하기보다 지금의 마음과 현실 조건을 함께 살펴보는 쪽에 가까워 보여요. 특히 ${firstKeyword}의 기운이 먼저 보이기 때문에, 지금 가장 중요한 건 결론 자체보다 어떤 태도로 상황을 바라볼지에 있어 보여요.`,
    `선택된 카드들은 각자 다른 위치에서 메시지를 주고 있지만, 공통적으로 서두른 판단을 조금 늦추고 실제로 확인할 수 있는 부분부터 정리해보라고 말해줘요. 마음이 앞서는 지점과 현실적으로 가능한 행동을 나눠 보면 훨씬 차분하게 다음 선택을 할 수 있어요.`,
    `여러 장의 카드가 함께 나온 흐름에서는 감정, 장애물, 앞으로의 가능성이 서로 따로 움직이지 않는다는 점이 보여요. 지금은 한 번의 행동으로 모든 답을 얻으려 하기보다, 작은 반응과 내 마음의 변화를 같이 살피는 편이 좋아 보여요.`,
    `일곱 장의 배열에서는 과거의 영향과 숨겨진 원인이 현재 선택에 꽤 깊게 이어져 있을 수 있어요. 그래서 겉으로 보이는 상황만 보고 판단하기보다, 반복되는 패턴이나 피하고 있었던 감정을 함께 점검할 필요가 있어 보여요.`,
    `가까운 흐름은 고정되어 있다기보다 지금 어떤 방식으로 말하고 행동하느냐에 따라 달라질 여지가 있어요. 부담을 크게 만들기보다 할 수 있는 만큼만 확인하고, 감정이 과열될 때는 잠시 거리를 두는 태도가 도움이 될 수 있어요.`,
  ];

  return {
    title: "서두르기보다 흐름을 차분히 살펴볼 때",
    overallReading: overallParagraphs.slice(0, paragraphCount).join("\n\n"),
    highlights: {
      currentFlow: `${firstKeyword}의 흐름이 먼저 보여요. 지금 상황은 단정된 결론보다 조심스러운 점검에 가까워 보여요.`,
      mainObstacle: "마음이 급해지면 작은 신호에도 의미를 크게 붙일 수 있어요.",
      possibility: "행동 방식과 대화의 온도에 따라 흐름이 달라질 여지는 남아 있어요.",
      recommendedAttitude: "바로 결론을 내리기보다 내 감정과 현실적인 조건을 나눠 보는 태도가 좋아 보여요.",
    },
    cardReadings: cards.map((card) => ({
      position: card.position,
      cardName: card.name,
      koreanName: card.koreanName,
      orientation: card.orientation,
      interpretation: buildCardInterpretation(card, questionText),
    })),
    cardConnection:
      spreadType === "one-card"
        ? "이번 한 장은 지금 가장 먼저 살펴야 할 태도를 압축해서 보여줘요. 카드가 말하는 핵심은 결과를 맞히는 것보다, 현재 마음이 어디에 힘을 쓰고 있는지 알아차리는 데 있어 보여요."
        : "선택된 카드들을 함께 보면 감정의 흐름과 현실적인 조건이 서로 영향을 주고 있어요. 앞선 카드가 보여주는 마음의 방향이 뒤 카드의 가능성을 열기도 하고, 반대로 조급함이 흐름을 막는 원인이 될 수도 있어 보여요.\n\n그래서 지금은 한 장의 의미만 따로 떼어 보기보다, 반복해서 나타나는 감정과 행동 패턴을 함께 살피는 것이 중요해요.",
    practicalAdvice:
      "지금 바로 큰 결정을 내리기보다는, 먼저 종이에 현재 알고 있는 사실과 내가 추측하고 있는 마음을 나눠 적어보세요. 누군가에게 연락하거나 제안해야 한다면 긴 설명보다 짧고 부담 없는 방식이 더 좋아 보여요. 반응이 늦더라도 곧바로 부정적인 결론을 내리기보다, 내가 감당할 수 있는 거리 안에서 천천히 확인해보는 편이 좋겠어요.",
    finalMessage: "답을 서두르지 않아도 괜찮아요. 지금은 상황의 결론보다 내 마음의 속도를 이해하는 일이 더 중요할 수 있어요.",
    disclaimer: "이 타로 리딩은 오락과 자기 성찰을 위한 참고 콘텐츠입니다.",
    generatedBy: "fallback",
  };
}

function buildCardInterpretation(card: DrawnCard, questionText: string) {
  const keywords =
    card.orientation === "upright" ? card.uprightKeywords : card.reversedKeywords;
  const meaning = card.orientation === "upright" ? card.uprightMeaning : card.reversedMeaning;
  const direction = card.orientation === "upright" ? "정방향" : "역방향";
  const firstLine =
    card.orientation === "upright"
      ? `${card.position}에 나온 ${card.koreanName} ${direction}은 ${keywords[0]}의 흐름이 살아 있다는 걸 보여줘요.`
      : `${card.position}에서 ${card.koreanName} 카드가 ${direction}으로 나온 걸 보면, ${keywords[0]} 쪽을 조금 조심해서 살펴볼 필요가 있어 보여요.`;
  const secondLine = `${questionText}과 연결하면, 이 카드는 지금의 결과보다 마음가짐과 선택 방식이 상황을 움직이고 있다는 신호에 가까워요.`;
  const thirdLine = `${meaning} 그래서 ${keywords[1] ?? keywords[0]}에만 끌려가기보다, 현실에서 확인할 수 있는 작은 변화부터 차분히 보는 편이 좋아 보여요.`;

  return `${firstLine}\n${secondLine}\n${thirdLine}`;
}

export default function App() {
  const [step, setStep] = useState<Step>("home");
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [spreadType, setSpreadType] = useState<SpreadType | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<DrawnCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<DrawnCard[]>([]);
  const [revealedCards, setRevealedCards] = useState<DrawnCard[]>([]);
  const [pendingReadingCards, setPendingReadingCards] = useState<DrawnCard[] | null>(null);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [isLoadingReading, setIsLoadingReading] = useState(false);
  const [isPreparingReveal, setIsPreparingReveal] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const loadingRequestKeyRef = useRef<string | null>(null);
  const topic = topics.find((item) => item.id === selectedTopic);
  const topicLabel = topic?.label ?? "타로 리딩";
  const effectiveSpreadType = spreadType ?? "one-card";
  const requiredCards =
    effectiveSpreadType === "one-card" ? 1 : effectiveSpreadType === "three-card" ? 3 : 7;
  const spreadPositions = useMemo(
    () => getSpreadPositions(effectiveSpreadType, selectedTopic),
    [effectiveSpreadType, selectedTopic],
  );
  const trimmedQuestion = customQuestion.trim();
  const effectiveQuestion =
    trimmedQuestion || (selectedTopic ? defaultQuestions[selectedTopic] : "");
  const currentMessage = useMemo(
    () => shuffleMessages[Math.floor(Math.random() * shuffleMessages.length)],
    [isShuffling],
  );
  const isInteractionLocked = isLoadingReading || isPreparingReveal;

  const startShuffle = (nextSpreadType: SpreadType = effectiveSpreadType) => {
    setStep("shuffle");
    setIsShuffling(true);
    setSelectedCards([]);
    setRevealedCards([]);
    setPendingReadingCards(null);
    setReadingResult(null);
    setReadingError(null);
    setSavedMessage(null);
    loadingRequestKeyRef.current = null;
    setShuffledCards(shuffleCards(nextSpreadType, selectedTopic));

    window.setTimeout(() => {
      setIsShuffling(false);
    }, SHUFFLE_DURATION_MS);
  };

  const toggleCard = (card: DrawnCard) => {
    if (isShuffling || isInteractionLocked) return;
    const exists = selectedCards.some((selected) => selected.drawId === card.drawId);
    if (exists) {
      setSelectedCards((cards) => {
        const filtered = cards.filter((selected) => selected.drawId !== card.drawId);
        return filtered.map((item, index) => ({
          ...item,
          selectionOrder: index + 1,
          position: spreadPositions[index] ?? item.position,
        }));
      });
      return;
    }
    if (selectedCards.length >= requiredCards) return;

    setSelectedCards((cards) => [
      ...cards,
      {
        ...card,
        selectionOrder: cards.length + 1,
        position: spreadPositions[cards.length] ?? card.position,
      },
    ]);
  };

  const requestReadingResult = async (cards: DrawnCard[]) => {
    setIsLoadingReading(true);
    setReadingError(null);
    setSavedMessage(null);

    try {
      const result = await requestTarotReading({
        topic: topicLabel,
        question: effectiveQuestion,
        spreadType: effectiveSpreadType,
        cards,
      });
      setReadingResult(result);
    } catch (error) {
      setReadingResult(buildReading(topicLabel, effectiveQuestion, effectiveSpreadType, cards));
      setReadingError(
        error instanceof Error
          ? error.message
          : "서버에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.",
      );
    } finally {
      setIsLoadingReading(false);
    }
  };

  const generateAiReading = async (cards: DrawnCard[]) => {
    setStep("loading");
    await wait(80);
    await Promise.all([requestReadingResult(cards), wait(MIN_LOADING_STAGE_MS)]);
    setStep("result");
  };

  useEffect(() => {
    if (step !== "loading" || !pendingReadingCards) return;

    const requestKey = pendingReadingCards.map((card) => card.drawId).join("|");
    if (loadingRequestKeyRef.current === requestKey) return;
    loadingRequestKeyRef.current = requestKey;

    void (async () => {
      await wait(80);
      await Promise.all([
        requestReadingResult(pendingReadingCards),
        wait(MIN_LOADING_STAGE_MS),
      ]);
      setPendingReadingCards(null);
      setStep("result");
    })();
  }, [pendingReadingCards, step]);

  const useTemporaryReading = () => {
    setReadingResult(buildReading(topicLabel, effectiveQuestion, effectiveSpreadType, selectedCards));
    setReadingError(null);
    setStep("result");
  };

  const completeSelection = async () => {
    if (selectedCards.length !== requiredCards || isShuffling || isInteractionLocked) return;
    const cardsForReveal = selectedCards;
    setIsPreparingReveal(true);
    await preloadCardImages(cardsForReveal);
    setStep("reveal");
    setRevealedCards([]);
    setIsPreparingReveal(false);
    const revealDelay = REVEAL_DELAY_MS[effectiveSpreadType];

    cardsForReveal.forEach((card, index) => {
      window.setTimeout(() => {
        setRevealedCards((cards) => [...cards, card]);
      }, revealDelay * index);
    });
    window.setTimeout(
      () => {
        setPendingReadingCards(cardsForReveal);
        setStep("loading");
      },
      revealDelay * (cardsForReveal.length - 1) + REVEAL_FLIP_DURATION_MS + RESULT_AFTER_REVEAL_BUFFER_MS,
    );
  };

  const restart = () => {
    setStep("home");
    setSelectedTopic(null);
    setCustomQuestion("");
    setSpreadType(null);
    setIsShuffling(false);
    setShuffledCards([]);
    setSelectedCards([]);
    setRevealedCards([]);
    setPendingReadingCards(null);
    setReadingResult(null);
    setIsLoadingReading(false);
    setReadingError(null);
    setSavedMessage(null);
    loadingRequestKeyRef.current = null;
  };

  const copyCurrentReading = async () => {
    if (!readingResult) return;
    try {
      const message = await copyReadingAsImage({
        topicLabel,
        spreadLabel: spreadLabels[effectiveSpreadType],
        question: effectiveQuestion,
        cards: selectedCards,
        result: readingResult,
      });
      setSavedMessage(message);
    } catch (error) {
      setSavedMessage(
        error instanceof Error ? error.message : "이미지 복사 권한을 확인해주세요.",
      );
    }
  };

  const canContinueTopic =
    selectedTopic !== null &&
    (selectedTopic !== "custom" || (trimmedQuestion.length >= 2 && trimmedQuestion.length <= 200));
  const canContinueSpread = spreadType !== null;

  return (
    <main className="app-shell">
      <div className="stars" />
      <div className="curtain curtain-left" />
      <div className="curtain curtain-right" />
      <div className="candle candle-left">
        <span />
      </div>
      <div className="candle candle-right">
        <span />
      </div>
      <div className="moon" aria-hidden="true" />
      <div className="ambient-light" aria-hidden="true" />
      <div className="dust-field" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {step === "home" && (
        <section className="stage home-stage">
          <div className="table-relics" aria-hidden="true">
            <span className="relic-card relic-card-left" />
            <span className="relic-card relic-card-center" />
            <span className="relic-card relic-card-right" />
          </div>
          <p className="eyebrow">Moonlit Tarot</p>
          <h1>달빛 타로 리딩</h1>
          <p className="lead">
            마음속에 질문을 떠올려보세요. 카드가 당신에게 필요한 메시지를 전해드립니다.
          </p>
          <button className="primary-action" onClick={() => setStep("topic")}>
            타로 리딩 시작하기
          </button>
          <div className="crystal-ball" aria-hidden="true" />
        </section>
      )}

      {step === "topic" && (
        <section className="stage">
          <StepHeader title="상담 주제 선택" subtitle="주제를 고르고 원한다면 질문을 더 구체화하세요." />
          <div className="topic-grid">
            {topics.map((item) => (
              <button
                key={item.id}
                className={`topic-card ${selectedTopic === item.id ? "selected" : ""}`}
                onClick={() => setSelectedTopic(item.id)}
              >
                <span className="topic-icon">{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
          {selectedTopic && <p className="selected-line">선택한 주제: {topicLabel}</p>}
          {selectedTopic && (
            <label className="question-box">
              <span>{selectedTopic === "custom" ? "직접 질문 입력" : "질문 입력 선택 사항"}</span>
              <textarea
                value={customQuestion}
                onChange={(event) => setCustomQuestion(event.target.value.slice(0, 200))}
                placeholder={defaultQuestions[selectedTopic] || "카드에게 묻고 싶은 질문을 적어주세요."}
                maxLength={200}
              />
              <small>
                {customQuestion.length}/200
                {selectedTopic === "custom" && trimmedQuestion.length < 2
                  ? " · 직접 질문은 최소 2자 이상 입력해주세요."
                  : ""}
              </small>
            </label>
          )}
          <div className="nav-row">
            <button className="ghost-action" onClick={() => setStep("home")}>
              이전
            </button>
            <button
              className="primary-action compact"
              disabled={!canContinueTopic}
              onClick={() => setStep("spread")}
            >
              다음
            </button>
          </div>
        </section>
      )}

      {step === "spread" && (
        <section className="stage">
          <StepHeader title="카드 수 선택" subtitle="질문의 깊이에 맞는 리딩 방식을 선택하세요." />
          <div className="spread-grid three-options">
            {(Object.keys(spreadLabels) as SpreadType[]).map((type) => (
              <button
                key={type}
                className={`spread-option ${spreadType === type ? "selected" : ""}`}
                onClick={() => setSpreadType(type)}
              >
                <span>{type === "one-card" ? "Ⅰ" : type === "three-card" ? "Ⅲ" : "Ⅶ"}</span>
                <strong>{spreadLabels[type]}</strong>
                <p>{spreadDescriptions[type]}</p>
              </button>
            ))}
          </div>
          <p className="selected-line">카드 수가 증가할수록 상황을 더욱 세밀하게 살펴볼 수 있습니다.</p>
          <div className="nav-row">
            <button className="ghost-action" onClick={() => setStep("topic")}>
              이전
            </button>
            <button
              className="primary-action compact"
              disabled={!canContinueSpread}
              onClick={() => spreadType && startShuffle(spreadType)}
            >
              카드 섞기
            </button>
          </div>
        </section>
      )}

      {step === "shuffle" && (
        <section className="stage reading-stage">
          <StepHeader
            title={isShuffling ? "카드를 섞고 있습니다" : "마음이 향하는 카드를 선택하세요"}
            subtitle={
              isShuffling
                ? currentMessage
                : `78장의 카드를 모두 섞었습니다. 전체 78장 · 선택 ${selectedCards.length}/${requiredCards}`
            }
          />
          {!isShuffling && (
            <div className="selection-slots" aria-label="선택한 카드 슬롯">
              {spreadPositions.slice(0, requiredCards).map((position, index) => {
                const card = selectedCards[index];
                return (
                  <button
                    key={position}
                    className={`selection-slot ${card ? "filled" : ""}`}
                    disabled={!card || isInteractionLocked}
                    onClick={() => card && toggleCard(card)}
                    aria-label={card ? `${index + 1}번째 선택 카드 취소` : `${position} 빈 슬롯`}
                  >
                    <span className="slot-card">{card ? index + 1 : ""}</span>
                    <strong>{position}</strong>
                  </button>
                );
              })}
            </div>
          )}
          <div className="tarot-grid-shell">
            <div
              className={`tarot-spread-viewport ${isShuffling ? "is-shuffling" : "is-ready"}`}
              role="group"
              aria-label="78장 타로 카드 선택판"
            >
              <div className="tarot-spread-track">
                {shuffledCards.map((card, index) => {
                  const selectedIndex = selectedCards.findIndex(
                    (selectedCard) => selectedCard.drawId === card.drawId,
                  );
                  const selected = selectedIndex >= 0;

                  return (
                    <RibbonCard
                      key={card.drawId}
                      card={card}
                      index={index}
                      selected={selected}
                      selectedIndex={selectedIndex}
                      disabled={isShuffling || isInteractionLocked}
                      onSelect={toggleCard}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {!isShuffling && (
            <p className="ribbon-help">
              78장의 카드 중 마음이 가는 카드를 선택하세요.
            </p>
          )}
          <div className="nav-row">
            <button
              className="ghost-action"
              onClick={() => {
                setStep("spread");
                setIsShuffling(false);
              }}
            >
              이전
            </button>
            <button
              className="ghost-action"
              disabled={isShuffling || isInteractionLocked}
              onClick={() => startShuffle(effectiveSpreadType)}
            >
              다시 섞기
            </button>
            <button
              className="primary-action compact"
              disabled={selectedCards.length !== requiredCards || isShuffling || isInteractionLocked}
              onClick={completeSelection}
            >
              {isPreparingReveal ? "카드 준비 중" : "선택 완료"}
            </button>
          </div>
        </section>
      )}

      {step === "reveal" && (
        <section className="stage">
          <StepHeader title="카드가 열리고 있습니다" subtitle="선택한 카드의 메시지를 확인합니다." />
          <div className={`reveal-row ${effectiveSpreadType === "seven-card" ? "seven-card-layout" : ""}`}>
            {selectedCards.map((card) => (
              <TarotCard
                key={card.drawId}
                card={card}
                revealed={revealedCards.some((item) => item.drawId === card.drawId)}
              />
            ))}
          </div>
        </section>
      )}

      {step === "loading" && (
        <section className="stage loading-stage" aria-live="polite">
          <div className="loading-content">
            <div className="oracle-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <StepHeader
              title="카드의 메시지를 해석 중입니다"
              subtitle="선택한 카드들의 흐름을 연결하고 있습니다."
              note="최대 2분 정도 소요될 수 있습니다."
            />
          </div>
        </section>
      )}

      {step === "result" && (
        <section className="stage result-stage">
          <div className="result-capture">
            <ResultHeader
              title={readingResult?.title ?? "타로 리딩 결과"}
              subtitle={getResultSubtitle(topicLabel, effectiveSpreadType)}
              meta={`${topicLabel} · ${spreadLabels[effectiveSpreadType]}`}
              question={effectiveQuestion}
            />
            <div className={`reveal-row result-cards ${effectiveSpreadType === "seven-card" ? "seven-card-layout" : ""}`}>
              {selectedCards.map((card) => (
                <TarotCard key={card.drawId} card={card} revealed />
              ))}
            </div>
            {readingError && (
              <div className="error-panel">
                <strong>{readingError}</strong>
                <p>기본 해석으로 결과를 표시했습니다. 설정을 확인한 뒤 다시 시도할 수 있습니다.</p>
              </div>
            )}
            {readingResult && (
              <article className="reading-copy">
                <section className="overall-panel">
                  <h2>전체 종합 해석</h2>
                  <ParagraphText text={readingResult.overallReading} />
                </section>
                <section className="highlight-grid" aria-label="핵심 흐름 한눈에 보기">
                  <HighlightItem title="현재 흐름" text={readingResult.highlights.currentFlow} />
                  <HighlightItem title="가장 큰 장애물" text={readingResult.highlights.mainObstacle} />
                  <HighlightItem title="열려 있는 가능성" text={readingResult.highlights.possibility} />
                  <HighlightItem title="지금 필요한 태도" text={readingResult.highlights.recommendedAttitude} />
                </section>
                <h2>카드 간 연결 해석</h2>
                <div className="card-reading-list">
                  <section className="card-reading-item">
                    <ParagraphText text={readingResult.cardConnection} />
                  </section>
                </div>
                <h2>현실적인 조언</h2>
                <ParagraphText text={readingResult.practicalAdvice} />
                <h2>지금 기억하면 좋은 한마디</h2>
                <blockquote>{readingResult.finalMessage}</blockquote>
                {readingResult.generatedBy === "fallback" && (
                  <p className="provider-note">기본 해석으로 생성됨</p>
                )}
              </article>
            )}
            <p className="disclaimer">
              이 타로 리딩은 오락과 자기 성찰을 위한 참고 콘텐츠입니다. 중요한 결정은 현실적인
              정보와 전문가의 조언을 함께 고려해주세요.
            </p>
          </div>
          {savedMessage && <p className="status-line" data-copy-exclude="true">{savedMessage}</p>}
          <div className="nav-row" data-copy-exclude="true">
            <button className="ghost-action" onClick={restart}>
              처음으로
            </button>
            {readingResult && (
              <button className="ghost-action" onClick={() => void copyCurrentReading()}>
                결과 이미지 복사
              </button>
            )}
            {readingError && (
              <>
                <button
                  className="ghost-action"
                  disabled={isLoadingReading}
                  onClick={() => void generateAiReading(selectedCards)}
                >
                  다시 시도
                </button>
                <button className="ghost-action" onClick={useTemporaryReading}>
                  기본 해석 보기
                </button>
              </>
            )}
            <button
              className="primary-action compact"
              onClick={() => {
                startShuffle(effectiveSpreadType);
              }}
            >
              다시 보기
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function StepHeader({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note?: string;
}) {
  return (
    <header className="step-header">
      <p className="eyebrow">Tarot Chamber</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {note && <p className="step-note">{note}</p>}
    </header>
  );
}

function getResultSubtitle(topicLabel: string, spreadType: SpreadType) {
  const spreadTone =
    spreadType === "one-card"
      ? "지금 마음에 가장 가까운 한 가지 흐름"
      : spreadType === "three-card"
        ? "과거와 현재, 가까운 가능성을 잇는 흐름"
        : "여러 마음의 결을 천천히 살펴보는 흐름";

  return `${topicLabel}을 달빛 아래 차분히 비추는 ${spreadTone}`;
}

function ResultHeader({
  title,
  subtitle,
  meta,
  question,
}: {
  title: string;
  subtitle: string;
  meta: string;
  question: string;
}) {
  return (
    <header className="result-hero">
      <p className="result-kicker">Tarot Chamber</p>
      <h1 title={title}>{title}</h1>
      <p className="result-subtitle">{subtitle}</p>
      <p className="result-meta">{meta}</p>
      <p className="question-line">"{question}"</p>
    </header>
  );
}

function ParagraphText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph}>
          {paragraph.split("\n").map((line, index, lines) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}

function HighlightItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="highlight-item">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

const RibbonCard = memo(function RibbonCard({
  card,
  index,
  selected,
  selectedIndex,
  disabled,
  onSelect,
}: {
  card: DrawnCard;
  index: number;
  selected: boolean;
  selectedIndex: number;
  disabled: boolean;
  onSelect: (card: DrawnCard) => void;
}) {
  return (
    <button
      className={`tarot-spread-card ${selected ? "picked" : ""}`}
      style={
        {
          "--i": index,
        } as React.CSSProperties
      }
      disabled={disabled}
      onClick={() => onSelect(card)}
      aria-label={`78장 중 ${index + 1}번째 카드 ${selected ? "선택 취소" : "선택"}`}
    >
      {selected && <span className="selection-badge">{selectedIndex + 1}</span>}
      <span className="card-image-fallback">✦</span>
      <img
        src={CARD_BACK_IMAGE}
        alt="타로 카드 뒷면"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </button>
  );
});

function TarotCard({ card, revealed }: { card: DrawnCard; revealed: boolean }) {
  return (
    <div className={`tarot-card ${revealed ? "revealed" : ""}`}>
      <div className="tarot-inner">
        <div className="tarot-face tarot-back">
          <span className="card-image-fallback">✦</span>
          <img
            src={CARD_BACK_IMAGE}
            alt="타로 카드 뒷면"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="tarot-face tarot-front">
          <span className="card-image-fallback">{card.koreanName}</span>
          <img
            src={card.image}
            alt={`${card.name} ${card.orientation === "upright" ? "정방향" : "역방향"}`}
            className={card.isReversed ? "reversed" : ""}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>
      <span className="card-caption">{card.position}</span>
      <span className="card-meta">
        {card.selectionOrder ? `${card.selectionOrder}. ` : ""}
        {card.name} · {card.orientation === "upright" ? "정방향" : "역방향"}
      </span>
    </div>
  );
}
