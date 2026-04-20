export interface OnboardingSlideData {
  imageSrc: string;
  imageAlt: string;
  imageClassName: string;
  title: string;
  descTop: string;
  descBottom: string;
  overlay?: "spoon" | "heart";
}

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    imageSrc: "/baby.png",
    imageAlt: "아기 캐릭터",
    imageClassName: "main-img baby-float",
    title: "맛있는 첫걸음, 맘마노트",
    descTop: "우리 아이 성장 단계에 딱 맞는",
    descBottom: "이유식 식단을 AI가 추천해드려요.",
    overlay: "spoon",
  },
  {
    imageSrc: "/calendar.png",
    imageAlt: "캘린더 화면",
    imageClassName: "main-img calendar-tilt",
    title: "꼼꼼한 기록, 한눈에 확인",
    descTop: "언제 무엇을 얼마나 먹었는지",
    descBottom: "간편하게 기록하고 확인하세요.",
  },
  {
    imageSrc: "/family.png",
    imageAlt: "가족 공유 화면",
    imageClassName: "main-img",
    title: "온 가족이 함께해요",
    descTop: "엄마, 아빠, 할머니까지 공유하여",
    descBottom: "아이의 식단을 공동 관리할 수 있어요.",
    overlay: "heart",
  },
];
