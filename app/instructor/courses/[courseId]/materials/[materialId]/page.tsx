import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";

export default async function InstructorMaterialDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>;
}) {
  const session = await getSession();

  if (!session || session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  const { courseId, materialId } = await params;

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      title: true,
      materialType: true,
      contentText: true,
      fileUrl: true,
      courseId: true,
      course: {
        select: {
          instructorId: true,
        },
      },
    },
  });

  if (
    !material ||
    material.courseId !== courseId ||
    material.course.instructorId !== session.userId
  ) {
    redirect("/login");
  }

  return (
    <InstructorShell
      title={material.title}
      description="Material View"
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
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
    </InstructorShell>
  );
}