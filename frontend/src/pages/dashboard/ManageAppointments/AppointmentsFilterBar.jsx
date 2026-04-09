import { Card } from "antd";
import { Search, Filter } from "@/components/common";

const AppointmentsFilterBar = ({
  searchText,
  onSearch,
  filterConfig,
  filters,
  onFilterChange,
  onFilterClear,
}) => {
  return (
    <Card className="mb-6! shadow-sm! border-gray-200! rounded-xl!">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="w-full lg:w-96">
          <Search
            value={searchText}
            onSearch={onSearch}
            placeholder="Tìm theo tên bệnh nhân, SĐT, CCCD..."
            className="w-full!"
          />
        </div>
        <div className="w-full lg:w-auto">
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={onFilterChange}
            onClear={onFilterClear}
          />
        </div>
      </div>
    </Card>
  );
};

export default AppointmentsFilterBar;
