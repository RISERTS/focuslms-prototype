import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { deleteMaterialFile, saveMaterialFile } from "@/lib/material-storage";

type TermCategory = "PRELIMS" | "MIDTERMS" | "FINALS";
type MaterialType = "TEXT" | "LINK" | "FILE";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { materialId } = await params;
    const formData = await req.formData();

    const title = String(formData.get("title") || "").trim();
    const materialType = String(formData.get("materialType") || "LINK") as MaterialType;
    const term = String(formData.get("term") || "PRELIMS") as TermCategory;
    const contentText = String(formData.get("contentText") || "").trim();
    const linkUrl = String(formData.get("linkUrl") || "").trim();
    const uploadedFile = formData.get("file");

    if (!title) {
      return NextResponse.json(
        { error: "Material title is required." },
        { status: 400 }
      );
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        materialType: true,
        fileKey: true,
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!material || material.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Material not found." },
        { status: 404 }
      );
    }

    let nextFileKey: string | null = null;
    let nextFileUrl: string | null = null;
    let nextFileType: string | null = null;
    let nextOriginalFileName: string | null = null;
    let nextContentText: string | null = null;

    if (materialType === "TEXT") {
      if (!contentText) {
        return NextResponse.json(
          { error: "Text content is required for text materials." },
          { status: 400 }
        );
      }

      nextContentText = contentText;
      nextFileType = "TEXT";

      if (material.materialType === "FILE" && material.fileKey) {
        await deleteMaterialFile(material.fileKey);
      }
    } else if (materialType === "LINK") {
      if (!linkUrl) {
        return NextResponse.json(
          { error: "A link URL is required for link materials." },
          { status: 400 }
        );
      }

      nextFileKey = linkUrl;
      nextFileUrl = linkUrl;
      nextFileType = "LINK";

      if (material.materialType === "FILE" && material.fileKey) {
        await deleteMaterialFile(material.fileKey);
      }
    } else {
      if (uploadedFile instanceof File && uploadedFile.size > 0) {
        const saved = await saveMaterialFile(uploadedFile);
        nextFileKey = saved.fileKey;
        nextFileUrl = saved.fileUrl;
        nextFileType = saved.fileType;
        nextOriginalFileName = saved.originalFileName;

        if (material.materialType === "FILE" && material.fileKey) {
          await deleteMaterialFile(material.fileKey);
        }
      } else {
        const existing = await prisma.material.findUnique({
          where: { id: materialId },
          select: {
            fileKey: true,
            fileUrl: true,
            fileType: true,
            originalFileName: true,
          },
        });

        if (!existing?.fileKey || !existing.fileUrl) {
          return NextResponse.json(
            { error: "Please upload a file." },
            { status: 400 }
          );
        }

        nextFileKey = existing.fileKey;
        nextFileUrl = existing.fileUrl;
        nextFileType = existing.fileType;
        nextOriginalFileName = existing.originalFileName;
      }
    }

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: {
        title,
        materialType,
        contentText: nextContentText,
        fileKey: nextFileKey,
        fileUrl: nextFileUrl,
        fileType: nextFileType,
        originalFileName: nextOriginalFileName,
        term,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update material error:", error);
    return NextResponse.json(
      { error: "Failed to update material." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { materialId } = await params;

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        materialType: true,
        fileKey: true,
        courseId: true,
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!material || material.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Material not found." },
        { status: 404 }
      );
    }

    if (material.materialType === "FILE" && material.fileKey) {
      await deleteMaterialFile(material.fileKey);
    }

    await prisma.material.delete({
      where: { id: materialId },
    });

    return NextResponse.json({
      message: "Material deleted successfully.",
    });
  } catch (error) {
    console.error("Delete material error:", error);
    return NextResponse.json(
      { error: "Failed to delete material." },
      { status: 500 }
    );
  }
}