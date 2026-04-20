export interface NormalizedReceiptItem {
  name: string;
  quantity?: string;
}

const QUANTITY_PATTERN = /(\d+\s*\/\s*\d+|\d+(?:\.\d+)?\s?(?:kg|g|ml|l|개|봉|팩|캔|통|병|알|장|모|입))/i;

function cleanupRawLine(raw: string): string {
  let text = raw.trim();

  text = text.replace(/^[-*•\d.\s]+/, "");
  text = text.replace(/[{}\[\]`"']/g, " ");
  text = text.replace(/\bitems?\b\s*[:=]?/gi, " ");
  text = text.replace(/,+/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function extractQuantityAndName(text: string): NormalizedReceiptItem {
  const qtyMatch = text.match(QUANTITY_PATTERN);
  if (!qtyMatch || typeof qtyMatch.index !== "number") {
    return { name: text };
  }

  const quantity = qtyMatch[0].replace(/\s+/g, "").trim();

  const left = text.slice(0, qtyMatch.index).trim();
  const right = text.slice(qtyMatch.index + qtyMatch[0].length).trim();

  const maybeName = `${left} ${right}`.replace(/\s+/g, " ").trim();
  if (maybeName.length < 2) {
    return { name: text };
  }

  return { name: maybeName, quantity };
}

export function normalizeReceiptLine(raw: string): NormalizedReceiptItem | null {
  const cleaned = cleanupRawLine(raw);
  if (cleaned.length < 2) return null;

  const withoutPrice = cleaned
    .replace(/\d{1,3}(?:,\d{3})+\s*원?/g, " ")
    .replace(/\b\d+\s*원\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (withoutPrice.length < 2) return null;

  const nameCandidate = withoutPrice
    .replace(/[^0-9A-Za-z가-힣\s/+&()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (nameCandidate.length < 2) return null;
  if (/^\d+$/.test(nameCandidate)) return null;

  const normalized = extractQuantityAndName(nameCandidate);
  const finalName = normalized.name.replace(/\s+/g, " ").trim();
  if (finalName.length < 2) return null;

  return {
    name: finalName,
    quantity: normalized.quantity,
  };
}

export function normalizeReceiptLines(lines: string[]): NormalizedReceiptItem[] {
  const normalized = lines
    .map((line) => normalizeReceiptLine(line))
    .filter((item): item is NormalizedReceiptItem => !!item);

  const unique = new Map<string, NormalizedReceiptItem>();
  for (const item of normalized) {
    if (!unique.has(item.name)) unique.set(item.name, item);
  }

  return Array.from(unique.values());
}
