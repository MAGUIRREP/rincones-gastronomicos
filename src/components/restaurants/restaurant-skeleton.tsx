import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton loader con la misma estructura que RestaurantCard. */
export function RestaurantCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-3 p-4">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
      <CardFooter className="flex gap-2 border-t p-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </CardFooter>
    </Card>
  );
}

export function RestaurantGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}
