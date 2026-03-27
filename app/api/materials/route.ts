import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { saveMaterialFile } from "@/lib/material-storage";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";
type MaterialType = "TEXT" | "LINK" | "FILE";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await req.formData();

    const courseId = String(formData.get("courseId") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const materialType = String(formData.get("materialType") || "LINK") as MaterialType;
    const term = String(formData.get("term") || "PRELIMS") as TermCategory;
    const contentText = String(formData.get("contentText") || "").trim();
    const linkUrl = String(formData.get("linkUrl") || "").trim();
    const uploadedFile = formData.get("file");

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "Course and material title are required." },
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

    let fileKey: string | null = null;
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    let originalFileName: string | null = null;
    let normalizedContentText: string | null = null;

    if (materialType === "TEXT") {
      if (!contentText) {
        return NextResponse.json(
          { error: "Text content is required for text materials." },
          { status: 400 }
        );
      }

      normalizedContentText = contentText;
      fileType = "TEXT";
    } else if (materialType === "LINK") {
      if (!linkUrl) {
        return NextResponse.json(
          { error: "A link URL is required for link materials." },
          { status: 400 }
        );
      }

      fileKey = linkUrl;
      fileUrl = linkUrl;
      fileType = "LINK";
    } else {
      if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
        return NextResponse.json(
          { error: "A file is required for file materials." },
          { status: 400 }
        );
      }

      const saved = await saveMaterialFile(uploadedFile);
      fileKey = saved.fileKey;
      fileUrl = saved.fileUrl;
      fileType = saved.fileType;
      originalFileName = saved.originalFileName;
    }

    const material = await prisma.material.create({
      data: {
        courseId,
        title,
        materialType,
        contentText: normalizedContentText,
        fileKey,
        fileUrl,
        fileType,
        originalFileName,
        term,
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