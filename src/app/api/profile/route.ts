import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  DuplicateEmailAccountError,
  getProfileFromDb,
  updateProfileInDb,
} from "@/lib/server/supabase-app-data";

type MetadataScalar = string | number | boolean | null;
type MetadataValue = MetadataScalar | MetadataObject | MetadataValue[];
interface MetadataObject {
  [key: string]: MetadataValue;
}

function asString(value: MetadataValue | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readDisplayNameFromUser(user: {
  user_metadata?: MetadataObject | null;
}): string | undefined {
  const metadata = user.user_metadata ?? {};

  const direct =
    asString(metadata.full_name) ||
    asString(metadata.name) ||
    asString(metadata.nickname) ||
    asString(metadata.user_name) ||
    asString(metadata.preferred_username);
  if (direct) return direct;

  const kakaoAccount =
    metadata.kakao_account && typeof metadata.kakao_account === "object"
      ? (metadata.kakao_account as MetadataObject)
      : null;
  const kakaoProfile =
    kakaoAccount?.profile && typeof kakaoAccount.profile === "object"
      ? (kakaoAccount.profile as MetadataObject)
      : null;

  return asString(kakaoProfile?.nickname);
}

function readEmailFromUser(user: {
  email?: string | null;
  user_metadata?: MetadataObject | null;
}): string | undefined {
  if (user.email && user.email.trim().length > 0) {
    return user.email.trim();
  }

  const metadata = user.user_metadata ?? {};
  const direct =
    asString(metadata.email) ||
    asString(metadata.email_address) ||
    asString(metadata.preferred_email);
  if (direct) return direct;

  const kakaoAccount =
    metadata.kakao_account && typeof metadata.kakao_account === "object"
      ? (metadata.kakao_account as MetadataObject)
      : null;

  return asString(kakaoAccount?.email);
}

function isValidImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(value) && value.length <= 1_500_000;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const emailHint = readEmailFromUser(user);
    return NextResponse.json({
      profile: await getProfileFromDb(
        user.id,
        emailHint,
        readDisplayNameFromUser(user)
      ),
    });
  } catch (error) {
    if (error instanceof DuplicateEmailAccountError) {
      return NextResponse.json(
        {
          code: "DUPLICATE_EMAIL_ACCOUNT",
          message: error.message,
          email: error.email,
          existingUserId: error.existingUserId,
        },
        { status: 409 }
      );
    }
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
    profileImageUrl?: string | null;
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

  if (
    body.profileImageUrl !== undefined &&
    body.profileImageUrl !== null &&
    !isValidImageDataUrl(body.profileImageUrl)
  ) {
    return NextResponse.json({ message: "invalid profileImageUrl" }, { status: 400 });
  }

  try {
    const emailHint = readEmailFromUser(user);
    const displayNameHint = readDisplayNameFromUser(user);
    await getProfileFromDb(user.id, emailHint, displayNameHint);
    return NextResponse.json({
      profile: await updateProfileInDb(user.id, {
        name: body.name?.trim(),
        babyName: body.babyName,
        babyMonthsOld: body.babyMonthsOld,
        email: body.email,
        profileImageUrl: body.profileImageUrl === null ? null : body.profileImageUrl,
      }),
    });
  } catch (error) {
    if (error instanceof DuplicateEmailAccountError) {
      return NextResponse.json(
        {
          code: "DUPLICATE_EMAIL_ACCOUNT",
          message: error.message,
          email: error.email,
          existingUserId: error.existingUserId,
        },
        { status: 409 }
      );
    }
    const message =
      error instanceof Error ? error.message : "failed to update profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}
