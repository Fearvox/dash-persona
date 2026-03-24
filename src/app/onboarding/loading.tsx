import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div
      className="flex flex-1 flex-col items-center px-6 py-16 sm:py-24"
      aria-busy="true"
      aria-label="Loading onboarding"
    >
      <div className="w-full max-w-lg">
        {/* Progress bar skeleton */}
        <div className="mb-10 flex items-center gap-3">
          <Skeleton className="h-1 flex-1" />
          <Skeleton className="h-1 flex-1" />
        </div>

        {/* Heading skeleton */}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-sm" />

        {/* Input skeleton */}
        <Skeleton className="mt-8 h-12 w-full rounded-lg" />

        {/* Button skeleton */}
        <div className="mt-10 flex justify-end">
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
