import InstructorShell from "@/components/instructor/InstructorShell";
import MaterialForm from "@/components/materials/MaterialForm";

export default async function AddMaterialPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <InstructorShell
      title="Add Material"
      description="Create a text lesson, external link, or uploaded file material."
      actions={[
        {
          label: "Back to Course",
          href: `/instructor/courses/${courseId}`,
          variant: "secondary",
        },
      ]}
    >
      <MaterialForm mode="create" courseId={courseId} />
    </InstructorShell>
  );
}