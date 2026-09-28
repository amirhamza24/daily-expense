import { PageHeaderSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      <TableSkeleton rows={8} columns={6} filters={3} />
    </>
  );
}
