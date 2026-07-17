"use client";

import { usePathname, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ListPaginationProps {
  page: number;
  pageCount: number;
}

/** Paginación basada en el parámetro ?page de la URL. */
export function ListPagination({ page, pageCount }: ListPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageCount <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // Ventana de páginas visibles: primera, última y vecinas de la actual.
  const pages: (number | "ellipsis")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <Pagination>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={hrefFor(page - 1)} aria-label="Página anterior" />
          </PaginationItem>
        )}
        {pages.map((p, i) => (
          <PaginationItem key={`${p}-${i}`}>
            {p === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href={hrefFor(p)} isActive={p === page}>
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        {page < pageCount && (
          <PaginationItem>
            <PaginationNext href={hrefFor(page + 1)} aria-label="Página siguiente" />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
