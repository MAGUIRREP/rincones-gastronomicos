import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-3.5", md: "size-4", lg: "size-5" };

/** Estrellas de valoración (solo lectura). */
export function StarRating({ rating, size = "md", className }: StarRatingProps) {
  if (rating == null) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        Sin valorar
      </span>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Valoración: ${rating} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            SIZES[size],
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}
