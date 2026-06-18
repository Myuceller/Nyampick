import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

async function deleteFromTable(
  table: string,
  column: string,
  value: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq(column, value);
  if (error) throw error;
}

export async function deleteAccountData(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error: familyGuestError } = await supabase
    .from("family_access_links")
    .delete()
    .eq("guest_user_id", userId);
  if (familyGuestError) throw familyGuestError;

  const { error: familyOwnerError } = await supabase
    .from("family_access_links")
    .delete()
    .eq("owner_user_id", userId);
  if (familyOwnerError) throw familyOwnerError;

  await deleteFromTable("child_invite_codes", "owner_user_id", userId);
  await deleteFromTable("meal_entries", "user_id", userId);
  await deleteFromTable("fridge_items", "user_id", userId);
  await deleteFromTable("saved_recipes", "user_id", userId);
  await deleteFromTable("child_profiles", "user_id", userId);
  await deleteFromTable("user_profile", "id", userId);
}

export async function deleteAuthUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}
