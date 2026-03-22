import { ActionButtons, Search, Table } from "@/components/common";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { message, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import ApplicationActionModal from "./ApplicationActionModal";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";
import { doctorApplicationService } from "./doctorApplicationService"; // Import service của bạn

const { Title, Text } = Typography;

const ManagePendingDoctors = () => {
  // States quản lý bảng
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // States UI (Drawer & Modal)
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailDoctor, setDetailDoctor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalState, setModalState] = useState({
    visible: false,
    type: null,
    profileId: null,
    doctorName: "",
    isSubmitting: false,
  });

  // Fetch Data
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        status: "pending",
        search: searchText,
      };
      const response = await doctorApplicationService.getApplications(params);
      setData(response.applications || []);
      setPagination((prev) => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      message.error("Không thể tải danh sách hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handlers
  const handleTableChange = (pag) =>
    setPagination((prev) => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const data = await doctorApplicationService.getApplicationById(
        record._id,
      ); // Lấy data mới nhất
      setDetailDoctor(data);
    } catch (error) {
      message.error("Không thể lấy chi tiết hồ sơ.");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmAction = async (payload) => {
    setModalState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await doctorApplicationService.processApplication(modalState.profileId, {
        action: modalState.type,
        reason: payload?.reason,
      });
      setModalState((prev) => ({ ...prev, visible: false }));
      fetchApplications();
    } catch (error) {
      // Bỏ qua error toast vì axiosClient đã xử lý
    } finally {
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Cấu hình Cột
  const columns = [
    {
      title: "Hồ sơ ứng viên",
      key: "candidate",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
            <UserOutlined />
          </div>
          <div>
            <div className="font-semibold text-slate-800">
              {record.user?.fullName || "—"}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {record.user?.email || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: ["user", "phone"],
      responsive: ["md"],
      render: (phone) => (
        <span className="text-slate-600 font-medium">{phone || "—"}</span>
      ),
    },
    {
      title: "Nơi công tác & Chuyên khoa",
      key: "workplaceAndSpecialty",
      render: (_, record) => {
        // Logic lấy tên Cơ sở y tế thông minh
        let clinicName = "Chưa cập nhật nơi công tác";
        if (record.clinicId?.clinicName) {
          clinicName = record.clinicId.clinicName;
        } else if (record.customClinicName) {
          clinicName = record.customClinicName;
        }

        // Lấy tên chuyên khoa
        const specialtyName = record.specialty?.name || "Không rõ chuyên khoa";

        return (
          <div className="flex flex-col items-start gap-1.5">
            <div
              className="text-sm font-semibold text-slate-700 flex items-start gap-1.5"
              title={clinicName} // Hover để xem full text nếu bị cắt
            >
              <EnvironmentOutlined className="text-slate-400 mt-0.5" />
              <span className="line-clamp-2">{clinicName}</span>
            </div>
            <Tag
              color="blue"
              className="border-none! rounded-md! px-2! font-medium! m-0!"
            >
              {specialtyName}
            </Tag>
          </div>
        );
      },
    },
    {
      title: "Kinh nghiệm",
      dataIndex: "experience",
      render: (exp) => (
        <span className="text-slate-600 font-medium">{exp || 0} năm</span>
      ),
    },
    {
      title: "Ngày nộp",
      dataIndex: "createdAt",
      render: (date) => (
        <span className="text-slate-500">
          {dayjs(date).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <ActionButtons
          items={[
            {
              key: "view",
              icon: <EyeOutlined />,
              onClick: () => handleViewDetail(record),
            },
            {
              key: "approve",
              icon: <CheckCircleOutlined className="text-emerald-600" />,
              onClick: () =>
                setModalState({
                  visible: true,
                  type: "approve",
                  profileId: record._id,
                  doctorName: record.user?.fullName,
                  isSubmitting: false,
                }),
              className: "bg-emerald-50 hover:bg-emerald-100", // Custom style cho ActionButtons (nếu Common support class)
            },
            {
              key: "reject",
              icon: <CloseCircleOutlined />,
              danger: true,
              onClick: () =>
                setModalState({
                  visible: true,
                  type: "reject",
                  profileId: record._id,
                  doctorName: record.user?.fullName,
                  isSubmitting: false,
                }),
            },
          ]}
          size="middle"
        />
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Tiêu đề trang */}
      <div className="mb-6">
        <Title level={3} className="mb-1! text-slate-800!">
          Duyệt hồ sơ Bác sĩ
        </Title>
        <Text className="text-slate-500">
          Xem xét và đánh giá các hồ sơ đăng ký hợp tác từ đội ngũ y bác sĩ.
        </Text>
      </div>

      {/* Toolbar Trắng bọc ngoài */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 flex justify-between items-center">
        <div className="w-full md:w-96">
          {/* Component Search dùng chung */}
          <Search
            onSearch={handleSearch}
            placeholder="Tìm kiếm ứng viên theo tên, email..."
            className="w-full rounded-xl hover:border-blue-400 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Vùng chứa Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            className: "px-6 py-4",
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </div>

      <ApplicationDetailDrawer
        visible={detailVisible}
        application={detailDoctor}
        loading={detailLoading}
        onClose={() => setDetailVisible(false)}
      />

      <ApplicationActionModal
        visible={modalState.visible}
        type={modalState.type}
        applicationName={modalState.doctorName}
        isSubmitting={modalState.isSubmitting}
        onConfirm={handleConfirmAction}
        onCancel={() => setModalState((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default ManagePendingDoctors;
