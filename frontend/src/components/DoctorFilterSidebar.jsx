import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Divider, Input, Select, Slider } from "antd";
import { useEffect, useState } from "react";

const { Option } = Select;

const DoctorFilterSidebar = ({
  specialties,
  filters,
  onFilterChange,
  onSearch,
  onReset,
  clinics,
  isMobile = false, // Master Dev: Thêm prop này để phân biệt môi trường render
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // useEffect để đồng bộ localSearch khi filters.search thay đổi từ bên ngoài (ví dụ reset)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Thay đổi style vỏ bọc dựa trên môi trường hiển thị
  const wrapperClass = isMobile
    ? "p-5" // Trong Drawer trên Mobile thì chỉ cần padding
    : "bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 p-5 sticky top-24"; // Desktop thì dùng thẻ Card nổi

  return (
    <div className={wrapperClass}>
      {/* Chỉ hiện Header trên Desktop, vì Drawer Mobile đã có title riêng */}
      {!isMobile && (
        <div className="flex items-center gap-2 mb-5">
          <FilterOutlined className="text-blue-600 text-lg" />
          <h3 className="text-lg font-bold text-slate-800 m-0">
            Bộ lọc tìm kiếm
          </h3>
        </div>
      )}

      <div className="space-y-5">
        {/* Tìm kiếm tên */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Tên bác sĩ
          </label>
          <Input
            placeholder="Nhập tên bác sĩ..."
            prefix={<SearchOutlined className="text-slate-400!" />}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className=" h-10! bg-slate-50! border-slate-200! hover:border-blue-400! focus:border-blue-500!"
            onPressEnter={() => {
              onFilterChange("search", localSearch);
              onSearch();
            }}
            allowClear
          />
        </div>

        <Divider className="my-0! border-slate-100!" />

        {/* Chuyên khoa */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Chuyên khoa
          </label>
          <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {specialties.map((spec) => (
              <div
                key={spec._id}
                className="flex items-center justify-between mb-3"
              >
                <Checkbox
                  checked={filters.specialty === spec._id}
                  onChange={(e) =>
                    onFilterChange(
                      "specialty",
                      e.target.checked ? spec._id : null,
                    )
                  }
                  className="flex! items-center! text-slate-600! hover:text-blue-600! transition-colors!"
                >
                  <span className="font-medium text-slate-700">
                    {spec.name}
                  </span>
                </Checkbox>
              </div>
            ))}
          </div>
        </div>

        <Divider className="my-0! border-slate-100!" />

        {/* Phí khám */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Phí khám bệnh (VNĐ)
          </label>
          <div className="px-2">
            <Slider
              range
              min={0}
              max={2000000}
              step={100000}
              value={filters.priceRange}
              onChange={(val) => onFilterChange("priceRange", val)}
              tooltip={{
                formatter: (value) => `${value.toLocaleString()} đ`,
              }}
              className="mt-4! mb-2!"
            />
            <div className="flex justify-between text-xs text-slate-400 font-medium mt-1">
              <span>0 đ</span>
              <span>2.000.000 đ</span>
            </div>
          </div>
        </div>

        <Divider className="my-0! border-slate-100!" />

        {/* Cơ sở y tế */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Cơ sở y tế
          </label>
          <Select
            placeholder="Chọn bệnh viện/phòng khám"
            className="w-full!  h-10!"
            allowClear
            showSearch
            optionFilterProp="children"
            value={filters.clinicId}
            onChange={(val) => onFilterChange("clinicId", val)}
          >
            {clinics?.map((clinic) => (
              <Option key={clinic._id} value={clinic._id}>
                {clinic.clinicName || clinic.name}
              </Option>
            ))}
          </Select>
        </div>

        <Divider className="my-0! border-slate-100!" />

        {/* Kinh nghiệm */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Kinh nghiệm công tác
          </label>
          <Select
            placeholder="Chọn số năm"
            className="w-full!  h-10!"
            allowClear
            value={filters.experience}
            onChange={(val) => onFilterChange("experience", val)}
          >
            <Option value={5}>Trên 5 năm</Option>
            <Option value={10}>Trên 10 năm</Option>
            <Option value={15}>Trên 15 năm</Option>
          </Select>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          <Button
            type="primary"
            block
            onClick={() => {
              onFilterChange("search", localSearch);
              onSearch();
            }}
            className="bg-blue-600! hover:bg-blue-700! border-none!  h-11! font-semibold! shadow-sm! shadow-blue-600/20!"
          >
            Áp dụng bộ lọc
          </Button>
          <Button
            block
            onClick={onReset}
            icon={<ReloadOutlined />}
            className=" h-11! font-medium! text-slate-600! hover:text-slate-800! hover:border-slate-400!"
          >
            Xóa bộ lọc
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorFilterSidebar;
