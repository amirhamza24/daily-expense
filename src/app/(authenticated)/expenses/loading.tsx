import { PageHeaderSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} columns={4} filters={3} />
    </>
  );
}
