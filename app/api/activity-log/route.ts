import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type ActionType =
  | "LOGIN"
  | "OPEN_MATERIAL"
  | "START_QUIZ"
  | "ANSWER_QUESTION"
  | "SUBMIT_QUIZ"
  | "VIEW_DASHBOARD";

const allowedActions: ActionType[] = [
  "LOGIN",
  "OPEN_MATERIAL",
  "START_QUIZ",
  "ANSWER_QUESTION",
  "SUBMIT_QUIZ",
  "VIEW_DASHBOARD",
];

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      actionType?: ActionType;
      courseId?: string | null;
      targetId?: string | null;
      durationSeconds?: number | null;
    };

    const { actionType, courseId, targetId, durationSeconds } = body;

    if (!actionType || !allowedActions.includes(actionType)) {
      return NextResponse.json(
        { error: "Invalid action type." },
        { status: 400 }
      );
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: session.userId,
        courseId: courseId ?? null,
        actionType,
        targetId: targetId ?? null,
        durationSeconds:
          typeof durationSeconds === "number" ? durationSeconds : null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json(
      { error: "Failed to create activity log." },
      { status: 500 }
    );
  }
}