import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type TaskListPaginationProps = {
  page: number
  perPage: number
  total: number
  onPageChange: (nextPage: number) => void
  disabled?: boolean
}

function buildPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = [1]

  const rangeStart = Math.max(2, currentPage - 1)
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1)

  if (rangeStart > 2) {
    pages.push("ellipsis")
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }

  if (rangeEnd < totalPages - 1) {
    pages.push("ellipsis")
  }

  pages.push(totalPages)

  return pages
}

export function TaskListPagination({
  page,
  perPage,
  total,
  onPageChange,
  disabled = false,
}: TaskListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const remainingCount = Math.max(0, total - (page - 1) * perPage)
  const displayedCount = total === 0 ? 0 : Math.min(perPage, remainingCount)
  const pageNumbers = buildPageNumbers(page, totalPages)

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        全{total}件中{displayedCount}件を表示
      </p>
      <Pagination className="mx-0 w-full justify-start sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(page - 1)}
              disabled={disabled || page <= 1}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum, index) =>
            pageNum === "ellipsis" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: 省略記号は位置で区別する
              <PaginationItem key={`ellipsis-${index}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem
                key={pageNum}
                className={
                  pageNum === page || pageNum === 1 || pageNum === totalPages
                    ? ""
                    : "hidden sm:block"
                }
              >
                <PaginationLink
                  isActive={pageNum === page}
                  onClick={() => onPageChange(pageNum)}
                  disabled={disabled}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(page + 1)}
              disabled={disabled || page >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
