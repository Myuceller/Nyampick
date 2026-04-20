import { NextResponse } from "next/server";
import {
  AuthProviderUnavailableError,
  getUserFromRequest,
} from "@/lib/server/api-auth";
import { getFamilyDataScope } from "@/lib/server/family-access";
import {
  addSavedRecipeToDb,
  deleteSavedRecipeInDb,
  listSavedRecipesFromDb,
  updateSavedRecipeInDb,
} from "@/lib/server/supabase-app-data";

function normalizeSavedRecipeError(error: unknown, fallback: string) {
  let message = fallback;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object" && "message" in error) {
    const raw = (error as { message?: unknown }).message;
    if (typeof raw === "string" && raw.length > 0) {
      message = raw;
    }
  }

  if (
    message.includes("saved_recipes") &&
    (message.includes("does not exist") || message.includes("relation"))
  ) {
    return {
      status: 503,
      message:
        "saved_recipes 테이블이 없습니다. docs/supabase-meals.sql 마이그레이션을 먼저 실행해주세요.",
    };
  }

  return { status: 500, message };
}

function authUnavailableResponse() {
  return NextResponse.json(
    { message: "인증 서버에 연결할 수 없습니다. 네트워크/DNS를 확인해주세요." },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  let user = null;
  try {
    user = await getUserFromRequest(request);
  } catch (error) {
    if (error instanceof AuthProviderUnavailableError) {
      return authUnavailableResponse();
    }
    throw error;
  }
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const items = await listSavedRecipesFromDb(scope.ownerUserId);
    return NextResponse.json({ items });
  } catch (error) {
    const normalized = normalizeSavedRecipeError(
      error,
      "failed to fetch saved recipes"
    );
    return NextResponse.json(
      { message: normalized.message },
      { status: normalized.status }
    );
  }
}

export async function POST(request: Request) {
  let user = null;
  try {
    user = await getUserFromRequest(request);
  } catch (error) {
    if (error instanceof AuthProviderUnavailableError) {
      return authUnavailableResponse();
    }
    throw error;
  }
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    subtitle?: string;
    taste?: "좋아해요" | "보통이에요" | "싫어해요";
    source?: "ai" | "manual";
    favorite?: boolean;
    link?: string;
    memo?: string;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const source = body.source === "ai" ? "ai" : "manual";

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const item = await addSavedRecipeToDb({
      userId: scope.ownerUserId,
      title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() : undefined,
      taste: body.taste,
      source,
      favorite: Boolean(body.favorite),
      link: typeof body.link === "string" ? body.link.trim() : undefined,
      memo: typeof body.memo === "string" ? body.memo.trim() : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const normalized = normalizeSavedRecipeError(error, "failed to save recipe");
    return NextResponse.json(
      { message: normalized.message },
      { status: normalized.status }
    );
  }
}

export async function PATCH(request: Request) {
  let user = null;
  try {
    user = await getUserFromRequest(request);
  } catch (error) {
    if (error instanceof AuthProviderUnavailableError) {
      return authUnavailableResponse();
    }
    throw error;
  }
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    subtitle?: string;
    taste?: "좋아해요" | "보통이에요" | "싫어해요";
    favorite?: boolean;
    link?: string;
    memo?: string;
  };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const item = await updateSavedRecipeInDb(scope.ownerUserId, body.id, {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      subtitle:
        typeof body.subtitle === "string" ? body.subtitle.trim() : undefined,
      taste: body.taste,
      favorite: typeof body.favorite === "boolean" ? body.favorite : undefined,
      link: typeof body.link === "string" ? body.link.trim() : undefined,
      memo: typeof body.memo === "string" ? body.memo.trim() : undefined,
    });

    if (!item) {
      return NextResponse.json({ message: "recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    const normalized = normalizeSavedRecipeError(error, "failed to update recipe");
    return NextResponse.json(
      { message: normalized.message },
      { status: normalized.status }
    );
  }
}

export async function DELETE(request: Request) {
  let user = null;
  try {
    user = await getUserFromRequest(request);
  } catch (error) {
    if (error instanceof AuthProviderUnavailableError) {
      return authUnavailableResponse();
    }
    throw error;
  }
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  try {
    const scope = await getFamilyDataScope({ userId: user.id });
    const deleted = await deleteSavedRecipeInDb(scope.ownerUserId, body.id);
    if (!deleted) {
      return NextResponse.json({ message: "recipe not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const normalized = normalizeSavedRecipeError(error, "failed to delete recipe");
    return NextResponse.json(
      { message: normalized.message },
      { status: normalized.status }
    );
  }
}
