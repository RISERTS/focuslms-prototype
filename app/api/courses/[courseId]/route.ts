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

    if (!course || course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
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

export async function DELETE(
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
      confirmation?: string;
    };

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    const requiredPhrase = `DELETE ${course.title}`;

    if (body.confirmation !== requiredPhrase) {
      return NextResponse.json(
        { error: `Type exactly: ${requiredPhrase}` },
        { status: 400 }
      );
    }

    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      select: { id: true },
    });

    const quizIds = quizzes.map((quiz) => quiz.id);

    const questions =
      quizIds.length > 0
        ? await prisma.question.findMany({
            where: { quizId: { in: quizIds } },
            select: { id: true },
          })
        : [];

    const attempts =
      quizIds.length > 0
        ? await prisma.quizAttempt.findMany({
            where: { quizId: { in: quizIds } },
            select: { id: true },
          })
        : [];

    const questionIds = questions.map((q) => q.id);
    const attemptIds = attempts.map((a) => a.id);

    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({
        where: {
          OR: [
            { questionId: { in: questionIds } },
            { attemptId: { in: attemptIds } },
          ],
        },
      }),
      prisma.quizAttempt.deleteMany({
        where: {
          id: { in: attemptIds },
        },
      }),
      prisma.question.deleteMany({
        where: {
          id: { in: questionIds },
        },
      }),
      prisma.quiz.deleteMany({
        where: { courseId },
      }),
      prisma.material.deleteMany({
        where: { courseId },
      }),
      prisma.activityLog.deleteMany({
        where: { courseId },
      }),
      prisma.enrollment.deleteMany({
        where: { courseId },
      }),
      prisma.course.delete({
        where: { id: courseId },
      }),
    ]);

    return NextResponse.json({ message: "Course deleted successfully." });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json(
      { error: "Failed to delete course." },
      { status: 500 }
    );
  }
}