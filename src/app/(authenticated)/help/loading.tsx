import { PageHeaderSkeleton, CardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <CardSkeleton bodyHeight="h-32" />
      <CardSkeleton bodyHeight="h-32" />
      <CardSkeleton bodyHeight="h-32" />
    </>
  );
}
