export interface FridgeItemDto {
  id: string;
  name: string;
  category: "fruit" | "vegetable" | "protein" | "dairy" | "grain" | "sauce" | "snack" | "other";
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

export interface FridgeItemsResponseDto {
  items?: FridgeItemDto[];
  message?: string;
}
