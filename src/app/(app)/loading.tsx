import { RestaurantGridSkeleton } from "@/components/restaurants/restaurant-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-16 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full rounded-xl" />
      <RestaurantGridSkeleton count={4} />
    </div>
  );
}
