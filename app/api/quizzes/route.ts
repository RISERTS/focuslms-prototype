import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can create quizzes." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      courseId?: string;
      title?: string;
      description?: string;
    };

    const { courseId, title, description } = body;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: "Course and quiz title are required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only create quizzes for your own courses." },
        { status: 403 }
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz." },
      { status: 500 }
    );
  }
}
