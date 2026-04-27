export interface AllergyMatch {
  allergy: string;
  matchedValue: string;
  matchedTerm: string;
}

const ALLERGY_ALIASES: Record<string, string[]> = {
  달걀: ["달걀", "계란", "난류", "에그", "egg"],
  우유: ["우유", "유제품", "분유", "치즈", "요거트", "요구르트", "버터", "크림", "milk"],
  밀: ["밀", "밀가루", "빵", "면", "국수", "파스타", "우동", "라면"],
  땅콩: ["땅콩", "피넛", "peanut"],
  대두: ["대두", "콩", "두부", "두유", "된장", "간장", "soy"],
  견과류: ["견과류", "아몬드", "캐슈넛", "피스타치오", "마카다미아", "헤이즐넛"],
  갑각류: ["갑각류", "새우", "게", "가재", "랍스터"],
  생선: ["생선", "연어", "대구", "참치", "고등어", "광어", "흰살생선"],
  조개류: ["조개류", "조개", "바지락", "홍합", "굴", "전복"],
  참깨: ["참깨", "깨", "깨소금", "참기름"],
  복숭아: ["복숭아", "황도", "백도"],
  토마토: ["토마토", "방울토마토", "토마토소스"],
  돼지고기: ["돼지고기", "돼지", "돈육", "햄", "베이컨"],
  소고기: ["소고기", "쇠고기", "한우", "우육"],
  닭고기: ["닭고기", "닭", "닭안심", "닭가슴살", "계육"],
  메밀: ["메밀", "메밀국수"],
  호두: ["호두"],
  잣: ["잣"],
  키위: ["키위"],
  바나나: ["바나나"],
  딸기: ["딸기"],
};

function normalize(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function expandAllergyTerms(allergies: string[]) {
  const terms = new Set<string>();

  for (const allergy of allergies) {
    const trimmed = allergy.trim();
    if (!trimmed) continue;

    terms.add(trimmed);
    for (const [canonical, aliases] of Object.entries(ALLERGY_ALIASES)) {
      if (
        normalize(trimmed) === normalize(canonical) ||
        aliases.some((alias) => normalize(alias) === normalize(trimmed))
      ) {
        aliases.forEach((alias) => terms.add(alias));
      }
    }
  }

  return Array.from(terms);
}

export function includesAllergyTerm(value: string, allergies: string[]) {
  const normalized = normalize(value);
  return expandAllergyTerms(allergies).some((term) => {
    const normalizedTerm = normalize(term);
    return (
      normalizedTerm.length > 0 &&
      (normalized.includes(normalizedTerm) || normalizedTerm.includes(normalized))
    );
  });
}

export function findAllergyMatches(values: string[], allergies: string[]): AllergyMatch[] {
  const matches: AllergyMatch[] = [];

  for (const allergy of allergies) {
    const terms = expandAllergyTerms([allergy]);
    for (const value of values) {
      const normalizedValue = normalize(value);
      const matchedTerm = terms.find((term) => {
        const normalizedTerm = normalize(term);
        return (
          normalizedTerm.length > 0 &&
          (normalizedValue.includes(normalizedTerm) ||
            normalizedTerm.includes(normalizedValue))
        );
      });

      if (matchedTerm) {
        matches.push({
          allergy,
          matchedValue: value,
          matchedTerm,
        });
      }
    }
  }

  return matches;
}
