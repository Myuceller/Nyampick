const QUANTITY_PATTERN =
  /(\d+\s*\/\s*\d+|\d+(?:\.\d+)?\s?(?:kg|g|ml|l|개|봉|팩|캔|통|병|알|장|모|입|인분))/gi;

const DESCRIPTOR_PATTERN =
  /(친환경|무농약|유기농|국산|국내산|수입산|무항생제|냉장|냉동|생|손질|다진|깐|절단|저염|무가당|플레인|아기|유아|이유식|한우)/g;

const aliasRules: Array<[RegExp, string]> = [
  [/닭\s*(안심|가슴살|다리살|정육|고기)?/i, "닭고기"],
  [/(소고기|쇠고기|우둔|안심|홍두깨살|다짐육)/i, "소고기"],
  [/(돼지고기|삼겹살|목살|앞다리살|뒷다리살)/i, "돼지고기"],
  [/(달걀|계란)/i, "계란"],
  [/(서울우유|상하목장|우유)/i, "우유"],
  [/(요거트|요구르트|요플레)/i, "요거트"],
  [/(두부|연두부|순두부)/i, "두부"],
  [/(애호박|호박)/i, "애호박"],
  [/(양파)/i, "양파"],
  [/(당근)/i, "당근"],
  [/(브로콜리)/i, "브로콜리"],
  [/(바나나)/i, "바나나"],
  [/(새우)/i, "새우"],
  [/(치즈)/i, "치즈"],
  [/(쌀|백미|현미|밥)/i, "쌀"],
];

function cleanupIngredientText(value: string) {
  return value
    .replace(/^[-*•\d.\s]+/, "")
    .replace(/[{}\[\]`"']/g, " ")
    .replace(/[,+/&()]/g, " ")
    .replace(/\d{1,3}(?:,\d{3})+\s*원?/g, " ")
    .replace(/\b\d+\s*원\b/g, " ")
    .replace(QUANTITY_PATTERN, " ")
    .replace(DESCRIPTOR_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeIngredientName(value: string) {
  const cleaned = cleanupIngredientText(value);
  if (cleaned.length < 2) return "";

  for (const [pattern, canonical] of aliasRules) {
    if (pattern.test(cleaned)) return canonical;
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export function normalizeIngredientList(values: string[], options?: { limit?: number }) {
  const limit = options?.limit ?? values.length;
  const unique = new Map<string, string>();

  for (const value of values) {
    const normalized = normalizeIngredientName(value);
    if (!normalized) continue;
    const key = normalized.replace(/\s+/g, "").toLowerCase();
    if (!unique.has(key)) unique.set(key, normalized);
    if (unique.size >= limit) break;
  }

  return Array.from(unique.values());
}
