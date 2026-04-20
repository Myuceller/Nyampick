import { randomUUID } from "crypto";
import { backfillMealEntriesChildId } from "@/lib/server/supabase-meals";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export interface ChildProfile {
  id: string;
  userId: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

function toChildProfile(row: {
  id: string;
  user_id: string;
  name: string;
  months_old: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}): ChildProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    monthsOld: row.months_old,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function seedDefaultChild(userId: string): Promise<ChildProfile> {
  const supabase = getSupabaseAdmin();
  const { data: profileRow } = await supabase
    .from("user_profile")
    .select("baby_name,baby_months_old")
    .eq("id", userId)
    .maybeSingle();

  const payload = {
    id: randomUUID(),
    user_id: userId,
    name: profileRow?.baby_name ?? "아기",
    months_old: profileRow?.baby_months_old ?? 0,
    is_primary: true,
  };

  const { data, error } = await supabase
    .from("child_profiles")
    .insert(payload)
    .select("id,user_id,name,months_old,is_primary,created_at,updated_at")
    .single();
  if (error) throw error;
  return toChildProfile(data);
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === "23505";
}

export async function listChildrenFromDb(userId: string): Promise<ChildProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id,user_id,name,months_old,is_primary,created_at,updated_at")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toChildProfile);
}

export async function ensureDefaultChildFromDb(userId: string): Promise<ChildProfile> {
  const normalizePrimary = async (children: ChildProfile[]): Promise<ChildProfile> => {
    const primaryChildren = children.filter((child) => child.isPrimary);
    const primary = primaryChildren[0] ?? children[0];

    // Normalize broken states (no primary or multiple primaries) to exactly one primary.
    if (primaryChildren.length !== 1) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("child_profiles")
        .update({ is_primary: false })
        .eq("user_id", userId);
      await supabase
        .from("child_profiles")
        .update({ is_primary: true })
        .eq("id", primary.id)
        .eq("user_id", userId);
    }

    await backfillMealEntriesChildId(userId, primary.id);
    return primary;
  };

  const children = await listChildrenFromDb(userId);
  if (children.length > 0) {
    return normalizePrimary(children);
  }

  try {
    const seeded = await seedDefaultChild(userId);
    await backfillMealEntriesChildId(userId, seeded.id);
    return seeded;
  } catch (error) {
    // Concurrent seed race: another request inserted first.
    if (!isUniqueViolation(error)) throw error;
    const racedChildren = await listChildrenFromDb(userId);
    if (racedChildren.length === 0) throw error;
    return normalizePrimary(racedChildren);
  }
}

export async function resolveChildIdForUser(
  userId: string,
  requestedChildId?: string | null
): Promise<string> {
  if (requestedChildId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("id", requestedChildId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new Error("child not found");
    }
    return data.id;
  }
  const child = await ensureDefaultChildFromDb(userId);
  return child.id;
}

export async function addChildToDb(input: {
  userId: string;
  name: string;
  monthsOld: number;
  isPrimary?: boolean;
}): Promise<ChildProfile> {
  const supabase = getSupabaseAdmin();
  const existing = await listChildrenFromDb(input.userId);
  const shouldBePrimary = input.isPrimary === true || existing.length === 0;

  if (shouldBePrimary) {
    await supabase
      .from("child_profiles")
      .update({ is_primary: false })
      .eq("user_id", input.userId);
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .insert({
      id: randomUUID(),
      user_id: input.userId,
      name: input.name,
      months_old: input.monthsOld,
      is_primary: shouldBePrimary,
    })
    .select("id,user_id,name,months_old,is_primary,created_at,updated_at")
    .single();
  if (error) throw error;
  return toChildProfile(data);
}

export async function updateChildInDb(
  userId: string,
  childId: string,
  patch: { name?: string; monthsOld?: number; isPrimary?: boolean }
): Promise<ChildProfile | null> {
  const supabase = getSupabaseAdmin();
  if (patch.isPrimary) {
    await supabase
      .from("child_profiles")
      .update({ is_primary: false })
      .eq("user_id", userId);
  }

  const updatePatch: Record<string, string | number | boolean> = {};
  if (patch.name !== undefined) updatePatch.name = patch.name;
  if (patch.monthsOld !== undefined) updatePatch.months_old = patch.monthsOld;
  if (patch.isPrimary !== undefined) updatePatch.is_primary = patch.isPrimary;

  const { data, error } = await supabase
    .from("child_profiles")
    .update(updatePatch)
    .eq("user_id", userId)
    .eq("id", childId)
    .select("id,user_id,name,months_old,is_primary,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toChildProfile(data);
}

export async function deleteChildInDb(userId: string, childId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const children = await listChildrenFromDb(userId);
  if (children.length <= 1) {
    throw new Error("at least one child is required");
  }

  const target = children.find((child) => child.id === childId);
  if (!target) return false;

  const { data, error } = await supabase
    .from("child_profiles")
    .delete()
    .eq("user_id", userId)
    .eq("id", childId)
    .select("id");
  if (error) throw error;

  if (target.isPrimary) {
    const next = children.find((child) => child.id !== childId);
    if (next) {
      await supabase
        .from("child_profiles")
        .update({ is_primary: true })
        .eq("id", next.id)
        .eq("user_id", userId);
      await backfillMealEntriesChildId(userId, next.id);
    }
  }

  return (data?.length ?? 0) > 0;
}
