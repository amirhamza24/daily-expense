import { PageHeaderSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <TableSkeleton rows={10} columns={6} filters={2} />
    </>
  );
}
