import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { generateRecipeRecommendationsWithOpenAI } from "@/lib/server/recipe-ai";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    ingredients?: unknown;
    limit?: unknown;
  };

  if (!Array.isArray(body.ingredients)) {
    return NextResponse.json(
      { message: "ingredients must be an array" },
      { status: 400 }
    );
  }

  const ingredients = body.ingredients
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 20);

  if (ingredients.length === 0) {
    return NextResponse.json(
      { message: "at least one ingredient is required" },
      { status: 400 }
    );
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(10, Math.floor(body.limit)))
      : 3;

  try {
    const recommendations = await generateRecipeRecommendationsWithOpenAI({
      ingredients,
      limit,
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to generate recommendations";
    return NextResponse.json({ message }, { status: 500 });
  }
}
