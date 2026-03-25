import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getHomeSummaryFromDb } from "@/lib/server/supabase-app-data";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ summary: await getHomeSummaryFromDb(user.id) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch home summary";
    return NextResponse.json({ message }, { status: 500 });
  }
}
