import { PageHeaderSkeleton, CardSkeleton, StatGridSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardSkeleton bodyHeight="h-9" />
      <StatGridSkeleton count={6} className="grid-cols-2 md:grid-cols-3" />
      <CardSkeleton bodyHeight="h-64" />
    </>
  );
}
