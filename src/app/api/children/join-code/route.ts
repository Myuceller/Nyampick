import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { joinFamilyByInviteCode } from "@/lib/server/family-access";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    relationshipLabel?: string;
  };
  if (typeof body.code !== "string" || body.code.trim().length === 0) {
    return NextResponse.json({ message: "code is required" }, { status: 400 });
  }

  try {
    const linked = await joinFamilyByInviteCode({
      guestUserId: user.id,
      code: body.code,
      relationshipLabel: body.relationshipLabel,
    });
    return NextResponse.json({ linked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to join by invite code";
    const status =
      message === "invite code not found" ||
      message === "invite code expired" ||
      message === "cannot join with own invite code"
        ? 400
        : 500;
    return NextResponse.json({ message }, { status });
  }
}
