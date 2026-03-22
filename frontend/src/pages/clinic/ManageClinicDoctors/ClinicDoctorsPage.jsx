import { Typography, message } from "antd";
import { useEffect, useState } from "react";
import ActionModal from "./ActionModal";
import ClinicDoctorDetailDrawer from "./ClinicDoctorDetailDrawer";
import DoctorFilterBar from "./DoctorFilterBar";
import DoctorTable from "./DoctorTable";
import { clinicDoctorApi } from "./clinicDoctorApi";

const { Title } = Typography;

const statusMap = {
  pending: { color: "processing", text: "Chờ xác nhận" },
  active: { color: "success", text: "Hoạt động" },
  rejected: { color: "error", text: "Từ chối" },
  inactive: { color: "default", text: "Ngưng hoạt động" },
  pending_admin_approval: { color: "warning", text: "Chờ admin duyệt" },
};

const filterConfig = [
  {
    name: "status",
    label: "Trạng thái",
    type: "select",
    options: [
      { label: "Chờ xác nhận", value: "pending" },
      { label: "Chờ admin duyệt", value: "pending_admin_approval" },
      { label: "Hoạt động", value: "active" },
      { label: "Từ chối", value: "rejected" },
      { label: "Ngưng hoạt động", value: "inactive" },
    ],
  },
  {
    name: "specialty",
    label: "Chuyên khoa",
    type: "select",
    options: [], // Sẽ load từ API nếu cần, hoặc có thể để trống
  },
];

const ClinicDoctorsPage = () => {
  // --- STATES ---
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({ status: null, specialty: null });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null); // lưu dữ liệu chi tiết
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    doctor: null,
    type: null,
    reason: "",
  });

  // --- FETCH DOCTORS ---
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        status: filters.status || undefined,
        specialty: filters.specialty || undefined,
      };
      const res = await clinicDoctorApi.getClinicDoctors(params);
      // Giả sử backend trả về { doctors, total, page, limit }
      setDoctors(res.doctors || []);
      setPagination((prev) => ({
        ...prev,
        total: res.total || 0,
        current: res.page || prev.current,
        pageSize: res.limit || prev.pageSize,
      }));
    } catch (error) {
      message.error("Không thể tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  // Khi filter, search, page thay đổi, fetch lại
  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.current,
    pagination.pageSize,
    searchText,
    filters.status,
    filters.specialty,
  ]);

  // --- HANDLERS ---
  const openDetail = async (record) => {
    setSelectedDoctorId(record._id);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await clinicDoctorApi.getClinicDoctorDetail(record._id);
      setSelectedDoctor(detail);
    } catch (error) {
      message.error("Không thể tải thông tin chi tiết bác sĩ");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const triggerConfirm = (doctor) =>
    setConfirmModal({ visible: true, doctor, type: "confirm", reason: "" });
  const triggerReject = (doctor) =>
    setConfirmModal({ visible: true, doctor, type: "reject", reason: "" });

  const handleModalOk = async () => {
    const { doctor, type, reason } = confirmModal;
    if (!doctor) return;

    try {
      if (type === "confirm") {
        await clinicDoctorApi.confirmDoctor(doctor._id);
        message.success(
          `Đã xác nhận bác sĩ ${doctor.user.fullName}. Chờ Admin duyệt.`,
        );
      } else {
        await clinicDoctorApi.rejectDoctor(doctor._id, reason);
        message.success(`Đã từ chối bác sĩ ${doctor.user.fullName}.`);
      }
      // Refresh danh sách
      fetchDoctors();
    } catch (error) {
      message.error(error?.message || "Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setConfirmModal({ visible: false, doctor: null, type: null, reason: "" });
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Title level={2} className="m-0! text-gray-800!">
          Quản lý Y Bác sĩ
        </Title>
        <p className="text-gray-500 mt-1">
          Quét duyệt và quản lý hồ sơ đội ngũ chuyên gia y tế của cơ sở.
        </p>
      </div>

      {/* Filter Bar */}
      <DoctorFilterBar
        searchText={searchText}
        setSearchText={setSearchText}
        filters={filters}
        setFilters={setFilters}
        filterConfig={filterConfig}
      />

      {/* Main Table */}
      <DoctorTable
        doctors={doctors}
        loading={loading}
        pagination={pagination}
        setPagination={setPagination}
        onRowClick={openDetail}
        onConfirm={triggerConfirm}
        onReject={triggerReject}
        statusMap={statusMap}
      />

      {/* Detail Drawer */}
      <ClinicDoctorDetailDrawer
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedDoctor(null);
          setSelectedDoctorId(null);
        }}
        doctor={selectedDoctor}
        loading={detailLoading}
        onConfirm={triggerConfirm}
        onReject={triggerReject}
        statusMap={statusMap}
      />

      {/* Confirm/Reject Modal */}
      <ActionModal
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        onOk={handleModalOk}
        onCancel={() =>
          setConfirmModal({
            visible: false,
            doctor: null,
            type: null,
            reason: "",
          })
        }
      />
    </div>
  );
};

export default ClinicDoctorsPage;
