import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Match {
  username: string;
  transfer_account_id: string | null;
  process_id: string;
  amount: number;
  currency: string;
}

//to manually create matches
export async function POST(request: Request) {
  try {
    const auth = await SessionValidation();
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: "No data found in the request body" },
        { status: 400 }
      );
    }

    const matches: Match[] = body.matches;
    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: "No matches have been found" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.createMany({
        data: matches 
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Matches created successfully",
        count: matches.length
      },
      { status: 201 }
    );

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create matches"
      },
      { status: 500 }
    );
  }
}