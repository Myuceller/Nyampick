import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

interface InviteCodeRow {
  id: string;
  owner_user_id: string;
  child_id: string | null;
  code: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

interface AccessLinkRow {
  id: string;
  guest_user_id: string;
  owner_user_id: string;
  child_id: string | null;
  code_id: string;
  relationship_label?: string | null;
  linked_at: string;
  revoked_at: string | null;
}

interface OwnerProfileRow {
  id: string;
  name: string;
  email: string | null;
  profile_image_url?: string | null;
}

interface ChildProfileRow {
  id: string;
  name: string;
}

export interface FamilyMemberSummary {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  role: "owner" | "member";
  roleLabel: string;
  linkedAt?: string;
}

function makeInviteCode(): string {
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function normalizeRelationshipLabel(value?: string): string {
  const label = value?.trim();
  if (!label) return "가족 구성원";
  return label.slice(0, 20);
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42703" || error?.message?.includes("column");
}

async function getPrimaryChildIdForOwner(ownerUserId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("user_id", ownerUserId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { id?: string } | null)?.id ?? null;
}

export async function createFamilyInviteCode(input: {
  ownerUserId: string;
  expiresInDays?: number;
}): Promise<{ code: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  const expiresInDays = Math.min(Math.max(input.expiresInDays ?? 7, 1), 30);
  const nowIso = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("child_invite_codes")
    .select("id,owner_user_id,child_id,code,expires_at,revoked_at,created_at")
    .eq("owner_user_id", input.ownerUserId)
    .is("child_id", null)
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

  const { data: legacyExisting, error: legacyExistingError } = await supabase
    .from("child_invite_codes")
    .select("id,owner_user_id,child_id,code,expires_at,revoked_at,created_at")
    .eq("owner_user_id", input.ownerUserId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (legacyExistingError) throw legacyExistingError;
  if (legacyExisting) {
    return {
      code: (legacyExisting as InviteCodeRow).code,
      expiresAt: (legacyExisting as InviteCodeRow).expires_at,
    };
  }

  const code = makeInviteCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    id: randomUUID(),
    owner_user_id: input.ownerUserId,
    child_id: null,
    code,
    expires_at: expiresAt,
  };
  const { error } = await supabase.from("child_invite_codes").insert(payload);
  if (error) {
    const fallbackChildId = await getPrimaryChildIdForOwner(input.ownerUserId);
    if (!fallbackChildId) throw error;
    const { error: fallbackError } = await supabase.from("child_invite_codes").insert({
      ...payload,
      child_id: fallbackChildId,
    });
    if (fallbackError) throw fallbackError;
  }

  return { code, expiresAt };
}

export async function joinFamilyByInviteCode(input: {
  guestUserId: string;
  code: string;
  relationshipLabel?: string;
}): Promise<{ ownerUserId: string }> {
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
      relationship_label: normalizeRelationshipLabel(input.relationshipLabel),
      linked_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "guest_user_id" }
  );
  if (upsertError) throw upsertError;

  return {
    ownerUserId: typedCodeRow.owner_user_id,
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
    .select("id,guest_user_id,owner_user_id,child_id,code_id,relationship_label,linked_at,revoked_at")
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
      childId: input.requestedChildId ?? undefined,
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
  linkedAt: string;
  ownerName?: string;
  ownerEmail?: string;
  childName?: string;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("family_access_links")
    .select("id,guest_user_id,owner_user_id,child_id,code_id,relationship_label,linked_at,revoked_at")
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
    link.child_id
      ? supabase
          .from("child_profiles")
          .select("id,name")
          .eq("id", link.child_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const typedOwner = owner as OwnerProfileRow | null;
  const typedChild = child as ChildProfileRow | null;

  return {
    ownerUserId: link.owner_user_id,
    linkedAt: link.linked_at,
    ownerName: typedOwner?.name ?? undefined,
    ownerEmail: typedOwner?.email ?? undefined,
    childName: typedChild?.name ?? undefined,
  };
}

export async function listFamilyMembersForUser(userId: string): Promise<{
  ownerUserId: string;
  viewerRole: "owner" | "member";
  members: FamilyMemberSummary[];
}> {
  const supabase = getSupabaseAdmin();
  const scope = await getFamilyDataScope({ userId });

  const { data: ownerWithPhoto, error: ownerWithPhotoError } = await supabase
    .from("user_profile")
    .select("id,name,email,profile_image_url")
    .eq("id", scope.ownerUserId)
    .maybeSingle();
  if (ownerWithPhotoError && !isMissingColumnError(ownerWithPhotoError)) {
    throw ownerWithPhotoError;
  }
  const { data: ownerFallback, error: ownerFallbackError } =
    ownerWithPhotoError && isMissingColumnError(ownerWithPhotoError)
      ? await supabase
          .from("user_profile")
          .select("id,name,email")
          .eq("id", scope.ownerUserId)
          .maybeSingle()
      : { data: null, error: null };
  if (ownerFallbackError) throw ownerFallbackError;
  const owner = ownerWithPhoto ?? ownerFallback;

  const { data: links, error: linksError } = await supabase
    .from("family_access_links")
    .select("id,guest_user_id,owner_user_id,child_id,code_id,relationship_label,linked_at,revoked_at")
    .eq("owner_user_id", scope.ownerUserId)
    .is("revoked_at", null)
    .order("linked_at", { ascending: true });
  if (linksError) throw linksError;

  const activeMemberLinks = (links ?? [])
    .map((link) => link as AccessLinkRow)
    .filter((link) => link.guest_user_id !== scope.ownerUserId)
    .filter((link) => link.guest_user_id !== userId);

  const guestIds = activeMemberLinks
    .map((link) => (link as AccessLinkRow).guest_user_id)
    .filter((id, index, ids) => ids.indexOf(id) === index);

  const { data: guestProfilesWithPhoto, error: profilesWithPhotoError } =
    guestIds.length > 0
      ? await supabase
          .from("user_profile")
          .select("id,name,email,profile_image_url")
          .in("id", guestIds)
      : { data: [], error: null };
  if (profilesWithPhotoError && !isMissingColumnError(profilesWithPhotoError)) {
    throw profilesWithPhotoError;
  }
  const { data: guestProfilesFallback, error: profilesFallbackError } =
    guestIds.length > 0 && profilesWithPhotoError && isMissingColumnError(profilesWithPhotoError)
      ? await supabase
          .from("user_profile")
          .select("id,name,email")
          .in("id", guestIds)
      : { data: [], error: null };
  if (profilesFallbackError) throw profilesFallbackError;
  const guestProfiles = guestProfilesWithPhoto ?? guestProfilesFallback;

  const profileById = new Map(
    (guestProfiles ?? []).map((profile) => [
      (profile as OwnerProfileRow).id,
      profile as OwnerProfileRow,
    ])
  );
  const typedOwner = owner as OwnerProfileRow | null;

  const members: FamilyMemberSummary[] = [
    ...(scope.isLinked && scope.ownerUserId !== userId
      ? [
          {
            id: scope.ownerUserId,
            name: typedOwner?.name || "보호자",
            email: typedOwner?.email ?? undefined,
            profileImageUrl: typedOwner?.profile_image_url ?? undefined,
            role: "owner" as const,
            roleLabel: "주 양육자",
          },
        ]
      : []),
    ...activeMemberLinks.map((link) => {
      const profile = profileById.get(link.guest_user_id);
      return {
        id: link.guest_user_id,
        name: profile?.name || profile?.email || "가족 구성원",
        email: profile?.email ?? undefined,
        profileImageUrl: profile?.profile_image_url ?? undefined,
        role: "member" as const,
        roleLabel: normalizeRelationshipLabel(link.relationship_label ?? undefined),
        linkedAt: link.linked_at,
      };
    }),
  ];

  return {
    ownerUserId: scope.ownerUserId,
    viewerRole: scope.isLinked ? "member" : "owner",
    members,
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

export async function unlinkFamilyMember(input: {
  ownerUserId: string;
  guestUserId: string;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("family_access_links")
    .update({ revoked_at: nowIso })
    .eq("owner_user_id", input.ownerUserId)
    .eq("guest_user_id", input.guestUserId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
