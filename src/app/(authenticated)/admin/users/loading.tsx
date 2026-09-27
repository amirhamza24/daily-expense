import { PageHeaderSkeleton, TableSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <TableSkeleton rows={8} columns={5} filters={2} />
    </>
  );
}
