import { PageHeaderSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <div className="card overflow-hidden max-w-3xl" aria-hidden>
        <div className="card-head flex items-center gap-4 p-5">
          <div className="skeleton h-16 w-16 rounded-2xl" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton h-4.5 w-40" />
            <div className="skeleton h-3.5 w-56" />
            <div className="flex gap-1.5 mt-1">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-14 rounded-full" />
            </div>
          </div>
          <div className="skeleton hidden sm:block h-8 w-36 rounded-lg" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <div className="skeleton h-8 w-8 rounded-lg" />
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton h-3.5 w-48 ml-auto sm:ml-8" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
