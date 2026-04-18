import { Drawer, EmptyState, Loading } from "@/components/common";
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FilePdfOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  MailOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Avatar, Divider, Tabs, Tag } from "antd";
import dayjs from "dayjs";

// ================= MAP TỪ ĐIỂN DỮ LIỆU =================
const roleMap = {
  patient: { color: "blue", text: "Bệnh nhân" },
  doctor: { color: "cyan", text: "Bác sĩ" },
  admin: { color: "purple", text: "Quản trị viên" },
};

const statusMap = {
  active: { color: "success", text: "Hoạt động" },
  inactive: { color: "default", text: "Ngưng hoạt động" },
  banned: { color: "error", text: "Bị khóa" },
};

// ================= COMPONENT HIỂN THỊ ITEM KHỐI =================
const InfoItem = ({ icon, label, value, valueColor = "text-slate-800" }) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 border border-slate-100 mt-0.5">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[11px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${valueColor} leading-snug wrap-break-word`}
      >
        {value || "Chưa cập nhật"}
      </div>
    </div>
  </div>
);

// ================= MAIN COMPONENT =================
const UserDetailDrawer = ({ visible, user, loading, onClose }) => {
  // Hàm render nơi công tác của bác sĩ
  const renderClinicInfo = (docProfile) => {
    if (docProfile?.clinicId)
      return `${docProfile.clinicId.clinicName} - ${docProfile.clinicId.address}`;
    if (docProfile?.customClinicName) return docProfile.customClinicName;
    return "Chưa cập nhật nơi công tác";
  };

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <span className="font-bold! text-slate-800! text-lg!">
          Hồ sơ chi tiết
        </span>
      }
      width={700} // Mở rộng 700px để Grid nhìn thoáng chuẩn Desktop
      footer={null}
      styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }}
    >
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loading spinning tip="Đang truy xuất dữ liệu..." />
        </div>
      ) : user ? (
        <div className="flex flex-col h-full animate-fade-in pb-10">
          {/* ================= HEADER: THÔNG TIN TỔNG QUAN ================= */}
          <div className="bg-white px-6 sm:px-8 py-8 border-b border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative">
            <Avatar
              src={user.avatar}
              size={110}
              shape="square"
              icon={!user.avatar && <UserOutlined className="text-4xl!" />}
              className="border-2! border-slate-100! shadow-sm! bg-blue-50! text-blue-500! shrink-0! rounded-2xl! object-cover! object-top!"
            />

            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight m-0">
                  {user.role === "doctor"
                    ? `BS. ${user.fullName}`
                    : user.fullName}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <Tag
                    color={roleMap[user.role]?.color}
                    className="rounded-md! border-none! px-3! py-0.5! text-xs! font-bold! uppercase! tracking-wide! m-0!"
                  >
                    {roleMap[user.role]?.text}
                  </Tag>
                  <Tag
                    color={statusMap[user.status]?.color}
                    className="rounded-md! border-none! px-3! py-0.5! text-xs! font-bold! uppercase! tracking-wide! m-0!"
                  >
                    {statusMap[user.status]?.text}
                  </Tag>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 font-medium mb-1">
                <MailOutlined className="text-slate-400" /> {user.email}
                {user.emailVerified && (
                  <CheckCircleFilled
                    className="text-emerald-500 text-xs ml-1"
                    title="Đã xác minh Email"
                  />
                )}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 font-medium mb-4">
                <PhoneOutlined className="text-slate-400" />{" "}
                {user.phone || "Chưa cập nhật SĐT"}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-6 text-xs text-slate-400 font-medium border-t border-slate-100 pt-3 mt-2">
                <span className="flex items-center gap-1.5">
                  <CalendarOutlined /> Tham gia:{" "}
                  {dayjs(user.createdAt).format("DD/MM/YYYY")}
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockCircleOutlined /> Đăng nhập:{" "}
                  {user.lastLogin
                    ? dayjs(user.lastLogin).format("DD/MM/YYYY HH:mm")
                    : "Chưa đăng nhập"}
                </span>
              </div>
            </div>
          </div>

          {/* ================= CẢNH BÁO BỊ KHÓA TÀI KHOẢN (Nếu có) ================= */}
          {(user.bannedReason || user.lockUntil) && (
            <div className="mx-6 sm:mx-8 mt-6 bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3 shadow-sm">
              <WarningOutlined className="text-red-500 text-xl mt-0.5" />
              <div>
                <h4 className="text-red-800 font-bold mb-1">
                  Tài khoản đang bị khóa/hạn chế
                </h4>
                <div className="text-sm text-red-700">
                  <span className="font-semibold">Lý do:</span>{" "}
                  {user.bannedReason ||
                    "Vi phạm chính sách / Nhập sai mật khẩu quá số lần"}{" "}
                  <br />
                  {user.lockUntil && (
                    <>
                      <span className="font-semibold">Mở khóa lúc:</span>{" "}
                      {dayjs(user.lockUntil).format("DD/MM/YYYY HH:mm")}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= BODY TABS ================= */}
          <div className="px-6 sm:px-8 mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <Tabs
                defaultActiveKey="1"
                size="large"
                className="px-6! pt-2! custom-tabs!"
              >
                {/* TAB 1: DÀNH CHO BÁC SĨ */}
                {user.role === "doctor" && (
                  <Tabs.TabPane tab="Hồ sơ Bác sĩ" key="1">
                    <div className="py-6">
                      {/* Banner Xác minh (Doctor Profile) */}
                      <div
                        className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${user.doctorProfile?.isVerified ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${user.doctorProfile?.isVerified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                        >
                          <SafetyCertificateOutlined className="text-xl!" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            Trạng thái hồ sơ y tế
                          </div>
                          <div className="text-sm mt-0.5">
                            {user.doctorProfile?.isVerified ? (
                              <span className="text-emerald-600 font-semibold">
                                ✓ Hồ sơ đã được xác minh hợp lệ
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold">
                                ⏳ Đang chờ hệ thống kiểm duyệt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lưới Thông tin */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 mb-8">
                        <InfoItem
                          icon={<IdcardOutlined />}
                          label="Chuyên khoa"
                          value={user.doctorProfile?.specialty?.name}
                          valueColor="text-blue-600"
                        />
                        <InfoItem
                          icon={<ClockCircleOutlined />}
                          label="Kinh nghiệm"
                          value={
                            user.doctorProfile?.experience
                              ? `${user.doctorProfile.experience} năm`
                              : null
                          }
                        />
                        <InfoItem
                          icon={<SafetyCertificateOutlined />}
                          label="Số giấy phép (CCHN)"
                          value={user.doctorProfile?.licenseNumber}
                        />
                        <InfoItem
                          icon={<DollarOutlined />}
                          label="Phí khám bệnh"
                          value={
                            user.doctorProfile?.consultationFee
                              ? `${user.doctorProfile.consultationFee.toLocaleString()} VNĐ`
                              : "Liên hệ / Thỏa thuận"
                          }
                          valueColor="text-emerald-600"
                        />
                        <div className="sm:col-span-2">
                          <InfoItem
                            icon={<EnvironmentOutlined />}
                            label="Nơi công tác"
                            value={renderClinicInfo(user.doctorProfile)}
                          />
                        </div>
                      </div>

                      {/* Tiểu sử */}
                      {user.doctorProfile?.bio && (
                        <div className="mb-8">
                          <div className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                            <InfoCircleOutlined /> Tiểu sử & Thế mạnh chuyên môn
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                            "{user.doctorProfile.bio}"
                          </div>
                        </div>
                      )}

                      {/* Bằng cấp */}
                      {user.doctorProfile?.qualifications?.length > 0 && (
                        <div className="mb-8">
                          <div className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                            <BankOutlined /> Trình độ đào tạo
                          </div>
                          <div className="space-y-3">
                            {user.doctorProfile.qualifications.map((q, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl gap-2 shadow-sm"
                              >
                                <div>
                                  <div className="text-slate-800 font-bold text-sm">
                                    {q.degree}
                                  </div>
                                  <div className="text-slate-500 text-sm font-medium">
                                    {q.institution}
                                  </div>
                                </div>
                                <div className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg text-sm w-max border border-blue-100">
                                  Năm {q.year}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tài liệu đính kèm */}
                      {user.doctorProfile?.documents?.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                            <FilePdfOutlined /> Tài liệu đính kèm
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {user.doctorProfile.documents.map((doc, idx) => (
                              <a
                                key={idx}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-lg shrink-0 group-hover:bg-red-100 transition-colors">
                                  <FilePdfOutlined />
                                </div>
                                <div className="flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                  {doc.name || `Tài liệu ${idx + 1}`}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Tabs.TabPane>
                )}

                {/* TAB 2: DÀNH CHO BỆNH NHÂN */}
                {user.role === "patient" && (
                  <Tabs.TabPane tab="Hồ sơ Bệnh nhân" key="2">
                    <div className="py-6">
                      {user.medicalRecord ? (
                        <div className="space-y-6">
                          {/* Render dữ liệu Patient nếu có */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InfoItem
                              icon={<MedicineBoxOutlined />}
                              label="Nhóm máu"
                              value={user.medicalRecord.bloodGroup}
                              valueColor="text-rose-600"
                            />
                            <InfoItem
                              icon={<WarningOutlined />}
                              label="Dị ứng"
                              value={user.medicalRecord.allergies?.join(", ")}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                          <MedicineBoxOutlined className="text-4xl text-slate-300 mb-3" />
                          <div className="text-slate-700 font-semibold mb-1">
                            Chưa có hồ sơ y tế
                          </div>
                          <div className="text-sm text-slate-500">
                            Bệnh nhân này chưa cập nhật thông tin y tế cá nhân
                            (nhóm máu, tiền sử bệnh...).
                          </div>
                        </div>
                      )}
                    </div>
                  </Tabs.TabPane>
                )}

                {/* TAB 3: THÔNG TIN BẢO MẬT & ĐỊA CHỈ (DÙNG CHUNG) */}
                <Tabs.TabPane
                  tab="Bảo mật & Liên hệ"
                  key={user.role === "patient" ? "1" : "3"}
                >
                  <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                    <div className="sm:col-span-2">
                      <InfoItem
                        icon={<EnvironmentOutlined />}
                        label="Địa chỉ cư trú"
                        value={
                          user.address
                            ? [
                                user.address.street,
                                user.address.city,
                                user.address.state,
                                user.address.country,
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : null
                        }
                      />
                    </div>
                    <InfoItem
                      icon={<SafetyCertificateOutlined />}
                      label="Yêu cầu đổi mật khẩu"
                      value={
                        user.requiresPasswordChange ? "Có (Chưa đổi)" : "Không"
                      }
                      valueColor={
                        user.requiresPasswordChange
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }
                    />
                    <InfoItem
                      icon={<ClockCircleOutlined />}
                      label="Lần cuối đổi mật khẩu"
                      value={
                        user.passwordChangedAt
                          ? dayjs(user.passwordChangedAt).format(
                              "DD/MM/YYYY HH:mm",
                            )
                          : "Chưa từng đổi"
                      }
                    />
                  </div>
                </Tabs.TabPane>
              </Tabs>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState description="Không tìm thấy dữ liệu người dùng" />
      )}
    </Drawer>
  );
};

export default UserDetailDrawer;
