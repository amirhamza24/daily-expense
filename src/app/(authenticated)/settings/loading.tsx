import { PageHeaderSkeleton, SectionRowsSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <SectionRowsSkeleton rows={1} />
      <SectionRowsSkeleton rows={2} />
      <SectionRowsSkeleton rows={2} />
    </>
  );
}
