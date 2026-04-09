import { ActionButtons, Table } from "@/components/common";
import {
  CloseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import CancelLeaveModal from "./CancelLeaveModal";
import CreateLeaveDrawer from "./CreateLeaveDrawer";
import { leaveApi } from "./leaveApi";
import { isPastDay } from "@/utils/date";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const statusMap = {
  active: { color: "success", text: "Đang hiệu lực" },
  cancelled: { color: "default", text: "Đã hủy" },
};

const LeavePage = () => {
  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [filters, setFilters] = useState({ dateRange: null });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Master Dev: Hàm lấy dữ liệu thật từ Backend
  const fetchLeaves = async (page = pagination.current) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.pageSize };

      // Chuyển đổi DateRange thành Mongoose Filter Operator ($gte, $lte) thông qua query string
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format("YYYY-MM-DD");
        params.endDate = filters.dateRange[1].format("YYYY-MM-DD");
      }

      const res = await leaveApi.getLeaves(params);
      setLeaves(res?.leaves || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: res?.total || 0,
      }));
    } catch (error) {
      // Interceptor handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves(pagination.current);
  }, [pagination.current, pagination.pageSize]);

  const handleApplyFilter = () => fetchLeaves(1);

  const handleResetFilter = () => {
    setFilters({ dateRange: null });
    setPagination((prev) => ({ ...prev, current: 1 }));
    setTimeout(() => fetchLeaves(1), 0);
  };

  const openCancelModal = (record) => {
    setSelectedLeave(record);
    setCancelModalVisible(true);
  };

  // Master Dev: Gọi API hủy đơn nghỉ phép
  const handleConfirmCancel = async () => {
    if (!selectedLeave) return;
    setIsCancelling(true);
    try {
      await leaveApi.cancelLeave(selectedLeave._id); // Dùng _id
      setCancelModalVisible(false);
      setSelectedLeave(null);
      fetchLeaves(); // Tải lại danh sách để cập nhật status
    } catch (error) {
      // Interceptor handled
    } finally {
      setIsCancelling(false);
    }
  };

  const columns = [
    {
      title: "Ngày nghỉ",
      dataIndex: "date",
      key: "date",
      width: 130,
      render: (date) => (
        <span className="font-semibold text-slate-700">
          {dayjs(date).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      title: "Thời gian",
      key: "time",
      width: 140,
      render: (_, record) => (
        <span className="text-slate-600 font-medium">
          {record.startTime} - {record.endTime}
        </span>
      ),
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (text) => (
        <span className="text-slate-500 italic">
          {text || "Không có lý do"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const config = statusMap[status] || statusMap.active;
        return (
          <Tag
            color={config.color}
            className="rounded-md px-2 py-1 font-medium border-0"
          >
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => {
        // Chỉ cho phép hủy nếu trạng thái đang active và ngày nghỉ chưa diễn ra ở quá khứ
        const isPast = isPastDay(record.date);
        const canCancel = record.status === "active" && !isPast;

        return (
          canCancel && (
            <ActionButtons
              items={[
                {
                  key: "cancel_leave",
                  icon: <CloseCircleOutlined />,
                  type: "text",
                  danger: true, // Tự động lên màu đỏ
                  onClick: () => openCancelModal(record),
                },
              ]}
            />
          )
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Title level={3} className="mb-1! text-slate-800!">
            Ngày nghỉ & Vắng mặt
          </Title>
          <Text className="text-slate-500!">
            Quản lý và thông báo các ngày nghỉ đột xuất.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateDrawerVisible(true)}
          className="bg-indigo-600! hover:bg-indigo-700! border-none! font-semibold!  h-10! shadow-sm! shadow-indigo-600/20!"
        >
          Đăng ký nghỉ
        </Button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
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
          dataSource={leaves}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            className: "px-8! py-4!",
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, current: page, pageSize }),
          }}
          scroll={{ x: 700 }}
        />
      </div>

      <CreateLeaveDrawer
        visible={createDrawerVisible}
        onClose={() => setCreateDrawerVisible(false)}
        onSuccess={() => fetchLeaves(1)} // Load lại danh sách sau khi đăng ký
      />

      <CancelLeaveModal
        visible={cancelModalVisible}
        leave={selectedLeave}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalVisible(false)}
        confirmLoading={isCancelling} // Gắn loading cho nút xác nhận
      />
    </div>
  );
};

export default LeavePage;
