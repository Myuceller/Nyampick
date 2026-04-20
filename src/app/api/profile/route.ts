import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getProfileFromDb, updateProfileInDb } from "@/lib/server/supabase-app-data";

function readDisplayNameFromUser(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | undefined {
  const metadata = user.user_metadata ?? {};
  const asString = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

  const direct =
    asString(metadata.full_name) ||
    asString(metadata.name) ||
    asString(metadata.nickname) ||
    asString(metadata.user_name) ||
    asString(metadata.preferred_username);
  if (direct) return direct;

  const kakaoAccount =
    metadata.kakao_account && typeof metadata.kakao_account === "object"
      ? (metadata.kakao_account as Record<string, unknown>)
      : null;
  const kakaoProfile =
    kakaoAccount?.profile && typeof kakaoAccount.profile === "object"
      ? (kakaoAccount.profile as Record<string, unknown>)
      : null;

  return asString(kakaoProfile?.nickname);
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      profile: await getProfileFromDb(
        user.id,
        user.email ?? undefined,
        readDisplayNameFromUser(user)
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    babyName?: string;
    babyMonthsOld?: number;
    email?: string;
  };

  if (body.name !== undefined && body.name.trim().length === 0) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  if (
    body.babyMonthsOld !== undefined &&
    (!Number.isInteger(body.babyMonthsOld) || body.babyMonthsOld < 0)
  ) {
    return NextResponse.json(
      { message: "babyMonthsOld must be a non-negative integer" },
      { status: 400 }
    );
  }

  try {
    const displayNameHint = readDisplayNameFromUser(user);
    await getProfileFromDb(user.id, user.email ?? undefined, displayNameHint);
    return NextResponse.json({
      profile: await updateProfileInDb(user.id, {
        name: body.name?.trim(),
        babyName: body.babyName,
        babyMonthsOld: body.babyMonthsOld,
        email: body.email,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to update profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}
