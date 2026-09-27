import { PageHeaderSkeleton, StatGridSkeleton, ListCardSkeleton, CardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ListCardSkeleton className="lg:col-span-2" />
        <CardSkeleton bodyHeight="h-56" />
      </div>
    </>
  );
}
