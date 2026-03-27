import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import InstructorShell from "@/components/instructor/InstructorShell";
import MaterialForm from "@/components/materials/MaterialForm";

export default async function EditMaterialPage({
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
      originalFileName: true,
      term: true,
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
      title="Edit Material"
      description="Update the title, term, type, and content of this material."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <MaterialForm
        mode="edit"
        courseId={courseId}
        materialId={materialId}
        initialData={{
          title: material.title,
          materialType: material.materialType,
          contentText: material.contentText ?? "",
          linkUrl: material.materialType === "LINK" ? material.fileUrl ?? "" : "",
          term: material.term,
          currentFileName: material.originalFileName ?? "",
          currentFileUrl: material.fileUrl ?? "",
        }}
      />
    </InstructorShell>
  );
}