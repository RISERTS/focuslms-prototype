import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can add materials." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      courseId?: string;
      title?: string;
      fileKey?: string;
      fileUrl?: string;
      fileType?: string;
      term?: TermCategory;
    };

    const { courseId, title, fileKey, fileUrl, fileType, term } = body;

    if (
      !courseId ||
      !title?.trim() ||
      !fileKey?.trim() ||
      !fileUrl?.trim() ||
      !fileType?.trim()
    ) {
      return NextResponse.json(
        { error: "Required material fields are missing." },
        { status: 400 }
      );
    }

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
        { error: "You can only add materials to your own course." },
        { status: 403 }
      );
    }

    const material = await prisma.material.create({
      data: {
        courseId,
        title: title.trim(),
        fileKey: fileKey.trim(),
        fileUrl: fileUrl.trim(),
        fileType: fileType.trim(),
        term: term ?? "PRELIMS",
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Create material error:", error);
    return NextResponse.json(
      { error: "Failed to create material." },
      { status: 500 }
    );
  }
}