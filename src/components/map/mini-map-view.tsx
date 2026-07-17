"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const MiniMapView = dynamic(() => import("@/components/map/mini-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});
