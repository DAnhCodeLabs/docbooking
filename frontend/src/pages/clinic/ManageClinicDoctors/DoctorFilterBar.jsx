import { Filter, Search } from "@/components/common"; // Giả định bạn có sẵn các component này như code cũ
import { Card } from "antd";

const DoctorFilterBar = ({
  searchText,
  setSearchText,
  filters,
  setFilters,
  filterConfig,
}) => {
  return (
    <Card className="mb-6!  shadow-sm! border-gray-200!">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-1/2 lg:w-1/3">
          <Search
            value={searchText}
            onSearch={setSearchText}
            placeholder="Tìm theo tên, email, SĐT..."
            className="w-full!"
          />
        </div>
        <div className="w-full md:w-auto">
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={setFilters}
            onClear={() => setFilters({ status: null, specialty: null })}
          />
        </div>
      </div>
    </Card>
  );
};

export default DoctorFilterBar;
