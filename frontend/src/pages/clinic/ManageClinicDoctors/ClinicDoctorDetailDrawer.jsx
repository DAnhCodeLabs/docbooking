import Loading from "@/components/Loading";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilePdfOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Divider, Drawer, Image, Tag, Typography } from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const ClinicDoctorDetailDrawer = ({
  visible,
  onClose,
  doctor,
  loading,
  onConfirm,
  onReject,
  statusMap,
}) => {
  if (!visible) return null;

  const renderFooter = () => {
    if (!doctor || doctor.status !== "pending") return null;
    return (
      <div className="flex justify-end gap-3 py-2">
        <Button
          icon={<CloseCircleOutlined />}
          danger
          onClick={() => {
            onClose();
            onReject(doctor);
          }}
          className="rounded-md!"
        >
          Từ chối
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => {
            onClose();
            onConfirm(doctor);
          }}
          className="bg-blue-600! rounded-md!"
        >
          Xác nhận hồ sơ
        </Button>
      </div>
    );
  };

  return (
    <Drawer
      title="Hồ sơ chi tiết bác sĩ"
      width={720}
      open={visible}
      onClose={onClose}
      footer={renderFooter()}
      className="rounded-l-xl!"
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loading />
        </div>
      ) : doctor ? (
        <>
          {/* Header Profile */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-gray-50 rounded-xl mb-8">
            <Avatar
              size={100}
              src={doctor.user?.avatar}
              icon={!doctor.user?.avatar && <UserOutlined />}
              className="border-4! border-white! shadow-md!"
            />
            <div className="flex-1">
              <Title level={3} className="m-0! mb-2! text-gray-800!">
                {doctor.user?.fullName}
              </Title>
              <div className="flex flex-wrap items-center gap-3">
                <Tag
                  color={statusMap[doctor.status]?.color}
                  className="px-3! py-1! rounded-full! text-sm! m-0!"
                >
                  {statusMap[doctor.status]?.text}
                </Tag>
                <span className="text-gray-500 font-medium">|</span>
                <span className="text-blue-600 font-semibold">
                  {doctor.specialty?.name}
                </span>
              </div>
              {doctor.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm">
                  <strong className="mr-1">Lý do từ chối trước đó:</strong>{" "}
                  {doctor.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Thông tin chung */}
          <Divider orientation="left" className="text-gray-400! text-sm!">
            THÔNG TIN LIÊN HỆ & CÁ NHÂN
          </Divider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 px-2 mb-8">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">Email</span>
              <span className="text-gray-800 font-medium">
                {doctor.user?.email}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">Số điện thoại</span>
              <span className="text-gray-800 font-medium">
                {doctor.user?.phone}
              </span>
            </div>
            {doctor.user?.gender && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Giới tính</span>
                <span className="text-gray-800 font-medium">
                  {doctor.user.gender === "male"
                    ? "Nam"
                    : doctor.user.gender === "female"
                      ? "Nữ"
                      : "Khác"}
                </span>
              </div>
            )}
            {doctor.user?.dateOfBirth && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Ngày sinh</span>
                <span className="text-gray-800 font-medium">
                  {dayjs(doctor.user.dateOfBirth).format("DD/MM/YYYY")}
                </span>
              </div>
            )}
          </div>

          {/* Thông tin chuyên môn */}
          <Divider orientation="left" className="text-gray-400! text-sm!">
            THÔNG TIN CHUYÊN MÔN
          </Divider>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 px-2 mb-8">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">
                Số Giấy phép hành nghề
              </span>
              <span className="text-gray-800 font-medium">
                {doctor.licenseNumber || "Chưa cập nhật"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">Kinh nghiệm</span>
              <span className="text-gray-800 font-medium">
                {doctor.experience} năm
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">
                Phí khám cơ bản
              </span>
              <span className="text-green-600 font-semibold">
                {doctor.consultationFee?.toLocaleString()} VNĐ
              </span>
            </div>
            <div className="flex flex-col md:col-span-2">
              <span className="text-xs text-gray-500 mb-1">
                Giới thiệu bản thân
              </span>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-100 m-0">
                {doctor.bio || "Chưa có thông tin giới thiệu."}
              </p>
            </div>
          </div>

          {/* Bằng cấp & Chứng chỉ */}
          {(doctor.qualifications?.length > 0 ||
            doctor.documents?.length > 0) && (
            <>
              <Divider orientation="left" className="text-gray-400! text-sm!">
                BẰNG CẤP & TÀI LIỆU CHỨNG MINH
              </Divider>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 mb-8">
                <div>
                  <span className="block text-xs text-gray-500 mb-3">
                    Quá trình đào tạo
                  </span>
                  {doctor.qualifications?.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {doctor.qualifications.map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold shrink-0">
                            {q.year}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {q.degree}
                            </div>
                            <div className="text-sm text-gray-500">
                              {q.institution}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      Chưa có dữ liệu
                    </span>
                  )}
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-3">
                    Tài liệu / CCHN
                  </span>
                  {doctor.documents?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {doctor.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md border border-transparent hover:border-gray-200 transition-colors"
                        >
                          <FilePdfOutlined className="text-red-500! text-lg!" />
                          <span className="text-blue-600 hover:underline line-clamp-1">
                            {doc.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">
                      Chưa có tài liệu đính kèm
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Ảnh hoạt động */}
          {doctor.activityImages?.length > 0 && (
            <>
              <Divider orientation="left" className="text-gray-400! text-sm!">
                HÌNH ẢNH HOẠT ĐỘNG
              </Divider>
              <div className="px-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {doctor.activityImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm"
                    >
                      <Image
                        src={img.url}
                        alt="activity"
                        className="w-full! h-full! object-cover!"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">Không có dữ liệu</div>
      )}
    </Drawer>
  );
};

export default ClinicDoctorDetailDrawer;
