import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";

export default async function StudentMaterialPage({
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
      courseId: true,
      title: true,
      fileType: true,
      fileUrl: true,
      fileKey: true,
    },
  });

  if (!material || material.courseId !== courseId) {
    redirect(`/student/courses/${courseId}`);
  }

  await prisma.activityLog.create({
    data: {
      userId: session.userId,
      courseId,
      actionType: "OPEN_MATERIAL",
      targetId: material.id,
    },
  });

  const materialUrl = material.fileUrl ?? "";
  const hasMaterialUrl = materialUrl.trim().length > 0;

  const isExternal =
    hasMaterialUrl &&
    (materialUrl.startsWith("http://") || materialUrl.startsWith("https://"));

  return (
    <StudentShell
      title={material.title}
      description="Opening this material is tracked as completed progress for your course."
      actions={[
        {
          label: "Back to Course",
          href: `/student/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Material
          </p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">
            {material.title}
          </h2>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-800">Progress recorded</p>
            <p className="mt-2 text-sm text-emerald-700">
              This material has been marked as opened for your course progress.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-700">
              File type:{" "}
              <span className="font-semibold text-gray-900">
                {material.fileType}
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {hasMaterialUrl ? (
              <a
                href={materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {isExternal ? "Open Material" : "View / Download Material"}
              </a>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                No file or link is available for this material yet.
              </div>
            )}

            <Link
              href={`/student/courses/${courseId}`}
              className="rounded-xl border border-gray-300 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Back to Course
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-black p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Completion Rule
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Materials</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                A material is marked as completed once the student opens its
                material page.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">Progress UI</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                The student course page shows completed material badges and an
                overall progress bar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}