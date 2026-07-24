import { GoogleGenAI } from "@google/genai";
import express from "express";
import rateLimit from "express-rate-limit";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = join(rootDir, "dist");

loadEnv(join(rootDir, ".env"));

const app = express();
const PORT = Number(process.env.PORT) || 8787;
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const geminiApiKey = getGeminiApiKey();
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin ?? "http://localhost:5173");
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: "50kb" }));

app.use(
  "/api/tarot/reading",
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 10 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "현재 AI 해석 요청이 많아 잠시 이용이 어렵습니다. 잠시 후 다시 시도해주세요.",
      },
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "tarot-api",
    provider: "gemini",
    model: geminiModel,
    hasApiKey: Boolean(geminiApiKey),
  });
});

app.post(["/api/tarot/reading", "/api/reading"], async (req, res) => {
  const sanitizedBody = sanitizeReadingRequest(req.body);
  const validationError = validateReadingRequest(sanitizedBody);

  if (validationError) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REQUEST",
        message: validationError,
      },
    });
    return;
  }

  if (!geminiApiKey) {
    res.json({
      success: true,
      data: createFallbackReading(sanitizedBody),
    });
    return;
  }

  try {
    const result = await createGeminiReading(sanitizedBody);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const status = getErrorStatus(error);
    const message =
      status === 401 || status === 403
        ? "AI 해석 서비스 인증에 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        : status === 429
          ? "현재 AI 해석 요청이 많아 잠시 이용이 어렵습니다. 잠시 후 다시 시도해주세요."
          : "타로 해석을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.";

    console.error("Gemini request failed", {
      status,
      message: error instanceof Error ? error.message : String(error),
    });

    res.status(status === 429 ? 429 : status === 401 || status === 403 ? status : 200).json({
      success: status !== 401 && status !== 403 && status !== 429,
      data: createFallbackReading(sanitizedBody),
      error: {
        code: status === 429 ? "RATE_LIMITED" : "AI_REQUEST_FAILED",
        message,
      },
    });
  }
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    res.sendFile(join(distDir, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error("Server error", error);
  res.status(500).json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: "타로 해석을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    },
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tarot API server listening on 0.0.0.0:${PORT}`);
});

server.on("error", (error) => {
  console.error("Tarot API server error", error);
});

server.on("close", () => {
  console.log("Tarot API server closed");
});

async function createGeminiReading(input) {
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
  });

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: createPrompt(input),
  });

  const parsed = parseGeminiJson(response.text ?? "");
  if (!isValidReadingResult(parsed, input.cards.length)) {
    return createFallbackReading(input);
  }

  return {
    ...parsed,
    disclaimer:
      parsed.disclaimer ||
      "이 타로 리딩은 오락과 자기 성찰을 위한 참고 콘텐츠입니다.",
    generatedBy: "gemini",
  };
}

function createPrompt(input) {
  return [
    "당신은 사용자가 선택한 타로카드의 상징을 바탕으로 자기 성찰을 돕는 타로 리딩 도우미입니다.",
    "",
    "당신의 역할은 미래를 확정적으로 예언하는 것이 아니라, 사용자의 질문과 카드 조합을 자연스럽게 연결하여 현재의 감정, 상황의 흐름, 주의할 점, 현실적인 행동 방향을 따뜻하게 설명하는 것입니다.",
    "",
    "[말투 규칙]",
    "1. 모든 답변은 자연스럽고 부드러운 한국어 존댓말로 작성하세요.",
    "2. 보고서나 교과서처럼 딱딱한 말투를 사용하지 마세요.",
    "3. 너무 친구처럼 가볍거나 반말에 가까운 표현은 사용하지 마세요.",
    "4. 사용자의 이야기를 편안하게 들어주는 사람처럼 말하세요.",
    "5. 따뜻하고 친근하지만 신뢰감 있는 말투를 유지하세요.",
    "6. `~로 해석할 수 있습니다`라는 표현을 반복하지 마세요.",
    "7. `~로 보여요`, `~일 수 있어요`, `~에 가까워 보여요`, `~가 중요해 보여요`, `~를 한 번 살펴볼 필요가 있어요` 등의 표현을 자연스럽게 섞어 사용하세요.",
    "8. 같은 문단에서 동일한 문장 종결 표현을 반복하지 마세요.",
    "9. `당신`이라는 표현을 반복해서 사용하지 마세요.",
    "10. 사용자의 감정을 사실처럼 단정하지 마세요.",
    "",
    "[해석 규칙]",
    "1. 사용자의 질문이 해석의 중심이 되어야 합니다.",
    "2. 카드의 사전적 키워드만 나열하지 마세요.",
    "3. 각 카드의 위치, 방향, 상징을 사용자의 질문과 연결하세요.",
    "4. 서로 다른 카드에 동일하거나 거의 동일한 해석 문장을 반복하지 마세요.",
    "5. 각 카드의 고유한 의미를 반영하여 개별적인 설명을 작성하세요.",
    "6. 카드별 설명만 나열하지 말고 전체 카드의 흐름을 하나의 이야기처럼 연결하세요.",
    "7. 전체 종합 해석은 결과에서 가장 중요한 영역입니다.",
    "8. 서로 비슷한 카드와 충돌하는 카드를 함께 분석하세요.",
    "9. 정방향과 역방향이 전체 흐름에 어떤 차이를 만드는지 설명하세요.",
    "10. 사용자가 실제로 할 수 있는 구체적이고 부담 없는 조언을 제공하세요.",
    "11. 상대방의 감정은 가능성의 표현으로만 설명하세요.",
    "12. 미래는 확정하지 말고 현재 흐름과 바뀔 수 있는 가능성으로 설명하세요.",
    "",
    "[주제별 해석 방향]",
    "연애운과 상대방의 마음은 감정을 단정하지 말고 소통 방식, 감정 속도, 관계의 균형을 중심으로 설명하세요.",
    "재물운은 수익을 보장하지 말고 소비 습관, 기회, 위험 관리, 준비 상태를 중심으로 설명하세요.",
    "진로운과 학업운은 합격이나 취업을 확정하지 말고 강점, 불안 요소, 준비 상태, 실천 방향을 연결하세요.",
    "인간관계는 상대의 의도를 확정하지 말고 오해, 거리감, 소통 방식, 경계 설정을 중심으로 설명하세요.",
    "오늘의 운세는 사건을 단정하지 말고 오늘의 감정 흐름, 주의할 행동, 활용할 기회를 중심으로 설명하세요.",
    "",
    "[금지 표현]",
    "반드시 연락이 옵니다. 무조건 재회합니다. 상대방은 당신을 사랑합니다. 이 관계는 반드시 끝납니다. 다음 달에 합격합니다. 큰돈을 벌게 됩니다. 사고가 발생합니다. 병이 생겼습니다. 임신하게 됩니다. 운명적으로 정해져 있습니다.",
    "",
    "[권장 표현]",
    "연락 가능성이 완전히 닫힌 흐름은 아니에요. 상대방에게 아직 정리되지 않은 감정이 남아 있을 가능성은 있어 보여요. 현재는 결론보다 서로의 감정 속도를 살펴보는 것이 중요해 보여요. 지금 흐름은 행동 방식에 따라 달라질 여지가 있어요. 당장 답을 얻으려 하기보다 부담 없는 방식으로 상황을 확인해보는 편이 좋아 보여요.",
    "",
    "반환 JSON 구조:",
    JSON.stringify(
      {
        title: "리딩 전체를 나타내는 자연스러운 제목",
        overallReading: "선택된 모든 카드를 연결한 충분한 분량의 전체 종합 해석",
        highlights: {
          currentFlow: "현재 가장 큰 흐름",
          mainObstacle: "현재 가장 큰 장애물",
          possibility: "열려 있는 가능성",
          recommendedAttitude: "지금 필요한 태도",
        },
        cardReadings: [
          {
            position: "카드 위치",
            cardName: "영문 카드 이름",
            koreanName: "한국어 카드 이름",
            orientation: "upright 또는 reversed",
            interpretation: "해당 카드 위치와 질문에 맞춘 자연스럽고 고유한 해석",
          },
        ],
        cardConnection: "카드들이 서로 어떤 영향을 주고받는지 연결한 해석",
        practicalAdvice: "사용자가 현실에서 실천할 수 있는 구체적인 조언",
        finalMessage: "따뜻하지만 과장되지 않은 한두 문장의 마무리 메시지",
        disclaimer: "이 타로 리딩은 오락과 자기 성찰을 위한 참고 콘텐츠입니다.",
        generatedBy: "gemini",
      },
      null,
      2,
    ),
    "",
    "[분량 규칙]",
    "카드별 해석 interpretation은 카드마다 정확히 3문장으로 작성하세요.",
    "카드별 해석은 문장 사이에 줄바꿈을 넣어 3줄처럼 보이게 하세요.",
    "한 장 리딩: overallReading은 2~3문단, practicalAdvice는 2~4문장으로 작성하세요.",
    "세 장 리딩: overallReading은 3~5문단, cardConnection은 2~4문단, practicalAdvice는 3~5문장으로 작성하세요.",
    "일곱 장 리딩: overallReading은 5~8문단, cardConnection은 3~5문단, practicalAdvice는 4~6문장으로 작성하세요.",
    "",
    "JSON 앞뒤에 설명, 인사말, 마크다운 코드 블록을 추가하지 마세요.",
    "",
    "리딩 데이터:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}

function sanitizeReadingRequest(body) {
  if (!body || typeof body !== "object") return body;

  return {
    topic: cleanText(body.topic, 50),
    question: cleanText(body.question, 200),
    spreadType: body.spreadType,
    cards: Array.isArray(body.cards)
      ? body.cards.map((card) => ({
          position: cleanText(card.position, 60),
          name: cleanText(card.name, 80),
          koreanName: cleanText(card.koreanName, 80),
          orientation: card.orientation,
          isReversed: card.isReversed === true,
          keywords: Array.isArray(card.keywords)
            ? card.keywords.map((keyword) => cleanText(keyword, 30)).filter(Boolean).slice(0, 5)
            : [],
          meaning: cleanText(card.meaning, 220),
        }))
      : body.cards,
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function validateReadingRequest(body) {
  const allowedTopics = new Set([
    "연애운",
    "재물운",
    "진로운",
    "학업운",
    "인간관계",
    "오늘의 운세",
    "상대방의 마음",
    "직접 질문",
  ]);

  if (!body || typeof body !== "object") return "요청 본문이 올바르지 않습니다.";
  if (!body.topic || !allowedTopics.has(body.topic)) return "상담 주제가 올바르지 않습니다.";
  if (typeof body.question !== "string" || body.question.length > 200) {
    return "질문은 200자 이하로 입력해주세요.";
  }
  if (!["one-card", "three-card", "seven-card"].includes(body.spreadType)) {
    return "카드 배열이 올바르지 않습니다.";
  }
  if (!Array.isArray(body.cards)) return "카드 정보가 올바르지 않습니다.";

  const expectedCount =
    body.spreadType === "one-card" ? 1 : body.spreadType === "three-card" ? 3 : 7;
  if (body.cards.length !== expectedCount) return `${expectedCount}장의 카드가 필요합니다.`;

  for (const card of body.cards) {
    if (!card || typeof card !== "object") return "카드 정보가 올바르지 않습니다.";
    if (!card.position) return "카드 위치가 올바르지 않습니다.";
    if (!card.name || !card.koreanName) return "카드 이름이 올바르지 않습니다.";
    if (!["upright", "reversed"].includes(card.orientation)) {
      return "카드 방향이 올바르지 않습니다.";
    }
    if (!Array.isArray(card.keywords)) return "카드 키워드가 올바르지 않습니다.";
    if (typeof card.meaning !== "string") return "카드 의미가 올바르지 않습니다.";
  }

  return null;
}

function parseGeminiJson(text) {
  try {
    const withoutCodeBlock = text.replace(/```json|```/g, "").trim();
    const start = withoutCodeBlock.indexOf("{");
    const end = withoutCodeBlock.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(withoutCodeBlock.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isValidReadingResult(value, expectedCards) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.title !== "string") return false;
  if (typeof value.overallReading !== "string") return false;
  if (!value.highlights || typeof value.highlights !== "object") return false;
  if (typeof value.highlights.currentFlow !== "string") return false;
  if (typeof value.highlights.mainObstacle !== "string") return false;
  if (typeof value.highlights.possibility !== "string") return false;
  if (typeof value.highlights.recommendedAttitude !== "string") return false;
  if (!Array.isArray(value.cardReadings) || value.cardReadings.length !== expectedCards) return false;
  if (typeof value.cardConnection !== "string") return false;
  if (typeof value.practicalAdvice !== "string") return false;
  if (typeof value.finalMessage !== "string") return false;

  return value.cardReadings.every(
    (card) =>
      card &&
      typeof card.position === "string" &&
      typeof card.cardName === "string" &&
      typeof card.koreanName === "string" &&
      ["upright", "reversed"].includes(card.orientation) &&
      typeof card.interpretation === "string",
  );
}

function createFallbackReading(input) {
  const firstCard = input.cards[0];
  const firstKeyword = firstCard?.keywords?.[0] || "흐름";
  const questionText = input.question ? `「${input.question}」라는 질문` : `${input.topic}의 흐름`;
  const paragraphCount =
    input.spreadType === "seven-card" ? 5 : input.spreadType === "three-card" ? 3 : 2;
  const overallParagraphs = [
    `전체 흐름을 보면, ${questionText}은 지금 바로 한 가지 결론으로 정리하기보다 감정과 현실을 나누어 살펴보는 쪽에 가까워 보여요. 가장 먼저 보이는 ${firstKeyword}의 흐름은 현재 상황에서 무엇을 붙잡고 있고, 무엇을 조금 내려놓아야 하는지 차분히 확인해보라고 말해줘요.`,
    `카드들이 공통적으로 보여주는 건 결과를 빨리 확인하려는 마음보다 현재의 태도와 선택 방식이 더 중요하다는 점이에요. 질문에 대한 답은 완전히 닫혀 있다거나 이미 정해져 있다기보다, 지금 어떤 방식으로 움직이느냐에 따라 달라질 여지가 있어 보여요.`,
    `여러 장의 카드를 함께 보면 마음이 향하는 방향과 현실적인 장애물이 서로 영향을 주고 있어요. 그래서 지금은 기대하는 답만 보려고 하기보다, 반복되는 패턴이나 작은 불편함까지 같이 살펴보는 편이 좋아 보여요.`,
    `일곱 장의 흐름에서는 과거의 영향, 숨겨진 마음, 가까운 미래의 가능성이 한 줄로 이어져 보여요. 겉으로 드러난 상황만 보고 판단하면 중요한 부분을 놓칠 수 있으니, 내 마음이 조급해지는 순간과 실제로 확인된 사실을 구분해보는 것이 필요해 보여요.`,
    `가까운 흐름은 고정된 결과라기보다 조금씩 조정할 수 있는 상태에 가까워요. 무리해서 상황을 밀어붙이기보다 부담 없는 행동부터 시도하고, 반응을 보면서 다음 단계를 정하는 편이 더 안정적일 수 있어요.`,
  ];

  return {
    title: "결론보다 현재의 흐름을 먼저 살펴볼 때",
    overallReading: overallParagraphs.slice(0, paragraphCount).join("\n\n"),
    highlights: {
      currentFlow: `${firstKeyword}의 흐름이 중심에 있어요. 지금은 답을 확정하기보다 상황의 온도를 천천히 확인하는 시점으로 보여요.`,
      mainObstacle: "조급함이나 추측이 커지면 실제 신호보다 마음의 불안이 앞설 수 있어요.",
      possibility: "대화 방식, 준비 정도, 감정의 속도에 따라 달라질 여지는 남아 있어요.",
      recommendedAttitude: "내가 알고 있는 사실과 바라는 마음을 구분하면서 차분히 움직이는 태도가 좋아 보여요.",
    },
    cardReadings: input.cards.map((card, index) => ({
      position: card.position,
      cardName: card.name,
      koreanName: card.koreanName,
      orientation: card.orientation,
      interpretation: createFallbackCardReading(card, index, questionText),
    })),
    cardConnection:
      input.spreadType === "one-card"
        ? "이번 한 장은 지금 가장 먼저 살펴야 할 태도를 압축해서 보여줘요. 카드가 말하는 핵심은 결과를 맞히는 것보다, 현재 마음이 어디에 힘을 쓰고 있는지 알아차리는 데 있어 보여요."
        : "카드들을 함께 보면 앞 카드의 감정 흐름이 뒤 카드의 가능성에 영향을 주고 있어요. 어떤 카드는 움직임을 만들 수 있다고 말하지만, 다른 카드는 그 움직임이 조급함에서 나오면 오히려 흐름이 흐려질 수 있다고 알려줘요.\n\n그래서 지금은 한 장씩 따로 보는 것보다, 반복해서 나타나는 감정과 행동 방식을 함께 살펴보는 편이 좋아 보여요. 특히 정방향 카드는 활용할 수 있는 힘을, 역방향 카드는 속도를 늦추고 점검해야 할 부분을 알려주는 역할에 가까워요.",
    practicalAdvice:
      "지금 바로 큰 결정을 내리기보다는 먼저 현재 확인된 사실과 내 추측을 나눠 적어보세요. 연락이나 제안을 해야 한다면 감정을 한꺼번에 전하기보다 짧고 부담 없는 방식이 더 좋아 보여요. 반응이 늦거나 기대와 다르더라도 곧바로 결론을 내리지 말고, 내가 감당할 수 있는 거리 안에서 다음 행동을 정해보는 편이 좋겠어요.",
    finalMessage:
      "답을 서두르지 않아도 괜찮아요. 지금은 상황의 결론보다 내 마음의 속도를 이해하는 일이 더 중요할 수 있어요.",
    disclaimer: "이 타로 리딩은 오락과 자기 성찰을 위한 참고 콘텐츠입니다.",
    generatedBy: "fallback",
  };
}

function createFallbackCardReading(card, index, questionText) {
  const primaryKeyword = card.keywords[0] || "흐름";
  const secondaryKeyword = card.keywords[1] || primaryKeyword;
  const meaning = card.meaning || "지금은 상황을 서두르지 않고 차분히 살펴볼 필요가 있어요.";
  const directionText = card.orientation === "upright" ? "정방향" : "역방향";
  const openers = [
    `${card.position}에 나온 ${card.koreanName} ${directionText}은 ${primaryKeyword}의 흐름을 먼저 보여줘요.`,
    `${card.koreanName} 카드가 ${card.position} 자리에 놓인 걸 보면, ${primaryKeyword}와 관련된 부분을 한 번 살펴볼 필요가 있어 보여요.`,
    `이 위치의 ${card.koreanName} ${directionText}은 겉으로 드러난 결과보다 ${secondaryKeyword}의 태도가 더 중요하다고 말해줘요.`,
  ];
  const bridge =
    card.orientation === "upright"
      ? `${questionText}과 연결하면, 이 카드는 아직 활용할 수 있는 힘이나 가능성이 남아 있다는 쪽에 가까워요.`
      : `${questionText}과 연결하면, 이 카드는 마음이 급해지거나 같은 패턴을 반복하지 않도록 속도를 늦춰보라는 신호에 가까워요.`;
  const advice = `${meaning} 그래서 지금은 ${secondaryKeyword}에만 마음을 빼앗기기보다, 실제 상황에서 확인할 수 있는 작은 변화와 내 반응을 함께 살펴보는 편이 좋아 보여요.`;

  return `${openers[index % openers.length]}\n${bridge}\n${advice}`;
}

function getErrorStatus(error) {
  if (typeof error === "object" && error !== null) {
    const maybeStatus = error.status ?? error.code;
    const numericStatus = Number(maybeStatus);
    if (Number.isFinite(numericStatus)) return numericStatus;
  }
  return 500;
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey === "여기에_실제_Gemini_API_키") {
    return "";
  }
  return apiKey;
}

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
