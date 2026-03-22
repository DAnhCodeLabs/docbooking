import { Avatar, Tag, Divider, Typography } from "antd";
import {
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Drawer, EmptyState } from "@/components/common";
import dayjs from "dayjs";

const { Text } = Typography;

// Component hiển thị từng mục thông tin
const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100">
      {icon}
    </div>
    <div className="flex-1 pt-0.5">
      <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-800 leading-snug wrap-break-word">
        {value || "—"}
      </div>
    </div>
  </div>
);

const LeadDetailDrawer = ({
  visible,
  lead,
  clinicTypeMap,
  statusMap,
  onClose,
}) => {
  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <span className="font-bold! text-slate-800! text-lg!">
          Hồ sơ Đăng ký Phòng khám
        </span>
      }
      width={600}
      footer={null}
      styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }}
    >
      {lead ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Header Cover */}
          <div className="bg-linear-to-r from-blue-600 to-cyan-500 h-28 w-full"></div>

          {/* Avatar & Main Info */}
          <div className="px-6 pb-6 relative bg-white shadow-sm border-b border-slate-100">
            <div className="absolute -top-12">
              <Avatar
                src={lead.image}
                size={88}
                shape="square"
                icon={!lead.image && <BankOutlined className="text-3xl!" />}
                className="border-4! border-white! shadow-md! bg-blue-50! text-blue-500! rounded-2xl!"
              />
            </div>
            <div className="pt-14">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                {lead.clinicName}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Tag
                  color={statusMap[lead.status]?.color}
                  className="rounded-md! border-none! px-3! py-1! text-xs! font-bold! uppercase! tracking-wide! m-0!"
                >
                  {statusMap[lead.status]?.text}
                </Tag>
                <Tag
                  color="blue"
                  className="rounded-md! border-none! px-2! py-1! m-0!"
                >
                  {clinicTypeMap[lead.clinicType] || lead.clinicType}
                  {lead.clinicType === "other" &&
                    lead.otherClinicType &&
                    ` (${lead.otherClinicType})`}
                </Tag>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto mt-2 sm:mt-0">
                  <ClockCircleOutlined className="text-slate-400!" />
                  Gửi lúc: {dayjs(lead.createdAt).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <UserOutlined className="text-blue-500!" /> THÔNG TIN LIÊN HỆ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <InfoItem
                    icon={<UserOutlined className="text-slate-400!" />}
                    label="Người đại diện"
                    value={lead.representativeName}
                  />
                  <InfoItem
                    icon={<PhoneOutlined className="text-slate-400!" />}
                    label="Số điện thoại"
                    value={lead.phone}
                  />
                  <InfoItem
                    icon={<MailOutlined className="text-slate-400!" />}
                    label="Email"
                    value={lead.email}
                  />
                </div>
              </div>

              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
                  <EnvironmentOutlined className="text-blue-500!" /> ĐỊA CHỈ CƠ
                  SỞ
                </div>
                <Text className="text-sm! font-medium! text-slate-700! block!">
                  {lead.address}
                </Text>
              </div>

              <div className="p-5">
                <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <FileTextOutlined className="text-blue-500!" /> GHI CHÚ TỪ ĐỐI
                  TÁC
                </div>
                <div className="text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  {lead.notes || (
                    <span className="italic text-slate-400">
                      Không có ghi chú kèm theo.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState description="Không có dữ liệu chi tiết" />
      )}
    </Drawer>
  );
};

export default LeadDetailDrawer;
