import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type EnrollmentAction = "APPROVE" | "REJECT" | "REMOVE";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { enrollmentId } = await params;

    const body = (await req.json()) as {
      action?: EnrollmentAction;
    };

    if (!body.action) {
      return NextResponse.json(
        { error: "Action is required." },
        { status: 400 }
      );
    }

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

    let nextStatus: "APPROVED" | "REJECTED" | "REMOVED";

    if (body.action === "APPROVE") {
      nextStatus = "APPROVED";
    } else if (body.action === "REJECT") {
      nextStatus = "REJECTED";
    } else {
      nextStatus = "REMOVED";
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: nextStatus,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Enrollment status update error:", error);
    return NextResponse.json(
      { error: "Failed to update enrollment status." },
      { status: 500 }
    );
  }
}