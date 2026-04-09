import {
  CheckCircleFilled,
  EnvironmentOutlined,
  StarFilled,
} from "@ant-design/icons";
import { Avatar, Button } from "antd";
import { useNavigate } from "react-router-dom";

const DoctorCard = ({ doctor, onViewDetail, avgRating = 0 }) => {
  const navigate = useNavigate();

  const clinicName =
    doctor.clinicId?.clinicName ||
    doctor.customClinicName ||
    "Chưa cập nhật nơi công tác";
  const clinicAddress =
    doctor.clinicId?.address || "Liên hệ để biết địa chỉ chi tiết";
  const displayRating = avgRating > 0 ? avgRating.toFixed(1) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col">
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div
          className="shrink-0 flex justify-center sm:justify-start cursor-pointer group-hover:opacity-90 transition-opacity"
          onClick={() => onViewDetail(doctor._id)}
        >
          <Avatar
            size={{ xs: 80, sm: 100, md: 110 }}
            shape="square"
            src={doctor.user?.avatar}
            className="w-26! h-26! border-2! border-slate-100! shadow-sm! bg-blue-50! object-cover! object-top!"
          />
        </div>

        <div className="flex-1">
          <h3
            className="text-base md:text-lg font-bold text-blue-600 mb-1 cursor-pointer hover:text-blue-700 transition-colors w-max"
            onClick={() => onViewDetail(doctor._id)}
          >
            BS. {doctor.user?.fullName || "Chưa cập nhật tên"}
            <span className="text-slate-400 font-normal hidden sm:inline">
              {" "}
              |{" "}
            </span>
            <span className="text-blue-500 sm:text-slate-500 font-medium text-sm sm:text-base block sm:inline mt-0.5 sm:mt-0">
              {clinicName}
            </span>
          </h3>

          {/* Hiển thị rating */}
          <div className="flex items-center gap-2 mt-1 mb-2">
            {displayRating ? (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                <StarFilled className="text-yellow-500! text-xs!" />
                <span className="text-xs font-bold text-yellow-700">
                  {displayRating}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa có đánh giá</span>
            )}
          </div>

          <div className="grid grid-cols-[90px_1fr] sm:grid-cols-[100px_1fr] gap-y-1 text-[13px] sm:text-sm">
            <div className="font-bold text-slate-700">Chuyên trị:</div>
            <div className="text-slate-600 line-clamp-1">
              {doctor.bio || "Chưa cập nhật tiểu sử."}
            </div>
            <div className="font-bold text-slate-700">Kinh nghiệm:</div>
            <div className="text-slate-600">
              {doctor.experience
                ? `${doctor.experience} năm công tác`
                : "Đang cập nhật"}
            </div>
            <div className="font-bold text-slate-700">Giá khám:</div>
            <div className="text-slate-600 font-medium">
              {doctor.consultationFee
                ? `${doctor.consultationFee.toLocaleString()}đ`
                : "Miễn phí / Thỏa thuận"}
            </div>
            <div className="font-bold text-slate-700">Chuyên khoa:</div>
            <div className="text-slate-600 font-medium">
              {doctor.specialty?.name || "Chưa phân khoa"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#f4f9fd] border-t border-blue-50 p-3 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <EnvironmentOutlined className="text-blue-600! mt-0.5! shrink-0!" />
            <div>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span className="truncate">{clinicName}</span>
                <CheckCircleFilled className="text-blue-500! text-xs! shrink-0!" />
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                {clinicAddress}
              </div>
            </div>
          </div>
        </div>

        <Button
          type="primary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/booking/${doctor._id}`);
          }}
          className="bg-[#00b5f1]! hover:bg-[#009bcf]! text-white! font-bold! rounded-full! px-6! h-8! sm:h-9! border-none! shadow-[0_2px_8px_rgba(0,181,241,0.25)]! shrink-0! w-full! sm:w-auto!"
        >
          Đặt ngay
        </Button>
      </div>
    </div>
  );
};

export default DoctorCard;
