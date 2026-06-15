"use client";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#e2e9e5] ${className}`} />;
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[#fdfefd] pb-24">
      <div className="bg-[#f3f8f4] px-4 pb-4 pt-[calc(44px+env(safe-area-inset-top))]">
        <SkeletonBlock className="h-4 w-20 rounded-full" />
        <div className="mt-5 rounded-[22px] bg-[#fdfefd] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 w-11" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-3.5 w-24" />
              </div>
            </div>
            <SkeletonBlock className="h-8 w-16 rounded-[12px]" />
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-[#fdfefd] px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-7 w-7 rounded-md" />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={`week-skeleton-${idx}`} className="flex flex-col items-center px-1 py-2.5">
                <SkeletonBlock className="h-3 w-4 rounded-full" />
                <SkeletonBlock className="mt-2 h-4 w-5 rounded-full" />
                <div className="mt-2 flex h-[17px] flex-col justify-between">
                  <SkeletonBlock className="h-[3px] w-4 rounded-full" />
                  <SkeletonBlock className="h-[3px] w-4 rounded-full" />
                  <SkeletonBlock className="h-[3px] w-4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#fdfefd] px-4 pb-24 pt-6">
        <SkeletonBlock className="ml-3 h-3.5 w-24 rounded-full" />
        <div className="ml-3 mb-4 mt-3 flex items-center justify-between">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-7 w-7 rounded-md" />
        </div>

        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`meal-card-skeleton-${idx}`}
              className="rounded-[14px] border border-[#c8cfcd] bg-[#fdfefd] px-4 py-3.5"
            >
              <SkeletonBlock className="h-5 w-12" />
              <div className="mt-4 space-y-3 pl-[10px]">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
