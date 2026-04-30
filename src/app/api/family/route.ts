import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  getFamilyLinkStatus,
  listFamilyMembersForUser,
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
