import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { createChildInviteCode } from "@/lib/server/family-access";
import { getFamilyDataScope } from "@/lib/server/family-access";
import { resolveChildIdForUser } from "@/lib/server/supabase-children";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    childId?: string;
    expiresInDays?: number;
  };

  if (typeof body.childId !== "string" || body.childId.length === 0) {
    return NextResponse.json({ message: "childId is required" }, { status: 400 });
  }

  if (
    body.expiresInDays !== undefined &&
    (!Number.isInteger(body.expiresInDays) || body.expiresInDays <= 0)
  ) {
    return NextResponse.json(
      { message: "expiresInDays must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    if (scope.isLinked) {
      return NextResponse.json(
        { message: "linked member cannot create invite code" },
        { status: 403 }
      );
    }
    const childId = await resolveChildIdForUser(scope.ownerUserId, body.childId);
    const { code, expiresAt } = await createChildInviteCode({
      ownerUserId: scope.ownerUserId,
      childId,
      expiresInDays: body.expiresInDays,
    });
    return NextResponse.json({ code, expiresAt }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to create invite code";
    const status = message === "child not found" ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
