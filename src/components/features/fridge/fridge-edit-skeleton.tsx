"use client";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#dce3e0] ${className}`} />;
}

export function FridgeEditSkeleton() {
  return (
    <div className="space-y-6">
      {[
        { titleWidth: "w-24", rows: 4 },
        { titleWidth: "w-20", rows: 3 },
        { titleWidth: "w-16", rows: 2 },
      ].map((section, sectionIndex) => (
        <section key={`fridge-edit-skeleton-section-${sectionIndex}`}>
          <SkeletonBlock className={`mb-3 h-5 ${section.titleWidth}`} />
          <div className="space-y-2.5">
            {Array.from({ length: section.rows }).map((_, rowIndex) => (
              <div
                key={`fridge-edit-skeleton-row-${sectionIndex}-${rowIndex}`}
                className="flex items-center justify-between rounded-[16px] border border-[#c2d8cc] bg-white px-5 py-[18px]"
              >
                <SkeletonBlock className="h-6 w-32" />
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-8 w-16 rounded-xl" />
                  <SkeletonBlock className="h-5 w-5 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
