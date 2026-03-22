import { Drawer, EmptyState, Loading } from "@/components/common";
import {
  BankOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FilePdfOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Divider, Tabs, Tag } from "antd";
import dayjs from "dayjs";

// Component con hiển thị Grid Info
const InfoItem = ({ icon, label, value, valueColor = "text-slate-800" }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100">
      {icon}
    </div>
    <div className="flex-1 pt-0.5">
      <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${valueColor} leading-snug wrap-break-word`}
      >
        {value || "—"}
      </div>
    </div>
  </div>
);

const ApplicationDetailDrawer = ({
  visible,
  application,
  loading,
  onClose,
}) => {
  // Hàm xử lý hiển thị tên Cơ sở y tế thông minh
  const renderClinicInfo = () => {
    if (application?.clinicId) {
      return `${application.clinicId.clinicName} (${application.clinicId.address})`;
    }
    if (application?.customClinicName) {
      return application.customClinicName;
    }
    return "Chưa cập nhật nơi công tác";
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <span className="font-bold text-slate-800 text-lg">
          Chi tiết hồ sơ ứng viên
        </span>
      }
      width={650}
      footer={null}
      styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }}
    >
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loading spinning tip="Đang truy xuất hồ sơ..." />
        </div>
      ) : application ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Header Profile */}
          <div className="bg-white px-6 py-8 border-b border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              size={80}
              icon={<UserOutlined className="text-3xl!" />}
              className="border-4! border-white! shadow-sm! bg-blue-50! text-blue-500! shrink-0!"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
                {application.user?.fullName}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 font-medium mb-3">
                <MailOutlined /> {application.user?.email}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Tag
                  color="warning"
                  className="rounded-md! border-none! px-3! py-1! text-xs! font-bold! uppercase! tracking-wide! m-0!"
                >
                  Chờ xét duyệt
                </Tag>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto">
                  <ClockCircleOutlined /> Gửi lúc:{" "}
                  {dayjs(application.createdAt).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
            </div>
          </div>

          {/* Nội dung Tabs */}
          <div className="flex-1 p-6 pt-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <Tabs
                defaultActiveKey="1"
                size="large"
                className="px-6! pt-2! custom-tabs!"
              >
                {/* TAB 1: THÔNG TIN CHUNG */}
                <Tabs.TabPane tab="Thông tin chuyên môn" key="1">
                  <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                    <InfoItem
                      icon={<PhoneOutlined />}
                      label="Số điện thoại"
                      value={application.user?.phone}
                    />
                    <InfoItem
                      icon={<IdcardOutlined />}
                      label="Chuyên khoa"
                      // Đã lấy được dữ liệu sau khi fix backend
                      value={application.specialty?.name || "Không có dữ liệu"}
                      valueColor="text-blue-600"
                    />

                    <InfoItem
                      icon={<EnvironmentOutlined />}
                      label="Cơ sở y tế / Nơi công tác"
                      value={renderClinicInfo()}
                    />

                    <InfoItem
                      icon={<ClockCircleOutlined />}
                      label="Kinh nghiệm"
                      value={`${application.experience || 0} năm`}
                    />
                    <InfoItem
                      icon={<SafetyCertificateOutlined />}
                      label="Số giấy phép (GPHN)"
                      value={application.licenseNumber}
                    />
                    <InfoItem
                      icon={<DollarOutlined />}
                      label="Phí tư vấn"
                      value={
                        application.consultationFee
                          ? `${application.consultationFee.toLocaleString()} VNĐ`
                          : "Miễn phí / Tự thỏa thuận"
                      }
                    />
                  </div>

                  {application.bio && (
                    <div className="mb-4">
                      <Divider className="my-4! border-slate-100!" />
                      <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
                        Giới thiệu bản thân
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                        {application.bio}
                      </div>
                    </div>
                  )}
                </Tabs.TabPane>

                {/* TAB 2: BẰNG CẤP */}
                <Tabs.TabPane tab="Trình độ & Bằng cấp" key="2">
                  <div className="py-6">
                    {application.qualifications?.length > 0 ? (
                      <div className="space-y-3">
                        {application.qualifications.map((q, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl gap-2"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm shrink-0 mt-0.5">
                                <BankOutlined />
                              </div>
                              <div>
                                <div className="text-slate-800 font-bold text-sm mb-0.5">
                                  {q.degree}
                                </div>
                                <div className="text-slate-500 text-sm font-medium">
                                  {q.institution}
                                </div>
                              </div>
                            </div>
                            <div className="text-blue-600 font-bold bg-blue-100/50 px-3 py-1 rounded-lg text-sm w-max">
                              Năm {q.year}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState description="Không có dữ liệu bằng cấp" />
                    )}
                  </div>
                </Tabs.TabPane>

                {/* TAB 3: TÀI LIỆU ĐÍNH KÈM */}
                <Tabs.TabPane tab="Giấy tờ đính kèm" key="3">
                  <div className="py-6">
                    {application.documents?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {application.documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-lg shrink-0 group-hover:bg-red-100">
                              <FilePdfOutlined />
                            </div>
                            <div className="flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-blue-700">
                              {doc.name || `Tài liệu đính kèm ${idx + 1}`}
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <EmptyState description="Không có tài liệu đính kèm" />
                    )}
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState description="Không có dữ liệu hồ sơ" />
      )}
    </Drawer>
  );
};

export default ApplicationDetailDrawer;
