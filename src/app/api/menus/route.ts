import { NextResponse } from "next/server";
import type { MenuItem } from "@/lib/types";
import { getUserFromRequest } from "@/lib/server/api-auth";
import { getMenus } from "@/lib/server/meal-api-store";

const CATEGORIES: MenuItem["category"][] = [
  "rice",
  "soup",
  "side",
  "snack",
  "vitamin",
  "other",
];

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const favoritesOnlyParam = searchParams.get("favoritesOnly");

  let category: MenuItem["category"] | undefined;
  if (categoryParam) {
    if (!CATEGORIES.includes(categoryParam as MenuItem["category"])) {
      return NextResponse.json({ message: "invalid category" }, { status: 400 });
    }
    category = categoryParam as MenuItem["category"];
  }

  const favoritesOnly = favoritesOnlyParam === "true";

  return NextResponse.json({
    menus: getMenus(category, favoritesOnly),
  });
}
