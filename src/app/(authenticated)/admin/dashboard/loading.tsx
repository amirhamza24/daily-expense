import { PageHeaderSkeleton, StatGridSkeleton, CardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatGridSkeleton count={3} className="grid-cols-1 sm:grid-cols-3" />
      <CardSkeleton bodyHeight="h-24" />
    </>
  );
}
