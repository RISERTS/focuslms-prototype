import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";

export default async function StudentMaterialDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "STUDENT") {
    redirect("/login");
  }

  const { courseId, materialId } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect("/student/courses");
  }

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      title: true,
      materialType: true,
      contentText: true,
      fileUrl: true,
      courseId: true,
    },
  });

  if (!material || material.courseId !== courseId) {
    redirect("/student/courses");
  }

  return (
    <StudentShell
      title={material.title}
      description="Material View"
      sessionEmail={session.email}
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        {material.materialType === "TEXT" ? (
          <div className="prose max-w-none whitespace-pre-wrap text-sm leading-7 text-gray-800">
            {material.contentText}
          </div>
        ) : material.fileUrl ? (
          <a
            href={material.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Open Material
          </a>
        ) : (
          <p className="text-sm text-gray-600">No material content available.</p>
        )}
      </div>
    </StudentShell>
  );
}