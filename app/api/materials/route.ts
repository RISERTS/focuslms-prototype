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
        { error: "Only instructors can add materials." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      courseId?: string;
      title?: string;
      description?: string;
      fileUrl?: string;
      fileType?: string;
    };

    const { courseId, title, fileUrl, fileType } = body;

    if (!courseId || !title || !fileUrl || !fileType) {
      return NextResponse.json(
        { error: "Course, title, link, and type are required." },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 }
      );
    }

    if (course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "You can only add materials to your own courses." },
        { status: 403 }
      );
    }

    const material = await prisma.material.create({
      data: {
        courseId,
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        fileType: fileType.trim(),
        fileKey: "",
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