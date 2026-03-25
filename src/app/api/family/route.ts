import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/api-auth";
import {
  addFamilyMemberToDb,
  listFamilyMembersFromDb,
  removeFamilyMemberFromDb,
} from "@/lib/server/supabase-app-data";

const ROLES = ["mother", "father", "grandparent", "caregiver"] as const;

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ members: await listFamilyMembersFromDb(user.id) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to fetch family members";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    role?: "mother" | "father" | "grandparent" | "caregiver";
  };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  if (!body.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ message: "invalid role" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      {
        member: await addFamilyMemberToDb({
          userId: user.id,
          name: body.name.trim(),
          role: body.role,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to add family member";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };

  if (typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  let removed = false;
  try {
    removed = await removeFamilyMemberFromDb(user.id, body.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to remove family member";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!removed) {
    return NextResponse.json({ message: "member not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
