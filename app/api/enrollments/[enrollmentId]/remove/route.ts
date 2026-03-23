import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { enrollmentId } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        course: {
          select: {
            id: true,
            instructorId: true,
          },
        },
      },
    });

    if (!enrollment || enrollment.course.instructorId !== session.userId) {
      return NextResponse.json(
        { error: "Enrollment record not found." },
        { status: 404 }
      );
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollmentId,
      },
    });

    return NextResponse.json({
      message: "Student removed successfully.",
    });
  } catch (error) {
    console.error("Remove enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to remove student." },
      { status: 500 }
    );
  }
}