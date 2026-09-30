import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { Gift } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import GiftAppliedBillsFiltersPanel from "./components/GiftAppliedBillsFilters";
import GiftAppliedBillsSummaryCards from "./components/GiftAppliedBillsSummary";
import GiftAppliedBillsTable from "./components/GiftAppliedBillsTable";
import {
  DEFAULT_GIFT_APPLIED_FILTERS,
  type GiftAppliedBillsFilters as GiftAppliedBillsFilterState,
} from "./constants";
import { useGiftAppliedBills } from "./hooks/useGiftAppliedBills";

const SEARCH_DEBOUNCE_MS = 400;

const GiftAppliedBillsPage = () => {
  const [filters, setFilters] = useState<GiftAppliedBillsFilterState>(
    DEFAULT_GIFT_APPLIED_FILTERS,
  );
  const [page, setPage] = useState(1);

  const searchDebounced = useDebounce(filters.search, SEARCH_DEBOUNCE_MS);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      startDate: filters.startDate,
      endDate: filters.endDate,
      kind: filters.kind,
      source: filters.source,
      search: searchDebounced.trim(),
    }),
    [
      page,
      filters.startDate,
      filters.endDate,
      filters.kind,
      filters.source,
      searchDebounced,
    ],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useGiftAppliedBills(queryParams);

  const handleFiltersChange = useCallback(
    (next: Partial<GiftAppliedBillsFilterState>) => {
      setFilters((prev) => ({ ...prev, ...next }));
      setPage(1);
    },
    [],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Bill ưu đãi member"
        description="Biết rõ bill nào được giảm/tặng và lý do áp dụng."
        icon={Gift}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <GiftAppliedBillsFiltersPanel
            filters={filters}
            onChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      <GiftAppliedBillsSummaryCards summary={data?.summary} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách bill</CardTitle>
        </CardHeader>
        <CardContent>
          <GiftAppliedBillsTable
            items={data?.items ?? []}
            page={page}
            totalPages={data?.pagination.totalPages ?? 1}
            total={data?.pagination.total ?? 0}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => refetch()}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftAppliedBillsPage;
