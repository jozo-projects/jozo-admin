import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import SearchInput from "./SearchInput";
import StatusFilter from "./StatusFilter";
import PositionFilter from "./PositionFilter";
import WorkShiftsFilter from "./WorkShiftsFilter";
import GenderFilter from "./GenderFilter";

interface FiltersContainerProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  positionFilter: string;
  onPositionChange: (value: string) => void;
  workShiftsFilter: string;
  onWorkShiftsChange: (value: string) => void;
  genderFilter: string;
  onGenderChange: (value: string) => void;
}

const FiltersContainer: React.FC<FiltersContainerProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  positionFilter,
  onPositionChange,
  workShiftsFilter,
  onWorkShiftsChange,
  genderFilter,
  onGenderChange,
}) => {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <SearchInput value={searchTerm} onChange={onSearchChange} />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusFilter value={statusFilter} onChange={onStatusChange} />
            <PositionFilter
              value={positionFilter}
              onChange={onPositionChange}
            />
            <WorkShiftsFilter
              value={workShiftsFilter}
              onChange={onWorkShiftsChange}
            />
            <GenderFilter value={genderFilter} onChange={onGenderChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiltersContainer;
