import { Table } from "@/components/common";
import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import CreateScheduleDrawer from "./CreateScheduleDrawer";
import { scheduleApi } from "./scheduleApi";
import ScheduleDetailDrawer from "./ScheduleDetailDrawer";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SchedulePage = () => {
  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({ dateRange: null });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchSchedules = async (page = pagination.current) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format("YYYY-MM-DD");
        params.endDate = filters.dateRange[1].format("YYYY-MM-DD");
      }

      // Master Dev: Sử dụng Service
      const res = await scheduleApi.getSchedules(params);
      setSchedules(res?.schedules || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: res?.total || 0,
      }));
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(pagination.current);
  }, [pagination.current, pagination.pageSize]);

  const handleApplyFilter = () => fetchSchedules(1);

  const handleResetFilter = () => {
    setFilters({ dateRange: null });
    setPagination((prev) => ({ ...prev, current: 1 }));
    setTimeout(() => fetchSchedules(1), 0);
  };

  const handleViewDetail = (record) => {
    setSelectedSchedule(record);
    setDetailDrawerVisible(true);
  };

  // Master Dev: Chỉ giữ lại các cột cơ bản, bỏ cột Bác sĩ
  const columns = [
    {
      title: "Ngày làm việc",
      dataIndex: "date",
      key: "date",
      render: (date) => (
        <span className="font-semibold text-slate-700">
          {dayjs(date).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      title: "Tổng số ca khám",
      dataIndex: "totalSlots",
      key: "totalSlots",
      render: (total) => (
        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold">
          {total} ca
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined className="text-indigo-600!" />}
          onClick={() => handleViewDetail(record)}
          className="bg-indigo-50! hover:bg-indigo-100! "
        />
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Title level={3} className="mb-1! text-slate-800!">
            Quản lý Lịch làm việc
          </Title>
          <Text className="text-slate-500!">
            Thiết lập và theo dõi các ca khám bệnh cá nhân trong ngày.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateDrawerVisible(true)}
          className="bg-indigo-600! hover:bg-indigo-700! border-none! font-semibold!  h-10! shadow-sm! shadow-indigo-600/20!"
        >
          Tạo lịch mới
        </Button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          {/* Đã xóa Filter theo Bác sĩ */}
          <div className="w-full md:w-80">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Lọc theo thời gian
            </label>
            <RangePicker
              className="w-full! h-10! "
              format="DD/MM/YYYY"
              value={filters.dateRange}
              onChange={(dates) => setFilters({ dateRange: dates })}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleApplyFilter}
              className="bg-slate-800! hover:bg-slate-900! border-none!  h-10! font-medium!"
            >
              Tìm kiếm
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetFilter}
              className=" h-10! text-slate-600! hover:text-slate-800! hover:border-slate-400!"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={schedules}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            className: "px-6! py-4!",
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, current: page, pageSize }),
          }}
          scroll={{ x: 700 }}
        />
      </div>

      <CreateScheduleDrawer
        visible={createDrawerVisible}
        onClose={() => setCreateDrawerVisible(false)}
        onSuccess={() => fetchSchedules(1)}
      />
      <ScheduleDetailDrawer
        visible={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        schedule={selectedSchedule}
      />
    </div>
  );
};

export default SchedulePage;
