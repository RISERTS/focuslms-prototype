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
      studentIds?: string[];
    };

    const studentIds = Array.isArray(body.studentIds)
      ? [...new Set(body.studentIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one student." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        instructorId: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only enroll students in your own course." },
        { status: 403 }
      );
    }

    const validStudents = await prisma.user.findMany({
      where: {
        id: {
          in: studentIds,
        },
        role: "STUDENT",
      },
      select: {
        id: true,
      },
    });

    if (validStudents.length === 0) {
      return NextResponse.json(
        { error: "No valid students were selected." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      validStudents.map((student) =>
        prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: student.id,
              courseId,
            },
          },
          update: {
            status: "APPROVED",
          },
          create: {
            userId: student.id,
            courseId,
            status: "APPROVED",
          },
        })
      )
    );

    return NextResponse.json({
      message: `${validStudents.length} student(s) enrolled successfully.`,
      enrolledCount: validStudents.length,
    });
  } catch (error) {
    console.error("Bulk enroll students error:", error);
    return NextResponse.json(
      { error: "Failed to enroll selected students." },
      { status: 500 }
    );
  }
}