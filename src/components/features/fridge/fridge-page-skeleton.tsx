"use client";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[12px] bg-[#e2e9e5] ${className}`} />;
}

export function FridgePageSkeleton() {
  return (
    <div className="space-y-7">
      {[
        { title: "🧊 큐브", count: 5, quantity: true },
        { title: "🥩 단백질", count: 3, quantity: false },
        { title: "🥦 채소", count: 3, quantity: false },
      ].map((section) => (
        <section key={section.title}>
          <SkeletonBlock className="mb-3 h-5 w-20" />
          <div className="space-y-2.5">
            {Array.from({ length: section.count }).map((_, idx) => (
              <div
                key={`${section.title}-item-${idx}`}
                className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3"
              >
                <SkeletonBlock className="h-6 w-28" />
                {section.quantity ? (
                  <SkeletonBlock className="h-8 w-10 rounded-full" />
                ) : (
                  <span className="w-10" />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
