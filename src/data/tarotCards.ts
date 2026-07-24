import type { TarotCardData } from "../types/tarot";

export const CARD_BACK_IMAGE = "/cards/78.png";

const majorArcanaCards: TarotCardData[] = [
  {
    id: 0,
    arcana: "major",
    suit: null,
    number: 0,
    name: "The Fool",
    koreanName: "바보",
    image: "/cards/0.png",
    uprightKeywords: ["시작", "자유", "모험", "가능성"],
    reversedKeywords: ["무모함", "불안정", "준비 부족", "회피"],
    uprightMeaning: "새로운 흐름 앞에서 가볍게 첫걸음을 내딛는 에너지입니다.",
    reversedMeaning: "충동만 앞서거나 준비 없이 움직이기 쉬운 흐름입니다.",
  },
  {
    id: 1,
    arcana: "major",
    suit: null,
    number: 1,
    name: "The Magician",
    koreanName: "마법사",
    image: "/cards/1.png",
    uprightKeywords: ["실행력", "재능", "집중", "기회"],
    reversedKeywords: ["기만", "산만함", "미숙함", "과장"],
    uprightMeaning: "이미 가진 자원을 현실로 바꿀 수 있는 능동적인 카드입니다.",
    reversedMeaning: "말과 계획은 많지만 실제 실행이 흐려질 수 있음을 말합니다.",
  },
  {
    id: 2,
    arcana: "major",
    suit: null,
    number: 2,
    name: "The High Priestess",
    koreanName: "여사제",
    image: "/cards/2.png",
    uprightKeywords: ["직감", "비밀", "내면", "침묵"],
    reversedKeywords: ["혼란", "숨겨진 감정", "불신", "단절"],
    uprightMeaning: "드러난 정보보다 마음 깊은 곳의 감각을 살피라는 신호입니다.",
    reversedMeaning: "직감을 외면하거나 중요한 감정을 억누르고 있을 수 있습니다.",
  },
  {
    id: 3,
    arcana: "major",
    suit: null,
    number: 3,
    name: "The Empress",
    koreanName: "여황제",
    image: "/cards/3.png",
    uprightKeywords: ["풍요", "매력", "성장", "돌봄"],
    reversedKeywords: ["집착", "소진", "과잉보호", "정체"],
    uprightMeaning: "관계와 일이 자연스럽게 자라나는 따뜻한 생산성의 카드입니다.",
    reversedMeaning: "너무 많이 주거나 결과를 재촉하며 균형을 잃기 쉽습니다.",
  },
  {
    id: 4,
    arcana: "major",
    suit: null,
    number: 4,
    name: "The Emperor",
    koreanName: "황제",
    image: "/cards/4.png",
    uprightKeywords: ["질서", "책임", "안정", "주도권"],
    reversedKeywords: ["강압", "고집", "통제", "불안정"],
    uprightMeaning: "기준을 세우고 현실적인 구조를 만들 때 힘이 생깁니다.",
    reversedMeaning: "통제하려는 마음이 커지면 오히려 흐름이 경직될 수 있습니다.",
  },
  {
    id: 5,
    arcana: "major",
    suit: null,
    number: 5,
    name: "The Hierophant",
    koreanName: "교황",
    image: "/cards/5.png",
    uprightKeywords: ["조언", "전통", "배움", "신뢰"],
    reversedKeywords: ["답답함", "관습 탈피", "불일치", "의심"],
    uprightMeaning: "검증된 방식과 믿을 만한 조언이 도움이 되는 흐름입니다.",
    reversedMeaning: "남의 기준에 맞추느라 자신의 답을 놓치기 쉬운 상태입니다.",
  },
  {
    id: 6,
    arcana: "major",
    suit: null,
    number: 6,
    name: "The Lovers",
    koreanName: "연인",
    image: "/cards/6.png",
    uprightKeywords: ["끌림", "선택", "조화", "진심"],
    reversedKeywords: ["갈등", "엇갈림", "우유부단", "불균형"],
    uprightMeaning: "마음이 향하는 곳과 현실적 선택 사이의 조화를 말합니다.",
    reversedMeaning: "서로의 기대가 어긋나거나 선택을 미루고 있을 수 있습니다.",
  },
  {
    id: 7,
    arcana: "major",
    suit: null,
    number: 7,
    name: "The Chariot",
    koreanName: "전차",
    image: "/cards/7.png",
    uprightKeywords: ["전진", "의지", "승부", "돌파"],
    reversedKeywords: ["성급함", "방향 상실", "무리", "지연"],
    uprightMeaning: "명확한 목표를 잡으면 빠르게 앞으로 나아갈 수 있습니다.",
    reversedMeaning: "속도보다 방향 점검이 먼저 필요한 흐름입니다.",
  },
  {
    id: 8,
    arcana: "major",
    suit: null,
    number: 8,
    name: "Strength",
    koreanName: "힘",
    image: "/cards/8.png",
    uprightKeywords: ["용기", "인내", "부드러운 힘", "회복"],
    reversedKeywords: ["불안", "자기 의심", "감정 폭발", "소진"],
    uprightMeaning: "밀어붙이는 힘보다 차분히 버티는 힘이 더 유효합니다.",
    reversedMeaning: "스스로를 몰아세우기보다 에너지를 회복할 필요가 있습니다.",
  },
  {
    id: 9,
    arcana: "major",
    suit: null,
    number: 9,
    name: "The Hermit",
    koreanName: "은둔자",
    image: "/cards/9.png",
    uprightKeywords: ["성찰", "거리두기", "내면 탐색", "신중함"],
    reversedKeywords: ["고립", "회피", "외로움", "닫힌 마음"],
    uprightMeaning: "잠시 물러서서 진짜 원하는 답을 찾는 시간이 필요합니다.",
    reversedMeaning: "혼자만의 시간이 길어져 소통이 끊길 수 있음을 말합니다.",
  },
  {
    id: 10,
    arcana: "major",
    suit: null,
    number: 10,
    name: "Wheel of Fortune",
    koreanName: "운명의 수레바퀴",
    image: "/cards/10.png",
    uprightKeywords: ["전환", "기회", "흐름", "변화"],
    reversedKeywords: ["지연", "반복", "저항", "엇박자"],
    uprightMeaning: "상황이 바뀌는 국면이며 새로운 흐름을 탈 수 있습니다.",
    reversedMeaning: "같은 패턴이 반복되는 이유를 살펴볼 필요가 있습니다.",
  },
  {
    id: 11,
    arcana: "major",
    suit: null,
    number: 11,
    name: "Justice",
    koreanName: "정의",
    image: "/cards/11.png",
    uprightKeywords: ["균형", "판단", "책임", "공정함"],
    reversedKeywords: ["불공정", "회피", "왜곡", "불균형"],
    uprightMeaning: "감정보다 사실과 책임을 기준으로 판단해야 하는 카드입니다.",
    reversedMeaning: "한쪽으로 기울어진 판단이나 회피가 문제를 키울 수 있습니다.",
  },
  {
    id: 12,
    arcana: "major",
    suit: null,
    number: 12,
    name: "The Hanged Man",
    koreanName: "매달린 사람",
    image: "/cards/12.png",
    uprightKeywords: ["기다림", "관점 전환", "멈춤", "수용"],
    reversedKeywords: ["정체", "희생감", "고집", "답답함"],
    uprightMeaning: "지금은 억지로 움직이기보다 시야를 바꿔야 하는 때입니다.",
    reversedMeaning: "멈춤이 배움이 되지 못하고 답답함으로만 쌓일 수 있습니다.",
  },
  {
    id: 13,
    arcana: "major",
    suit: null,
    number: 13,
    name: "Death",
    koreanName: "죽음",
    image: "/cards/13.png",
    uprightKeywords: ["종료", "전환", "비움", "재탄생"],
    reversedKeywords: ["미련", "변화 저항", "정리 지연", "두려움"],
    uprightMeaning: "끝내야 새롭게 시작되는 강한 전환의 흐름입니다.",
    reversedMeaning: "이미 끝난 방식을 붙잡아 변화가 늦어질 수 있습니다.",
  },
  {
    id: 14,
    arcana: "major",
    suit: null,
    number: 14,
    name: "Temperance",
    koreanName: "절제",
    image: "/cards/14.png",
    uprightKeywords: ["조율", "균형", "회복", "차분함"],
    reversedKeywords: ["과함", "불균형", "조급함", "흐트러짐"],
    uprightMeaning: "서두르지 않고 적절한 속도를 찾으면 안정됩니다.",
    reversedMeaning: "감정이나 일정이 한쪽으로 치우쳐 조율이 필요합니다.",
  },
  {
    id: 15,
    arcana: "major",
    suit: null,
    number: 15,
    name: "The Devil",
    koreanName: "악마",
    image: "/cards/15.png",
    uprightKeywords: ["집착", "유혹", "속박", "욕망"],
    reversedKeywords: ["해방", "자각", "끊어내기", "거리두기"],
    uprightMeaning: "끌리지만 나를 묶는 패턴을 의식해야 하는 카드입니다.",
    reversedMeaning: "익숙한 집착에서 벗어나려는 자각이 시작되고 있습니다.",
  },
  {
    id: 16,
    arcana: "major",
    suit: null,
    number: 16,
    name: "The Tower",
    koreanName: "탑",
    image: "/cards/16.png",
    uprightKeywords: ["충격", "붕괴", "각성", "급변"],
    reversedKeywords: ["위기 회피", "내부 균열", "불안", "늦은 정리"],
    uprightMeaning: "불안정한 구조가 드러나며 현실을 새롭게 보게 됩니다.",
    reversedMeaning: "문제가 표면화되기 전 조용히 정비할 필요가 있습니다.",
  },
  {
    id: 17,
    arcana: "major",
    suit: null,
    number: 17,
    name: "The Star",
    koreanName: "별",
    image: "/cards/17.png",
    uprightKeywords: ["희망", "회복", "영감", "기대"],
    reversedKeywords: ["낙담", "불신", "기대 저하", "불안"],
    uprightMeaning: "상처 뒤에도 회복과 기대를 다시 품게 하는 카드입니다.",
    reversedMeaning: "희망은 있지만 스스로 믿기 어려운 마음이 커질 수 있습니다.",
  },
  {
    id: 18,
    arcana: "major",
    suit: null,
    number: 18,
    name: "The Moon",
    koreanName: "달",
    image: "/cards/18.png",
    uprightKeywords: ["불확실성", "감정", "꿈", "직감"],
    reversedKeywords: ["오해 해소", "드러남", "불안 완화", "현실 확인"],
    uprightMeaning: "아직 보이지 않는 감정과 불확실성이 많은 상황입니다.",
    reversedMeaning: "흐릿했던 일이 조금씩 드러나며 판단이 선명해질 수 있습니다.",
  },
  {
    id: 19,
    arcana: "major",
    suit: null,
    number: 19,
    name: "The Sun",
    koreanName: "태양",
    image: "/cards/19.png",
    uprightKeywords: ["활력", "기쁨", "성취", "명료함"],
    reversedKeywords: ["지연된 기쁨", "과신", "피로", "작은 막힘"],
    uprightMeaning: "밝게 드러나는 성과와 긍정적인 에너지를 상징합니다.",
    reversedMeaning: "좋은 가능성은 있으나 속도나 기대치를 조절해야 합니다.",
  },
  {
    id: 20,
    arcana: "major",
    suit: null,
    number: 20,
    name: "Judgement",
    koreanName: "심판",
    image: "/cards/20.png",
    uprightKeywords: ["결정", "부름", "회복", "재평가"],
    reversedKeywords: ["미루기", "자책", "판단 회피", "망설임"],
    uprightMeaning: "지난 일을 돌아보고 다음 단계로 넘어갈 결정을 뜻합니다.",
    reversedMeaning: "스스로를 지나치게 판단하며 결정을 미루기 쉽습니다.",
  },
  {
    id: 21,
    arcana: "major",
    suit: null,
    number: 21,
    name: "The World",
    koreanName: "세계",
    image: "/cards/21.png",
    uprightKeywords: ["완성", "통합", "확장", "성취"],
    reversedKeywords: ["미완성", "마무리 부족", "지연", "좁은 시야"],
    uprightMeaning: "한 사이클이 완성되고 더 넓은 가능성으로 이어집니다.",
    reversedMeaning: "끝맺음이 덜 되어 다음 단계로 가기 전 정리가 필요합니다.",
  },
];

type MinorSuit = NonNullable<TarotCardData["suit"]>;

const suitMeta: Record<
  MinorSuit,
  {
    koreanSuit: string;
    folder: string;
    theme: string;
    upright: string[];
    reversed: string[];
  }
> = {
  wands: {
    koreanSuit: "완드",
    folder: "wands",
    theme: "열정과 실행력",
    upright: ["열정", "추진력", "성장", "도전"],
    reversed: ["지연", "소진", "충동", "방향 혼란"],
  },
  cups: {
    koreanSuit: "컵",
    folder: "cups",
    theme: "감정과 관계",
    upright: ["감정", "공감", "관계", "치유"],
    reversed: ["감정 기복", "오해", "회피", "미련"],
  },
  swords: {
    koreanSuit: "소드",
    folder: "swords",
    theme: "생각과 판단",
    upright: ["판단", "소통", "분석", "결정"],
    reversed: ["혼란", "날선 말", "불안", "회피"],
  },
  pentacles: {
    koreanSuit: "펜타클",
    folder: "pentacles",
    theme: "현실과 안정",
    upright: ["현실감", "안정", "성과", "관리"],
    reversed: ["불안정", "손실 우려", "정체", "관리 부족"],
  },
};

const minorRanks = [
  { number: 1, name: "Ace", koreanName: "에이스", upright: "새로운 씨앗", reversed: "시작 지연" },
  { number: 2, name: "Two", koreanName: "2", upright: "균형과 선택", reversed: "망설임" },
  { number: 3, name: "Three", koreanName: "3", upright: "확장과 협력", reversed: "엇갈림" },
  { number: 4, name: "Four", koreanName: "4", upright: "안정과 정리", reversed: "정체" },
  { number: 5, name: "Five", koreanName: "5", upright: "변화와 갈등", reversed: "회복의 실마리" },
  { number: 6, name: "Six", koreanName: "6", upright: "조화와 회복", reversed: "과거 집착" },
  { number: 7, name: "Seven", koreanName: "7", upright: "점검과 인내", reversed: "불안한 선택" },
  { number: 8, name: "Eight", koreanName: "8", upright: "움직임과 집중", reversed: "흐름 지연" },
  { number: 9, name: "Nine", koreanName: "9", upright: "성숙과 결실", reversed: "불만족" },
  { number: 10, name: "Ten", koreanName: "10", upright: "완성과 부담", reversed: "과부하" },
  { number: 11, name: "Page", koreanName: "페이지", upright: "호기심과 소식", reversed: "미숙함" },
  { number: 12, name: "Knight", koreanName: "나이트", upright: "행동과 전진", reversed: "성급함" },
  { number: 13, name: "Queen", koreanName: "퀸", upright: "수용과 돌봄", reversed: "감정 과잉" },
  { number: 14, name: "King", koreanName: "킹", upright: "주도권과 책임", reversed: "경직됨" },
];

function createMinorArcanaCards(): TarotCardData[] {
  return (Object.keys(suitMeta) as MinorSuit[]).flatMap((suit, suitIndex) => {
    const meta = suitMeta[suit];

    return minorRanks.map((rank) => ({
      id: 22 + suitIndex * 14 + rank.number - 1,
      arcana: "minor" as const,
      suit,
      number: rank.number,
      name: `${rank.name} of ${meta.koreanSuit === "완드" ? "Wands" : meta.koreanSuit === "컵" ? "Cups" : meta.koreanSuit === "소드" ? "Swords" : "Pentacles"}`,
      koreanName: `${meta.koreanSuit} ${rank.koreanName}`,
      image: `/cards/${22 + suitIndex * 14 + rank.number - 1}.png`,
      uprightKeywords: [rank.upright, ...meta.upright].slice(0, 4),
      reversedKeywords: [rank.reversed, ...meta.reversed].slice(0, 4),
      uprightMeaning: `${meta.koreanSuit} ${rank.koreanName} 카드는 ${meta.theme} 안에서 ${rank.upright}의 흐름을 보여줍니다.`,
      reversedMeaning: `${meta.koreanSuit} ${rank.koreanName} 역방향은 ${meta.theme} 안에서 ${rank.reversed}을 먼저 점검하라는 신호입니다.`,
    }));
  });
}

export const tarotCards: TarotCardData[] = [...majorArcanaCards, ...createMinorArcanaCards()].map(
  (card) => ({
    ...card,
    image: `/cards/${card.id}.png`,
  }),
);

if (import.meta.env?.DEV) {
  if (tarotCards.length !== 78) {
    console.warn(`타로 카드 데이터가 78장이 아닙니다. 현재 ${tarotCards.length}장입니다.`);
  }

  const uniqueIds = new Set(tarotCards.map((card) => card.id));
  if (uniqueIds.size !== tarotCards.length) {
    console.warn("중복된 타로 카드 ID가 있습니다.");
  }

  const hasMissingCardData = tarotCards.some(
    (card) =>
      !card.name ||
      !card.koreanName ||
      !card.image ||
      card.uprightKeywords.length === 0 ||
      card.reversedKeywords.length === 0,
  );

  if (hasMissingCardData) {
    console.warn("이름, 이미지 경로, 키워드가 누락된 타로 카드가 있습니다.");
  }
}
