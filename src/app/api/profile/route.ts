import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getProfileFromDb, updateProfileInDb } from "@/lib/server/supabase-app-data";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      profile: await getProfileFromDb(user.id, user.email ?? undefined),
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
    return NextResponse.json({
      profile: await updateProfileInDb(user.id, {
        name: body.name,
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
