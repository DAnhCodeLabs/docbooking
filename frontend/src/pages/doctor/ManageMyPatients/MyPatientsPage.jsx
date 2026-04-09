import { Filter, Search, Table } from "@/components/common";
import { EyeOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Typography, message, Space, Tag } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { doctorApi } from "../doctorApi";
import PatientDetailDrawer from "./PatientDetailDrawer";

const { Title, Text } = Typography;

const MyPatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    dateRange: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        ...(filters.dateRange?.[0] && {
          dateFrom: filters.dateRange[0].format("YYYY-MM-DD"),
        }),
        ...(filters.dateRange?.[1] && {
          dateTo: filters.dateRange[1].format("YYYY-MM-DD"),
        }),
      };
      const res = await doctorApi.getMyPatients(params);
      setPatients(res.patients || []);
      setPagination((prev) => ({
        ...prev,
        total: res.total || 0,
        totalPages: res.totalPages || 0,
      }));
    } catch (error) {
      message.error(error?.message || "Không thể tải danh sách bệnh nhân.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [pagination.current, pagination.pageSize, searchText, filters]);

  const handleViewDetail = (record) => {
    setSelectedPatient(record);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Họ tên bệnh nhân",
      dataIndex: "fullName",
      key: "fullName",
      render: (name) => (
        <Space>
          <UserOutlined className="text-gray-400!" />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (phone) => <Text copyable>{phone}</Text>,
    },
    {
      title: "CCCD",
      dataIndex: "cccd",
      key: "cccd",
      responsive: ["md"],
    },
    {
      title: "Số lần khám",
      dataIndex: "totalAppointments",
      key: "totalAppointments",
      render: (count) => (
        <Tag color="blue" className="rounded-full! px-3!">
          {count} lần
        </Tag>
      ),
    },
    {
      title: "Lần khám gần nhất",
      dataIndex: "lastAppointmentDate",
      key: "lastAppointmentDate",
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "---"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
          className="text-blue-600! hover:text-blue-800! p-0!"
        >
          Xem
        </Button>
      ),
    },
  ];

  const filterConfig = [
    {
      name: "dateRange",
      label: "Khoảng ngày khám",
      type: "date-range",
    },
  ];

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleFilterClear = () => {
    setFilters({ dateRange: null });
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  return (
    <div className="p-4! md:p-6!">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6!">
        <Title level={2} className="m-0! text-gray-800! text-xl! md:text-2xl!">
          Danh sách bệnh nhân đã khám
        </Title>
        <Tag color="green" className="rounded-full! px-3!">
          Tổng số: {pagination.total} bệnh nhân
        </Tag>
      </div>

      <Card
        className="mb-6! rounded-xl! shadow-sm! border-0!"
        styles={{ body: { padding: "16px" } }}
      >
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <Search
            value={searchText}
            onSearch={handleSearch}
            placeholder="Tìm kiếm theo tên, SĐT, CCCD..."
            className="flex-1!"
          />
          <Filter
            filters={filterConfig}
            values={filters}
            onChange={handleFilterChange}
            onClear={handleFilterClear}
          />
        </div>
      </Card>

      <Card
        className="rounded-xl! shadow-sm! border-0! overflow-hidden!"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={patients}
          rowKey="appointmentId"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} trong ${total} bệnh nhân`,
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, current: page, pageSize }),
            className: "px-4! pb-2!",
          }}
          bordered={false}
          className="border-0!"
        />
      </Card>

      <PatientDetailDrawer
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default MyPatientsPage;
