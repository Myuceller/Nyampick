import { randomUUID } from "crypto";
import { guessFridgeCategory, type FridgeCategory, type FridgeItem } from "@/lib/server/supabase-app-data";
import { normalizeReceiptLines } from "@/lib/server/receipt-normalize";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const RECEIPT_SESSION_TTL_MINUTES = 15;
const RECEIPT_SESSION_TABLE = "receipt_scan_sessions";

export class ReceiptScanSessionStorageError extends Error {
  constructor(
    message = "영수증 임시 저장소를 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
  ) {
    super(message);
  }
}

function isMissingReceiptSessionStorage(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.code === "42883" ||
    error?.message?.includes(RECEIPT_SESSION_TABLE) ||
    error?.message?.includes("confirm_receipt_scan_session") ||
    error?.message?.includes("does not exist")
  );
}

function toReceiptSessionStorageError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    isMissingReceiptSessionStorage(error as { code?: string; message?: string })
  ) {
    return new ReceiptScanSessionStorageError(
      "영수증 저장 기능이 아직 준비되지 않았습니다. docs/supabase-meals.sql 마이그레이션을 먼저 실행해주세요."
    );
  }
  return new ReceiptScanSessionStorageError();
}

export interface ReceiptScanCandidate {
  tempId: string;
  name: string;
  category: FridgeCategory;
  confidence: number;
  quantity?: string;
}

export interface ReceiptScanSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  candidates: ReceiptScanCandidate[];
}

export type ReceiptSessionLookup =
  | { status: "available"; session: ReceiptScanSession }
  | { status: "not_found" | "expired" | "already_confirmed" };

export type ReceiptConfirmResult =
  | { status: "confirmed"; items: FridgeItem[] }
  | { status: "not_found" | "expired" | "already_confirmed" | "invalid_selection" };

function toCandidateList(rawText: string, sessionId: string) {
  const normalized = normalizeReceiptLines(
    rawText
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter(Boolean)
  );

  return normalized.map((item, index) => ({
    tempId: `${sessionId}-${index}`,
    name: item.name,
    category: guessFridgeCategory(item.name),
    confidence: Math.max(0.65, 0.96 - index * 0.04),
    quantity: item.quantity,
  })).slice(0, 50);
}

function toSession(row: {
  id: string;
  created_at: string;
  expires_at: string;
  candidates: ReceiptScanCandidate[];
}): ReceiptScanSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    candidates: row.candidates,
  };
}

export async function createPersistentReceiptScanSession(input: {
  userId: string;
  rawText: string;
}): Promise<ReceiptScanSession> {
  const id = randomUUID();
  const candidates = toCandidateList(input.rawText, id);
  const expiresAt = new Date(Date.now() + RECEIPT_SESSION_TTL_MINUTES * 60_000).toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("receipt_scan_sessions")
    .insert({ id, user_id: input.userId, candidates, expires_at: expiresAt })
    .select("id,created_at,expires_at,candidates")
    .single();

  if (error || !data) throw toReceiptSessionStorageError(error);
  return toSession(data);
}

export async function getPersistentReceiptScanSession(input: {
  scanId: string;
  userId: string;
}): Promise<ReceiptSessionLookup> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("receipt_scan_sessions")
    .select("id,created_at,expires_at,candidates,consumed_at")
    .eq("id", input.scanId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw toReceiptSessionStorageError(error);
  if (!data) return { status: "not_found" };
  if (data.consumed_at) return { status: "already_confirmed" };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { status: "expired" };
  return { status: "available", session: toSession(data) };
}

export async function confirmPersistentReceiptScanSession(input: {
  scanId: string;
  userId: string;
  storageUserId: string;
  selected: Array<{
    tempId: string;
    name?: string;
    category?: FridgeCategory;
    quantity?: string;
    expiresAt?: string;
  }>;
}): Promise<ReceiptConfirmResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("confirm_receipt_scan_session", {
    p_scan_id: input.scanId,
    p_user_id: input.userId,
    p_storage_user_id: input.storageUserId,
    p_selected: input.selected,
  });
  if (error) throw toReceiptSessionStorageError(error);

  const result = data as ReceiptConfirmResult | null;
  if (!result || typeof result !== "object" || !("status" in result)) {
    throw new Error("invalid receipt confirmation response");
  }
  return result;
}
