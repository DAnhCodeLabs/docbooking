import { useAuthStore } from "@/stores/authStore";
import { Typography, message } from "antd";
import { useEffect, useState } from "react";
import { appointmentApi } from "./appointmentApi";

// Các Component con đã tách
import AppointmentDetailDrawer from "./AppointmentDetailDrawer";
import AppointmentsFilterBar from "./AppointmentsFilterBar";
import AppointmentsTable from "./AppointmentsTable";
import CancelAppointmentModal from "./CancelAppointmentModal";
import CompleteAppointmentModal from "./CompleteAppointmentModal";

const { Title, Text } = Typography;

const statusMap = {
  confirmed: { color: "processing", text: "Chờ check-in" },
  checked_in: { color: "warning", text: "Đã check-in" },
  completed: { color: "success", text: "Hoàn thành" },
  cancelled: { color: "error", text: "Đã hủy" },
};

const AppointmentsPage = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const currentUserId = user?.id || user?._id;

  // --- STATES ---
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    status: null,
    dateRange: null,
    doctorId: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Lưu ý: Nếu có danh sách bác sĩ từ API cho Admin, bạn cần fetch vào state `doctorsList`.
  // Trong ví dụ này giả lập một mảng rỗng để không lỗi code cũ của bạn.
  const [doctorsList] = useState([]);

  const handleCompleteClick = (record) => {
    setAppointmentToComplete(record);
    setCompleteModalVisible(true);
  };

  const handleCompleteConfirm = async (values) => {
    if (!appointmentToComplete) return;
    setCompleteLoading(true);
    try {
      await appointmentApi.completeAppointment(
        appointmentToComplete._id,
        values,
      );
      setCompleteModalVisible(false);
      setAppointmentToComplete(null);
      // Refresh danh sách
      fetchAppointments();
      // Nếu đang xem chi tiết, có thể đóng drawer
      if (
        detailVisible &&
        selectedAppointment?._id === appointmentToComplete._id
      ) {
        setDetailVisible(false);
        setSelectedAppointment(null);
      }
    } catch (error) {
      console.error("Lỗi kết thúc khám:", error);
      message.error(error?.message || "Kết thúc khám thất bại");
    } finally {
      setCompleteLoading(false);
    }
  };

  // --- CONFIG ---
  const filterConfig = [
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Chờ Check-in", value: "confirmed" },
        { label: "Đã check-in", value: "checked_in" },
        { label: "Hoàn thành", value: "completed" },
        { label: "Đã hủy", value: "cancelled" },
      ],
    },
    { name: "dateRange", label: "Khoảng ngày", type: "date-range" },
    ...(userRole === "admin"
      ? [
          {
            name: "doctorId",
            label: "Bác sĩ",
            type: "select",
            options: doctorsList.map((doc) => ({
              label: doc.fullName,
              value: doc._id,
            })),
          },
        ]
      : []),
  ];

  // --- API CALLS ---
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...(filters.status && { status: filters.status }),
        ...(filters.dateRange?.[0] && {
          dateFrom: filters.dateRange[0].format("YYYY-MM-DD"),
        }),
        ...(filters.dateRange?.[1] && {
          dateTo: filters.dateRange[1].format("YYYY-MM-DD"),
        }),
        ...(searchText && { search: searchText }),
        ...(userRole === "admin" &&
          filters.doctorId && { doctorId: filters.doctorId }),
      };
      const res = await appointmentApi.getAppointments(params);
      setAppointments(res.appointments || []);
      setPagination((prev) => ({
        ...prev,
        total: res.total || 0,
        current: res.page || prev.current,
        pageSize: res.limit || prev.pageSize,
      }));
    } catch (error) {
      console.error("Lỗi lấy danh sách lịch hẹn:", error);
      message.error("Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [searchText, filters, pagination.current, pagination.pageSize]);

  // --- HANDLERS ---
  const handleViewDetail = async (record) => {
    setLoading(true);
    try {
      const detail = await appointmentApi.getAppointmentById(record._id);
      setSelectedAppointment(detail);
      setDetailVisible(true);
    } catch (error) {
      message.error("Lỗi tải chi tiết hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (record) => {
    setAppointmentToCancel(record);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async (reason) => {
    if (!appointmentToCancel) return;
    setCancelLoading(true);
    try {
      await appointmentApi.cancelAppointment(appointmentToCancel._id, reason);
      await fetchAppointments();
      setCancelModalVisible(false);
      setAppointmentToCancel(null);
      if (
        detailVisible &&
        selectedAppointment?._id === appointmentToCancel._id
      ) {
        setDetailVisible(false);
        setSelectedAppointment(null);
      }
    } catch (error) {
      message.error("Lỗi khi hủy lịch hẹn.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className=" bg-gray-50 min-h-screen">
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Title level={3} className="m-0! text-gray-800! font-bold!">
            Quản lý Lịch hẹn
          </Title>
          <Text className="text-gray-500! mt-1! block!">
            Theo dõi, quản lý và điều phối hồ sơ khám bệnh.
          </Text>
        </div>

        {/* Filter Area */}
        <AppointmentsFilterBar
          searchText={searchText}
          onSearch={(v) => {
            setSearchText(v);
            setPagination((p) => ({ ...p, current: 1 }));
          }}
          filterConfig={filterConfig}
          filters={filters}
          onFilterChange={(f) => {
            setFilters(f);
            setPagination((p) => ({ ...p, current: 1 }));
          }}
          onFilterClear={() => {
            setFilters({ status: null, dateRange: null, doctorId: null });
            setPagination((p) => ({ ...p, current: 1 }));
          }}
        />

        {/* Table Area */}
        <AppointmentsTable
          appointments={appointments}
          loading={loading}
          pagination={pagination}
          setPagination={setPagination}
          statusMap={statusMap}
          onOpenDetail={handleViewDetail}
          onOpenCancel={openCancelModal}
          onOpenComplete={handleCompleteClick}
          userRole={userRole}
          currentUserId={currentUserId}
        />

        {/* Modals & Drawers */}
        <AppointmentDetailDrawer
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          appointment={selectedAppointment}
        />

        <CancelAppointmentModal
          visible={cancelModalVisible}
          onCancel={() => setCancelModalVisible(false)}
          onConfirm={handleCancelConfirm}
          loading={cancelLoading}
        />
        <CompleteAppointmentModal
          visible={completeModalVisible}
          onCancel={() => setCompleteModalVisible(false)}
          onConfirm={handleCompleteConfirm}
          loading={completeLoading}
        />
      </div>
    </div>
  );
};

export default AppointmentsPage;
