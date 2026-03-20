import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function PATCH(
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
      courseCode?: string;
      title?: string;
      description?: string;
      program?: string;
      section?: string;
    };

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only update your own course." },
        { status: 403 }
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Course title is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        courseCode: body.courseCode?.trim() || null,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        program: body.program?.trim() || null,
        section: body.section?.trim() || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update course settings error:", error);
    return NextResponse.json(
      { error: "Failed to update course settings." },
      { status: 500 }
    );
  }
}