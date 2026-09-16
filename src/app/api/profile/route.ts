import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  hasLegacyProfile,
  hasRegistrationConsent,
  isLegacyRegistrationIdentity,
  markRegistrationCompleted,
} from "@/lib/server/registration-consent";
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

async function canAccessProfileDuringRegistration(user: {
  id: string;
  app_metadata: Record<string, unknown>;
  created_at: string;
}) {
  if (hasRegistrationConsent(user)) return true;
  if (!isLegacyRegistrationIdentity(user)) return false;
  return hasLegacyProfile(user.id);
}

function registrationConsentRequiredResponse() {
  return NextResponse.json(
    {
      code: "REGISTRATION_CONSENT_REQUIRED",
      message: "필수 약관 동의 후 회원가입을 완료해주세요.",
    },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request, { allowPendingRegistration: true });
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    if (!(await canAccessProfileDuringRegistration(user))) {
      return registrationConsentRequiredResponse();
    }
    if (requiresKakaoEmailConsent(user)) {
      return NextResponse.json(KAKAO_EMAIL_REQUIRED_RESPONSE, { status: 400 });
    }
    const emailHint = readAuthUserEmail(user);
    const profile = await getProfileFromDb(
      user.id,
      emailHint,
      readAuthUserDisplayName(user)
    );
    if (hasRegistrationConsent(user)) {
      await markRegistrationCompleted(user);
    }
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof DuplicateEmailAccountError) {
      return NextResponse.json(
        {
          code: "DUPLICATE_EMAIL_ACCOUNT",
          message: error.message,
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
  const user = await getUserFromRequest(request, { allowPendingRegistration: true });
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
    if (!(await canAccessProfileDuringRegistration(user))) {
      return registrationConsentRequiredResponse();
    }
    if (requiresKakaoEmailConsent(user)) {
      return NextResponse.json(KAKAO_EMAIL_REQUIRED_RESPONSE, { status: 400 });
    }
    const emailHint = readAuthUserEmail(user);
    const displayNameHint = readAuthUserDisplayName(user);
    await getProfileFromDb(user.id, emailHint, displayNameHint);
    const profile = await updateProfileInDb(user.id, {
      name: body.name?.trim(),
      babyName: body.babyName,
      babyMonthsOld: body.babyMonthsOld,
      email: body.email,
      profileImageUrl: body.profileImageUrl === null ? null : body.profileImageUrl,
    });
    if (hasRegistrationConsent(user)) {
      await markRegistrationCompleted(user);
    }
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof DuplicateEmailAccountError) {
      return NextResponse.json(
        {
          code: "DUPLICATE_EMAIL_ACCOUNT",
          message: error.message,
        },
        { status: 409 }
      );
    }
    const message =
      error instanceof Error ? error.message : "failed to update profile";
    return NextResponse.json({ message }, { status: 500 });
  }
}
