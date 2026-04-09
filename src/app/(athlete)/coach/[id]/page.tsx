import { CoachPublicProfile } from '@/components/coaches/coach-public-profile';

export default async function CoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="py-4">
      <CoachPublicProfile coachId={id} />
    </div>
  );
}
