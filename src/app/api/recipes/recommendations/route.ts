import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getRecipeRecommendationsFromDb } from "@/lib/server/supabase-app-data";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 5;

  if (Number.isNaN(limit) || limit <= 0 || limit > 20) {
    return NextResponse.json(
      { message: "limit must be between 1 and 20" },
      { status: 400 }
    );
  }

  try {
    const recommendations = await getRecipeRecommendationsFromDb(user.id, limit);

    return NextResponse.json({
      recommendations,
      strategy: {
        basedOn: ["fridge-items", "recent-meals", "nutrition-balance"],
        description:
          "냉장고 재료 우선 + 최근 식단 중복 완화 + 부족 영양소 보완 기준으로 정렬",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch recommendations";
    return NextResponse.json({ message }, { status: 500 });
  }
}
