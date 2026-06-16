import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const AUTH_USERS_PAGE_SIZE = 1000;
const AUTH_USERS_MAX_PAGES = 10;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hasAuthUserWithEmail(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email) return false;

  const supabase = getSupabaseAdmin();
  for (let page = 1; page <= AUTH_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });

    if (error) throw error;

    const users = data.users ?? [];
    if (users.some((user) => user.email && normalizeEmail(user.email) === email)) {
      return true;
    }

    if (users.length < AUTH_USERS_PAGE_SIZE) return false;
  }

  return false;
}
