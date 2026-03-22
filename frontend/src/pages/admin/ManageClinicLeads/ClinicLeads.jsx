import { ActionButtons, Filter, Search, Table } from "@/components/common";
import {
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  LockOutlined,
  PhoneOutlined,
  UnlockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Modal, Tag, Typography } from "antd"; // Thêm Modal, Input
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import LeadActionModal from "./LeadActionModal";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { adminClinicLeadService } from "./adminClinicLeadService";

const { Title, Text } = Typography;
const { confirm } = Modal;

// Cập nhật statusMap
const statusMap = {
  pending: { color: "processing", text: "Chờ xử lý" },
  contacted: { color: "success", text: "Đã liên hệ" },
  resolved: { color: "green", text: "Hoạt động" },
  rejected: { color: "error", text: "Từ chối" },
  locked: { color: "warning", text: "Đã khóa" },
  deleted: { color: "default", text: "Đã xóa" },
};

const clinicTypeMap = {
  hospital: "Bệnh viện",
  polyclinic: "Phòng khám đa khoa",
  specialist_clinic: "Phòng khám chuyên khoa",
  other: "Khác",
};

const ClinicLeads = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({});

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [modalState, setModalState] = useState({
    visible: false,
    type: null, // 'approve', 'reject', 'lock', 'delete'
    lead: null,
    reason: "",
  });

  // Fetch data
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
        ...filters,
      };
      const res = await adminClinicLeadService.getClinicLeads(params);
      setData(res.leads || []);
      setPagination((prev) => ({ ...prev, total: res.total || 0 }));
    } catch (error) {
      // ignored
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handlers tìm kiếm, lọc
  const handleSearch = (val) => {
    setSearchText(val);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // Xử lý duyệt/từ chối (đã có)
  const handleConfirm = async () => {
    const { type, lead, reason } = modalState;
    if (!lead) return;

    try {
      if (type === "approve") {
        await adminClinicLeadService.updateStatus(lead._id, {
          status: "resolved",
        });
      } else if (type === "reject") {
        await adminClinicLeadService.updateStatus(lead._id, {
          status: "rejected",
          reason,
        });
      } else if (type === "lock") {
        await adminClinicLeadService.lockClinic(lead._id, reason);
      } else if (type === "delete") {
        await adminClinicLeadService.softDeleteClinic(lead._id, reason);
      }

      setModalState({ visible: false, type: null, lead: null, reason: "" });
      fetchLeads();
    } catch (error) {
      // Lỗi đã được xử lý ở interceptor
    }
  };

  // Hàm mở khóa (không cần modal nhập lý do, chỉ confirm)
  const handleUnlock = (lead) => {
    confirm({
      title: "Xác nhận mở khóa phòng khám",
      content: `Bạn có chắc muốn mở khóa phòng khám "${lead.clinicName}"?`,
      okText: "Mở khóa",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await adminClinicLeadService.unlockClinic(lead._id);
          fetchLeads();
        } catch (error) {}
      },
    });
  };

  // Mở modal cho các hành động cần nhập lý do
  const showActionModal = (type, lead) => {
    setModalState({ visible: true, type, lead, reason: "" });
  };

  // Cấu hình cột
  const columns = [
    // ... giữ nguyên các cột cũ ...
    {
      title: "Thông tin Phòng khám",
      key: "clinicInfo",
      render: (_, record) => (
        <div className="flex items-center gap-4">
          <Avatar
            src={record.image}
            shape="square"
            size={48}
            icon={!record.image && <BankOutlined className="text-lg!" />}
            className="bg-blue-50! text-blue-500! border! border-blue-100! "
          />
          <div>
            <div className="font-bold! text-slate-800! text-[15px]! mb-0.5!">
              {record.clinicName}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {clinicTypeMap[record.clinicType] || record.clinicType}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Liên hệ",
      key: "contact",
      responsive: ["md"],
      render: (_, record) => (
        <div>
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
            <UserOutlined className="text-slate-400!" />{" "}
            {record.representativeName}
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <PhoneOutlined className="text-slate-400!" /> {record.phone}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status) => (
        <Tag
          color={statusMap[status]?.color}
          className="border-none! rounded-md! px-2.5! py-0.5! font-medium!"
        >
          {statusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      render: (date) => (
        <span className="text-slate-600 font-medium">
          {dayjs(date).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      render: (_, record) => {
        const items = [
          {
            key: "view",
            icon: <EyeOutlined className="text-blue-600!" />,
            onClick: () => {
              setDetailLead(record);
              setDetailVisible(true);
            },
          },
        ];

        // Nút duyệt/từ chối chỉ khi pending
        if (record.status === "pending") {
          items.push(
            {
              key: "approve",
              icon: <CheckCircleOutlined className="text-emerald-600!" />,
              onClick: () => showActionModal("approve", record),
            },
            {
              key: "reject",
              icon: <CloseCircleOutlined className="text-red-600!" />,
              danger: true,
              onClick: () => showActionModal("reject", record),
            },
          );
        }

        // Nút khóa khi resolved
        if (record.status === "resolved") {
          items.push({
            key: "lock",
            icon: <LockOutlined className="text-orange-600!" />,
            onClick: () => showActionModal("lock", record),
          });
        }

        // Nút mở khóa khi locked
        if (record.status === "locked") {
          items.push({
            key: "unlock",
            icon: <UnlockOutlined className="text-emerald-600!" />,
            onClick: () => handleUnlock(record),
          });
        }

        // Nút xóa mềm (chỉ khi chưa bị xóa)
        if (record.status !== "deleted") {
          items.push({
            key: "delete",
            icon: <DeleteOutlined className="text-red-600!" />,
            danger: true,
            onClick: () => showActionModal("delete", record),
          });
        }

        return <ActionButtons items={items} size="middle" />;
      },
    },
  ];

  const filterConfig = [
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      options: [
        { label: "Chờ xử lý", value: "pending" },
        { label: "Đã liên hệ", value: "contacted" },
        { label: "Hoạt động", value: "resolved" },
        { label: "Từ chối", value: "rejected" },
        { label: "Đã khóa", value: "locked" },
        { label: "Đã xóa", value: "deleted" },
      ],
    },
    {
      name: "clinicType",
      label: "Loại hình",
      type: "select",
      options: [
        { label: "Bệnh viện", value: "hospital" },
        { label: "Phòng khám đa khoa", value: "polyclinic" },
        { label: "Phòng khám chuyên khoa", value: "specialist_clinic" },
        { label: "Khác", value: "other" },
      ],
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Title level={3} className="!mb-1 !text-slate-800">
          Quản lý Đối tác Phòng khám
        </Title>
        <Text className="text-slate-500!">
          Xử lý các yêu cầu đăng ký hợp tác từ các cơ sở y tế.
        </Text>
      </div>

      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
        <div className="w-full xl:w-96">
          <Search
            value={searchText}
            onSearch={handleSearch}
            placeholder="Tìm kiếm phòng khám, email, SĐT..."
            className="w-full! "
          />
        </div>
        <div className="w-full xl:w-auto">
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={() => handleFilterChange({})}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            className: "px-6! py-4!",
            onChange: (page, pageSize) => {
              setPagination((prev) => ({ ...prev, current: page, pageSize }));
            },
            onShowSizeChange: (current, size) => {
              setPagination((prev) => ({
                ...prev,
                current: 1,
                pageSize: size,
              }));
            },
          }}
          scroll={{ x: 800 }}
        />
      </div>

      <LeadDetailDrawer
        visible={detailVisible}
        lead={detailLead}
        clinicTypeMap={clinicTypeMap}
        statusMap={statusMap}
        onClose={() => setDetailVisible(false)}
      />

      {/* Modal dùng chung cho approve, reject, lock, delete */}
      <LeadActionModal
        visible={modalState.visible}
        type={modalState.type}
        lead={modalState.lead}
        reason={modalState.reason}
        onReasonChange={(e) =>
          setModalState((prev) => ({ ...prev, reason: e.target.value }))
        }
        onConfirm={handleConfirm}
        onCancel={() =>
          setModalState({ visible: false, type: null, lead: null, reason: "" })
        }
      />
    </div>
  );
};

export default ClinicLeads;
