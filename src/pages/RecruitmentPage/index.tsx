import React, { useState } from "react";
import { useRecruitments, useRecruitmentStats } from "@/hooks/use-recruitment";
import { PageHeader } from "@/components/shared";
import { Users } from "lucide-react";
import StatsCards from "./components/StatsCards";
import FiltersContainer from "./components/FiltersContainer";
import DataTableContainer from "./components/DataTableContainer";
import PaginationContainer from "./components/PaginationContainer";
import RefreshButton from "./components/RefreshButton";

const RecruitmentPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [workShiftsFilter, setWorkShiftsFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: recruitmentData,
    isLoading,
    error,
    refetch: refetchRecruitments,
  } = useRecruitments(
    currentPage,
    pageSize,
    searchTerm || undefined,
    statusFilter !== "all" ? statusFilter : undefined,
    positionFilter !== "all" ? positionFilter : undefined,
    workShiftsFilter !== "all" ? workShiftsFilter : undefined,
    genderFilter !== "all" ? genderFilter : undefined
  );

  const { data: stats, refetch: refetchStats } = useRecruitmentStats();

  // Lấy data và pagination info từ response
  const recruitments = recruitmentData?.data || [];
  const pagination = recruitmentData?.pagination;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset về trang đầu tiên khi thay đổi page size
  };

  // Reset về trang 1 khi filter thay đổi
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    positionFilter,
    workShiftsFilter,
    genderFilter,
  ]);

  const handleRefresh = () => {
    refetchRecruitments();
    refetchStats();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Có lỗi xảy ra khi tải dữ liệu</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Quản lý tuyển dụng"
        description="Quản lý danh sách ứng viên tuyển dụng"
        icon={Users}
        actions={<RefreshButton onRefresh={handleRefresh} isLoading={isLoading} />}
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <FiltersContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        positionFilter={positionFilter}
        onPositionChange={setPositionFilter}
        workShiftsFilter={workShiftsFilter}
        onWorkShiftsChange={setWorkShiftsFilter}
        genderFilter={genderFilter}
        onGenderChange={setGenderFilter}
      />

      {/* Data Table */}
      <DataTableContainer
        data={recruitments}
        loading={isLoading}
        total={pagination?.total || 0}
      />

      {/* Pagination */}
      {pagination && (
        <PaginationContainer
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          pageSize={pageSize}
          total={pagination.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};

export default RecruitmentPage;
