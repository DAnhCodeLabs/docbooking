import { formatDateUTC } from "@/utils/date";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  EyeOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Grid,
  Pagination,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrAfter);
const { Text } = Typography;
const { useBreakpoint } = Grid;

const AppointmentTablePatient = ({
  appointments,
  loading,
  pagination,
  setPagination,
  statusMap,
  onViewDetail,
  onCancelClick,
  onReviewClick,
  isPast,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const today = dayjs().startOf("day");

  const canCancel = (record) => {
    const appointmentDate =
      record.scheduleInfo?.date || record.slot?.scheduleId?.date;
    return (
      record.status === "confirmed" &&
      appointmentDate &&
      dayjs(appointmentDate).isSameOrAfter(today, "day")
    );
  };

  const PaymentTags = ({ method, status }) => (
    <Space size="small" className="flex! flex-wrap! gap-2!">
      <Tag
        color={method === "online" ? "blue" : "default"}
        className="m-0! rounded-md! px-2.5! py-0.5! text-xs! border-0! flex! items-center! gap-1.5! font-medium!"
      >
        {method === "online" ? (
          <CreditCardOutlined className="text-[11px]!" />
        ) : (
          <WalletOutlined className="text-[11px]!" />
        )}
        {method === "online" ? "Trực tuyến" : "Tại quầy"}
      </Tag>
      <Tag
        className={`m-0! rounded-md! px-2.5! py-0.5! text-xs! border-0! font-semibold! ${
          status === "paid"
            ? "bg-emerald-50! text-emerald-600!"
            : status === "failed"
              ? "bg-rose-50! text-rose-600!"
              : "bg-amber-50! text-amber-600!"
        }`}
      >
        {status === "paid"
          ? "Đã thanh toán"
          : status === "failed"
            ? "Thất bại"
            : "Chưa T.Toán"}
      </Tag>
    </Space>
  );

  const columns = [
    {
      title: "Mã/STT",
      key: "index",
      width: 80,
      align: "center",
      render: (_, __, index) => (
        <span className="text-slate-400 text-sm font-mono font-medium">
          #{(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "Bệnh nhân",
      key: "patient",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TeamOutlined className="text-lg" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 leading-tight">
              {record.patientProfile?.fullName || "Chưa cập nhật"}
            </span>
            <span className="text-xs text-slate-500 mt-0.5">Hồ sơ cá nhân</span>
          </div>
        </div>
      ),
    },
    {
      title: "Bác sĩ phụ trách",
      key: "doctor",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size="large"
            className="bg-blue-50! text-blue-600! border! border-blue-100! shrink-0!"
            icon={<UserOutlined />}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 leading-tight">
              {record.doctor?.fullName || "Chưa cập nhật"}
            </span>
            <span className="text-xs text-blue-600 font-medium mt-0.5">
              {record.doctor?.specialty?.name || "Chuyên khoa chung"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Thời gian khám",
      key: "datetime",
      width: 200,
      render: (_, record) => {
        const date = record.scheduleInfo?.date || record.slot?.scheduleId?.date;
        const startTime = record.slot?.startTime;
        const endTime = record.slot?.endTime;
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center text-slate-800 font-semibold text-sm">
              <CalendarOutlined className="mr-2 text-slate-400" />
              {date ? formatDateUTC(date) : "---"}
            </div>
            {startTime && endTime && (
              <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 w-fit px-2 py-0.5 rounded-md">
                <ClockCircleOutlined className="mr-1.5" />
                {startTime} - {endTime}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => {
        const style = statusMap[status] || {};
        return (
          <Tag
            className={`m-0! rounded-md! px-3! py-1.5! font-semibold! border-0! ${style.bg}! ${style.textCol}!`}
          >
            {style.text || status}
          </Tag>
        );
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 170,
      render: (_, record) => (
        <PaymentTags
          method={record.paymentMethod}
          status={record.paymentStatus}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space size="middle" direction="vertical" className="w-full!">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
            className="bg-blue-600! hover:bg-blue-700! rounded-md! text-xs! shadow-none! w-full! h-8! font-medium!"
          >
            Chi tiết
          </Button>

          {canCancel(record) && !isPast && (
            <Button
              type="text"
              danger
              size="small"
              onClick={() => onCancelClick(record)}
              className="text-xs! w-full! font-medium! hover:bg-rose-50!"
            >
              Hủy lịch
            </Button>
          )}

          {isPast &&
            record.status === "completed" &&
            (record.reviewed ? (
              <div className="text-xs text-slate-400 font-medium text-center bg-slate-50 py-1 rounded-md">
                Đã đánh giá
              </div>
            ) : (
              <Button
                type="default"
                size="small"
                onClick={() => onReviewClick(record)}
                className="text-xs! w-full! border-blue-200! text-blue-600! hover:border-blue-400! font-medium!"
              >
                Đánh giá
              </Button>
            ))}
        </Space>
      ),
    },
  ];

  const MobileCardList = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 6 }} className="p-4!" />;
    }
    if (!appointments.length) {
      return <Empty description="Chưa có lịch hẹn nào" className="py-16!" />;
    }
    return (
      <div className="flex flex-col gap-4 p-4">
        {appointments.map((item, idx) => {
          const appointmentDate =
            item.scheduleInfo?.date || item.slot?.scheduleId?.date;
          const style = statusMap[item.status] || {};

          return (
            <Card
              key={item._id}
              className="rounded-2xl! shadow-sm! border! border-slate-200! overflow-hidden!"
              bodyStyle={{ padding: 0 }}
            >
              {/* Header: Date & Status */}
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1">
                    Thời gian khám
                  </div>
                  <div className="font-bold text-slate-800 text-base flex items-center">
                    <CalendarOutlined className="mr-2 text-slate-400" />
                    {appointmentDate ? formatDateUTC(appointmentDate) : "---"}
                  </div>
                  {item.slot?.startTime && item.slot?.endTime && (
                    <div className="text-sm text-blue-600 font-semibold flex items-center mt-1.5">
                      <ClockCircleOutlined className="mr-1.5" />
                      {item.slot.startTime} - {item.slot.endTime}
                    </div>
                  )}
                </div>
                <Tag
                  className={`m-0! rounded-full! px-3! py-1! text-xs! border-0! font-bold! ${style.bg}! ${style.textCol}!`}
                >
                  {style.text || item.status}
                </Tag>
              </div>

              {/* Body: Patient & Doctor */}
              <div className="p-4 flex flex-col gap-4 relative">
                {/* Connecting line */}
                <div className="absolute left-[31px] top-[40px] bottom-[40px] w-0.5 bg-slate-100"></div>

                {/* Patient */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <UserOutlined />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                      Bệnh nhân
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.patientProfile?.fullName || "Chưa cập nhật"}
                    </div>
                  </div>
                </div>

                {/* Doctor */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    <TeamOutlined />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                      Bác sĩ phụ trách
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {item.doctor?.fullName || "Chưa cập nhật"}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      {item.doctor?.specialty?.name || "Chuyên khoa"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Payment & Actions */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">
                    Thanh toán:
                  </span>
                  <PaymentTags
                    method={item.paymentMethod}
                    status={item.paymentStatus}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-50">
                  {canCancel(item) && !isPast && (
                    <Button
                      danger
                      type="text"
                      onClick={() => onCancelClick(item)}
                      className="rounded-lg! font-medium! bg-rose-50! hover:bg-rose-100! flex-1!"
                    >
                      Hủy
                    </Button>
                  )}
                  {isPast &&
                    item.status === "completed" &&
                    (item.reviewed ? (
                      <div className="flex-1 text-center py-1.5 bg-slate-50 text-slate-400 text-sm font-medium rounded-lg">
                        Đã đánh giá
                      </div>
                    ) : (
                      <Button
                        onClick={() => onReviewClick(item)}
                        className="rounded-lg! font-medium! border-blue-200! text-blue-600! flex-1!"
                      >
                        Đánh giá
                      </Button>
                    ))}
                  <Button
                    type="primary"
                    onClick={() => onViewDetail(item)}
                    className="rounded-lg! font-medium! bg-blue-600! hover:bg-blue-700! shadow-none! flex-1!"
                  >
                    Xem hồ sơ
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex-1 overflow-x-auto">
        {isMobile ? (
          <MobileCardList />
        ) : (
          <Table
            columns={columns}
            dataSource={appointments}
            rowKey="_id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1000 }}
            className="[&_.ant-table]:border-0! [&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-500! [&_.ant-table-thead_th]:font-semibold! [&_.ant-table-thead_th]:text-sm! [&_.ant-table-thead_th]:py-4! [&_.ant-table-tbody_td]:py-4!"
          />
        )}
      </div>

      <div className="px-6 py-4 flex justify-end border-t border-slate-100 bg-white mt-2">
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={(page, pageSize) =>
            setPagination({ ...pagination, current: page, pageSize })
          }
          showSizeChanger
          className="m-0!"
        />
      </div>
    </div>
  );
};

export default AppointmentTablePatient;
