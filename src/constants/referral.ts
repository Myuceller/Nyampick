export const REFERRAL_OPTIONS = [
  { key: "friend", label: "지인 추천", description: "가족이나 친구가 알려줬어요" },
  { key: "search", label: "검색", description: "구글이나 네이버에서 찾았어요" },
  { key: "sns", label: "SNS", description: "인스타그램이나 블로그에서 봤어요" },
  { key: "community", label: "커뮤니티", description: "육아 카페나 커뮤니티에서 봤어요" },
  { key: "other", label: "기타", description: "다른 경로로 알게 됐어요" },
] as const;

export type ReferralSource = (typeof REFERRAL_OPTIONS)[number]["key"];

export function isReferralSource(value: unknown): value is ReferralSource {
  return (
    typeof value === "string" &&
    REFERRAL_OPTIONS.some((option) => option.key === value)
  );
}
