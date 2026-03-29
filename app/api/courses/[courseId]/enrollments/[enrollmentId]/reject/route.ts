import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function POST(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ courseId: string; enrollmentId: string }>;
  }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { courseId, enrollmentId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        instructorId: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only manage enrollments for your own course." },
        { status: 403 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        courseId: true,
        status: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!enrollment || enrollment.courseId !== courseId) {
      return NextResponse.json(
        { error: "Enrollment request not found." },
        { status: 404 }
      );
    }

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "REJECTED",
      },
    });

    return NextResponse.json({
      message: `${enrollment.user.name} has been rejected.`,
    });
  } catch (error) {
    console.error("Reject enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to reject enrollment request." },
      { status: 500 }
    );
  }
}