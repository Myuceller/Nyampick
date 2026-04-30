import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  getFamilyDataScope,
  listFamilyMembersForUser,
} from "@/lib/server/family-access";
import { getHomeSummaryFromDb } from "@/lib/server/supabase-app-data";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const family = await listFamilyMembersForUser(user.id);
    return NextResponse.json({
      summary: await getHomeSummaryFromDb(scope.ownerUserId, {
        familyMemberCount: family.members.length,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch home summary";
    return NextResponse.json({ message }, { status: 500 });
  }
}
