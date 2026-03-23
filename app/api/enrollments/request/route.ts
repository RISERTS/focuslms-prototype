import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      courseId?: string;
    };

    if (!body.courseId) {
      return NextResponse.json(
        { error: "Course is required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: body.courseId,
        },
      },
    });

    if (!existing) {
      await prisma.enrollment.create({
        data: {
          userId: session.userId,
          courseId: body.courseId,
          status: "PENDING",
          decidedAt: null,
        },
      });

      return NextResponse.json({ message: "Enrollment request submitted." });
    }

    if (existing.status === "APPROVED") {
      return NextResponse.json(
        { error: "You are already enrolled in this course." },
        { status: 400 }
      );
    }

    if (existing.status === "PENDING") {
      return NextResponse.json(
        { error: "Your request is still pending approval." },
        { status: 400 }
      );
    }

    await prisma.enrollment.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        decidedAt: null,
      },
    });

    return NextResponse.json({ message: "Enrollment request submitted." });
  } catch (error) {
    console.error("Enrollment request error:", error);
    return NextResponse.json(
      { error: "Failed to submit enrollment request." },
      { status: 500 }
    );
  }
}