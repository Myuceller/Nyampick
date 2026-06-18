import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { deleteAccountData, deleteAuthUser } from "@/lib/server/account-deletion";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

async function getDirectAuthUserId(request: Request): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirmText?: unknown;
  };

  if (body.confirmText !== "회원탈퇴") {
    return NextResponse.json(
      { message: "회원탈퇴 확인 문구가 일치하지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const directAuthUserId = await getDirectAuthUserId(request);
    const userIds = Array.from(
      new Set([user.id, directAuthUserId].filter((id): id is string => Boolean(id)))
    );

    await Promise.all(userIds.map((userId) => deleteAccountData(userId)));
    await Promise.all(userIds.map((userId) => deleteAuthUser(userId)));

    return NextResponse.json({ message: "회원탈퇴가 완료되었습니다." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회원탈퇴 처리에 실패했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
