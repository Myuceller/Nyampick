import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

interface InviteCodeRow {
  id: string;
  owner_user_id: string;
  child_id: string;
  code: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

interface AccessLinkRow {
  id: string;
  guest_user_id: string;
  owner_user_id: string;
  child_id: string;
  code_id: string;
  linked_at: string;
  revoked_at: string | null;
}

interface OwnerProfileRow {
  id: string;
  name: string;
  email: string | null;
}

interface ChildProfileRow {
  id: string;
  name: string;
}

function makeInviteCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

export async function createChildInviteCode(input: {
  ownerUserId: string;
  childId: string;
  expiresInDays?: number;
}): Promise<{ code: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  const expiresInDays = Math.min(Math.max(input.expiresInDays ?? 7, 1), 30);
  const nowIso = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("child_invite_codes")
    .select("id,owner_user_id,child_id,code,expires_at,revoked_at,created_at")
    .eq("owner_user_id", input.ownerUserId)
    .eq("child_id", input.childId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return {
      code: (existing as InviteCodeRow).code,
      expiresAt: (existing as InviteCodeRow).expires_at,
    };
  }

  const code = makeInviteCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("child_invite_codes").insert({
    id: randomUUID(),
    owner_user_id: input.ownerUserId,
    child_id: input.childId,
    code,
    expires_at: expiresAt,
  });
  if (error) throw error;

  return { code, expiresAt };
}

export async function joinFamilyByInviteCode(input: {
  guestUserId: string;
  code: string;
}): Promise<{ ownerUserId: string; childId: string }> {
  const supabase = getSupabaseAdmin();
  const normalized = input.code.trim().toUpperCase();

  const { data: codeRow, error: codeError } = await supabase
    .from("child_invite_codes")
    .select("id,owner_user_id,child_id,code,expires_at,revoked_at,created_at")
    .eq("code", normalized)
    .is("revoked_at", null)
    .maybeSingle();
  if (codeError) throw codeError;
  if (!codeRow) throw new Error("invite code not found");

  const typedCodeRow = codeRow as InviteCodeRow;
  if (new Date(typedCodeRow.expires_at).getTime() < Date.now()) {
    throw new Error("invite code expired");
  }
  if (typedCodeRow.owner_user_id === input.guestUserId) {
    throw new Error("cannot join with own invite code");
  }

  const { error: upsertError } = await supabase.from("family_access_links").upsert(
    {
      id: randomUUID(),
      guest_user_id: input.guestUserId,
      owner_user_id: typedCodeRow.owner_user_id,
      child_id: typedCodeRow.child_id,
      code_id: typedCodeRow.id,
      linked_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "guest_user_id" }
  );
  if (upsertError) throw upsertError;

  return {
    ownerUserId: typedCodeRow.owner_user_id,
    childId: typedCodeRow.child_id,
  };
}

export async function getFamilyDataScope(input: {
  userId: string;
  requestedChildId?: string | null;
}): Promise<{
  ownerUserId: string;
  childId?: string;
  isLinked: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("family_access_links")
    .select("id,guest_user_id,owner_user_id,child_id,code_id,linked_at,revoked_at")
    .eq("guest_user_id", input.userId)
    .is("revoked_at", null)
    .order("linked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (data) {
    const linked = data as AccessLinkRow;
    return {
      ownerUserId: linked.owner_user_id,
      childId: linked.child_id,
      isLinked: true,
    };
  }

  return {
    ownerUserId: input.userId,
    childId: input.requestedChildId ?? undefined,
    isLinked: false,
  };
}

export async function getFamilyLinkStatus(guestUserId: string): Promise<{
  ownerUserId: string;
  childId: string;
  linkedAt: string;
  ownerName?: string;
  ownerEmail?: string;
  childName?: string;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("family_access_links")
    .select("id,guest_user_id,owner_user_id,child_id,code_id,linked_at,revoked_at")
    .eq("guest_user_id", guestUserId)
    .is("revoked_at", null)
    .order("linked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const link = data as AccessLinkRow;

  const [{ data: owner }, { data: child }] = await Promise.all([
    supabase
      .from("user_profile")
      .select("id,name,email")
      .eq("id", link.owner_user_id)
      .maybeSingle(),
    supabase
      .from("child_profiles")
      .select("id,name")
      .eq("id", link.child_id)
      .maybeSingle(),
  ]);

  const typedOwner = owner as OwnerProfileRow | null;
  const typedChild = child as ChildProfileRow | null;

  return {
    ownerUserId: link.owner_user_id,
    childId: link.child_id,
    linkedAt: link.linked_at,
    ownerName: typedOwner?.name ?? undefined,
    ownerEmail: typedOwner?.email ?? undefined,
    childName: typedChild?.name ?? undefined,
  };
}

export async function unlinkFamilyAccess(guestUserId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("family_access_links")
    .update({ revoked_at: nowIso })
    .eq("guest_user_id", guestUserId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
