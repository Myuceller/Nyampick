import type { FridgeItem, FridgeSectionKey } from "@/features/fridge/lib/fridge-types";

export interface DraftIngredientCandidate {
  id: string;
  name: string;
  type: FridgeSectionKey;
}

export interface DraftIngredientSelection {
  drafts: DraftIngredientCandidate[];
  skippedExisting: string[];
  skippedRepeated: string[];
}

export function buildFridgePayloadName(name: string, type: FridgeSectionKey) {
  const trimmed = name.trim();
  return type === "cube" && !trimmed.includes("큐브") ? `${trimmed} 큐브` : trimmed;
}

export function normalizeFridgeItemKey(name: string) {
  return name.replaceAll(/\s+/g, "").trim().toLowerCase();
}

export function selectNewDraftIngredients(input: {
  lines: string[];
  type: FridgeSectionKey;
  existingItems: Pick<FridgeItem, "name">[];
  idPrefix: string;
}): DraftIngredientSelection {
  const existingKeys = new Set(
    input.existingItems.map((item) => normalizeFridgeItemKey(item.name))
  );
  const seenKeys = new Set<string>();
  const drafts: DraftIngredientCandidate[] = [];
  const skippedExisting: string[] = [];
  const skippedRepeated: string[] = [];

  input.lines.forEach((line, index) => {
    const name = line.trim();
    if (!name) return;

    const key = normalizeFridgeItemKey(buildFridgePayloadName(name, input.type));
    if (existingKeys.has(key)) {
      skippedExisting.push(name);
      return;
    }
    if (seenKeys.has(key)) {
      skippedRepeated.push(name);
      return;
    }

    seenKeys.add(key);
    drafts.push({
      id: `${input.idPrefix}-${index}`,
      name,
      type: input.type,
    });
  });

  return { drafts, skippedExisting, skippedRepeated };
}
