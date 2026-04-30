import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  getFamilyLinkStatus,
  getFamilyDataScope,
  listFamilyMembersForUser,
  unlinkFamilyMember,
} from "@/lib/server/family-access";
import { ensureDefaultChildFromDb, listChildrenFromDb } from "@/lib/server/supabase-children";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const family = await listFamilyMembersForUser(user.id);
    await ensureDefaultChildFromDb(family.ownerUserId);
    const children = await listChildrenFromDb(family.ownerUserId);
    const linkedInfo = await getFamilyLinkStatus(user.id);

    return NextResponse.json({
      ownerUserId: family.ownerUserId,
      viewerRole: family.viewerRole,
      linkedMode: family.viewerRole === "member",
      members: family.members,
      children,
      childCount: children.length,
      linkedInfo,
      viewer: {
        id: user.id,
        email: user.email ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch family";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    guestUserId?: string;
  };

  if (typeof body.guestUserId !== "string" || body.guestUserId.length === 0) {
    return NextResponse.json({ message: "guestUserId is required" }, { status: 400 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    if (scope.isLinked) {
      return NextResponse.json(
        { message: "linked member cannot unlink other members" },
        { status: 403 }
      );
    }
    const ok = await unlinkFamilyMember({
      ownerUserId: scope.ownerUserId,
      guestUserId: body.guestUserId,
    });
    if (!ok) {
      return NextResponse.json({ message: "family member link not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to unlink family member";
    return NextResponse.json({ message }, { status: 500 });
  }
}
