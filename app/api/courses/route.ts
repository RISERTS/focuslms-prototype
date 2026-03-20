import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      courseCode?: string;
      title?: string;
      description?: string;
      program?: string;
      section?: string;
    };

    const { courseCode, title, description, program, section } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Course title is required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        instructorId: session.userId,
        courseCode: courseCode?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
        program: program?.trim() || null,
        section: section?.trim() || null,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { error: "Failed to create course." },
      { status: 500 }
    );
  }
}