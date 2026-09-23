import { IEmployeeSalarySnapshot, ISalarySyncResult } from "@/apis/staffSchedule.apis";
import staffScheduleApis from "@/apis/staffSchedule.apis";
import { PageHeader } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react";
import { useEffect } from "react";
import GlobalSnapshotBlock, {
  useSalaryForm,
} from "./components/GlobalSnapshotBlock";
import SpecialSalaryDaysSection, {
  salarySpecialDaysQueryKey,
} from "./components/SpecialSalaryDaysSection";
import { useQueryConfig } from "./hooks/useQueryConfig";
import { SalaryFormValues } from "./types";
import { buildHourlyRateMap, buildHourlyShiftMap } from "./utils";

const salaryQueryKeys = {
  snapshot: ["employeeSalarySnapshot"] as const,
};

const scheduleQueryRoots = [
  "staffSchedules",
  "staffSchedulesWithSummary",
  "mySchedules",
  "staff-schedules",
  "schedule-detail",
  "schedule-detail-modal",
] as const;

const defaultSalaryValues: SalaryFormValues = {
  hourlyRateMap: buildHourlyRateMap(),
  hourlyShiftMap: buildHourlyShiftMap(),
};

const normalizeSalarySnapshot = (
  data?: IEmployeeSalarySnapshot | null,
): SalaryFormValues => {
  const fallbackRate = data?.hourlyRate ?? 0;
  return {
    hourlyRateMap: buildHourlyRateMap(data?.hourlyRateMap, fallbackRate),
    hourlyShiftMap: buildHourlyShiftMap(data?.hourlyShiftMap),
  };
};

function StaffSalaryConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { queryConfig, setQueryConfig } = useQueryConfig();
  const form = useSalaryForm(defaultSalaryValues);

  const {
    data: snapshotResponse,
    isLoading: isLoadingSnapshot,
    isFetching: isFetchingSnapshot,
  } = useQuery({
    queryKey: salaryQueryKeys.snapshot,
    queryFn: staffScheduleApis.getSalarySnapshot,
  });

  const snapshot = snapshotResponse?.data.result;

  useEffect(() => {
    form.reset(normalizeSalarySnapshot(snapshot));
  }, [form, snapshot]);

  const invalidateSalaryQueries = () => {
    queryClient.invalidateQueries({ queryKey: salaryQueryKeys.snapshot });
  };

  const invalidateScheduleQueries = () => {
    scheduleQueryRoots.forEach((queryRoot) => {
      queryClient.invalidateQueries({ queryKey: [queryRoot] });
    });
  };

  const updateSnapshotMutation = useMutation({
    mutationFn: staffScheduleApis.updateSalarySnapshot,
    onSuccess: () => {
      invalidateSalaryQueries();
      toast({
        title: "Success",
        description: "Global salary snapshot saved.",
      });
    },
  });

  const syncSalaryMutation = useMutation({
    mutationFn: staffScheduleApis.syncSalarySnapshot,
    onSuccess: (response) => {
      const result = response.data?.result as ISalarySyncResult | undefined;
      invalidateSalaryQueries();
      queryClient.invalidateQueries({ queryKey: salarySpecialDaysQueryKey });
      toast({
        title: "Success",
        description: result
          ? `Synced ${result.syncedCount}/${result.totalStaffs} staff members.`
          : "Salary snapshot synced for all staff.",
      });
      invalidateScheduleQueries();
    },
  });

  const handleSaveSnapshot = (values: SalaryFormValues) => {
    updateSnapshotMutation.mutate({
      hourlyRateMap: buildHourlyRateMap(values.hourlyRateMap),
      hourlyShiftMap: buildHourlyShiftMap(values.hourlyShiftMap),
    });
  };

  const isGlobalBusy =
    isLoadingSnapshot ||
    isFetchingSnapshot ||
    updateSnapshotMutation.isPending ||
    syncSalaryMutation.isPending;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Staff salary configuration"
        description="Global snapshot, full-system sync, special salary days, and probation settings per user."
        icon={CircleDollarSign}
        className="mb-2"
      />

      <GlobalSnapshotBlock
        form={form}
        isBusy={isGlobalBusy}
        isSaving={updateSnapshotMutation.isPending}
        isSyncing={syncSalaryMutation.isPending}
        onSubmit={handleSaveSnapshot}
        onSync={() => syncSalaryMutation.mutate()}
      />

      <SpecialSalaryDaysSection
        from={queryConfig.from ?? ""}
        to={queryConfig.to ?? ""}
        onFromChange={(v) => setQueryConfig({ from: v || null })}
        onToChange={(v) => setQueryConfig({ to: v || null })}
      />
    </div>
  );
}

export default StaffSalaryConfig;
