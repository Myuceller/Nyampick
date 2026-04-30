import { NextResponse } from "next/server";
import { evaluateRecipe } from "@/lib/recipe-eval/evaluate-recipe";
import { generateEvalCases } from "@/lib/recipe-eval/generate-cases";
import type { RecipeEvalTestCase } from "@/lib/recipe-eval/types";

interface RecipeEvalRequestBody {
  testCase?: RecipeEvalTestCase;
  recipeText?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countParam = Number(url.searchParams.get("count"));
  const seed = url.searchParams.get("seed") ?? undefined;
  const count = Number.isFinite(countParam) ? countParam : 10;

  return NextResponse.json({
    cases: generateEvalCases({ count, seed }),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecipeEvalRequestBody;

  if (!body.testCase || typeof body.testCase !== "object") {
    return NextResponse.json({ message: "testCase is required" }, { status: 400 });
  }
  if (typeof body.recipeText !== "string" || body.recipeText.trim().length === 0) {
    return NextResponse.json({ message: "recipeText is required" }, { status: 400 });
  }

  return NextResponse.json({
    result: evaluateRecipe(body.testCase, body.recipeText),
  });
}
