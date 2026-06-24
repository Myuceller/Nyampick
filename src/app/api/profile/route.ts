import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  DuplicateEmailAccountError,
  getProfileFromDb,
  updateProfileInDb,
} from "@/lib/server/supabase-app-data";
import {
  readAuthUserDisplayName,
  readAuthUserEmail,
  requiresKakaoEmailConsent,
} from "@/features/auth/lib/social-profile";

const KAKAO_EMAIL_REQUIRED_RESPONSE = {
  code: "KAKAO_EMAIL_REQUIRED",
  message: "카카오 계정에서 이메일 제공에 동의해 주세요.",
};

function isValidImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(value) && value.length <= 1_500_000;
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    if (requiresKakaoEmailConsent(user)) {
      return NextResponse.json(KAKAO_EMAIL_REQUIRED_RESPONSE, { status: 400 });
    }
    const emailHint = readAuthUserEmail(user);
    return NextResponse.json({
      profile: await getProfileFromDb(
        user.id,
        emailHint,
        readAuthUserDisplayName(user)
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
    if (requiresKakaoEmailConsent(user)) {
      return NextResponse.json(KAKAO_EMAIL_REQUIRED_RESPONSE, { status: 400 });
    }
    const emailHint = readAuthUserEmail(user);
    const displayNameHint = readAuthUserDisplayName(user);
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
