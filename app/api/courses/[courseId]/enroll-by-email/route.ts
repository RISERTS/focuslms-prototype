import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { courseId } = await params;

    const body = (await req.json()) as {
      email?: string;
    };

    if (!body.email?.trim()) {
      return NextResponse.json(
        { error: "Student email is required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only manage your own courses." },
        { status: 403 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { email: body.email.trim() },
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Student account not found." },
        { status: 404 }
      );
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId,
        },
      },
    });

    if (!existing) {
      await prisma.enrollment.create({
        data: {
          userId: student.id,
          courseId,
          status: "APPROVED",
          decidedAt: new Date(),
        },
      });

      return NextResponse.json({ message: "Student enrolled successfully." });
    }

    if (existing.status === "APPROVED") {
      return NextResponse.json(
        { error: "Student is already enrolled." },
        { status: 400 }
      );
    }

    await prisma.enrollment.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Student enrolled successfully." });
  } catch (error) {
    console.error("Enroll by email error:", error);
    return NextResponse.json(
      { error: "Failed to enroll student." },
      { status: 500 }
    );
  }
}