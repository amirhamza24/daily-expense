import { PageHeaderSkeleton, StatGridSkeleton, CardSkeleton, ListCardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardSkeleton bodyHeight="h-9" />
      <StatGridSkeleton count={8} />
      <ListCardSkeleton rows={4} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <CardSkeleton className="lg:col-span-3" bodyHeight="h-65" />
        <CardSkeleton className="lg:col-span-2" bodyHeight="h-65" />
      </div>
      <CardSkeleton bodyHeight="h-60" />
    </>
  );
}
