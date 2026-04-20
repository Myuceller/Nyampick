import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { unlinkFamilyAccess } from "@/lib/server/family-access";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const ok = await unlinkFamilyAccess(user.id);
    if (!ok) {
      return NextResponse.json({ message: "no active family link" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to unlink family access";
    return NextResponse.json({ message }, { status: 500 });
  }
}

