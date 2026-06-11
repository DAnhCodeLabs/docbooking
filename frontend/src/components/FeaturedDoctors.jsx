import { publicApi } from "@/pages/patient/publicApi";
import { EnvironmentOutlined, StarFilled } from "@ant-design/icons";
import { Button, Card, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

const FeaturedDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const data = await publicApi.getTopRatedDoctors({ limit: 10 });
        if (Array.isArray(data)) {
          setDoctors(data);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách bác sĩ nổi bật:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const getClinicName = (doc) => {
    return (
      doc.clinicId?.clinicName || doc.customClinicName || "Phòng khám tư nhân"
    );
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "Đang cập nhật";
    if (amount === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (!loading && doctors.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Title level={2} className="!mb-2 !text-slate-800">
            Bác sĩ nổi bật
          </Title>
          <Text className="text-slate-500 text-base">
            Đội ngũ chuyên gia y tế được đánh giá cao nhất bởi bệnh nhân
          </Text>
        </div>
        <Button
          type="link"
          onClick={() => navigate("/doctors")}
          className="hidden sm:inline-flex"
        >
          Xem tất cả
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card
                key={index}
                className="shadow-sm rounded-xl overflow-hidden border-slate-200"
              >
                <Skeleton.Avatar
                  active
                  shape="square"
                  className="!w-full !h-48 rounded-t-xl"
                />
                <div className="p-4">
                  <Skeleton active paragraph={{ rows: 3 }} />
                </div>
              </Card>
            ))
          : doctors.map((doctor) => (
              <Card
                key={doctor._id}
                hoverable
                className="shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl overflow-hidden border-slate-200 flex flex-col h-full"
                styles={{
                  body: {
                    padding: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  },
                }}
                onClick={() => navigate(`/booking/${doctor._id}`)}
              >
                <div className="h-48 w-full bg-slate-100 overflow-hidden relative">
                  <img
                    src={doctor.user?.avatar || "/default-avatar.png"}
                    alt={doctor.user?.fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/300x300?text=Doctor";
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <StarFilled className="text-yellow-400 text-sm" />
                    <span className="font-bold text-sm text-slate-800">
                      {doctor.averageRating}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({doctor.totalReviews})
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <Text className="text-blue-600 font-medium text-xs mb-1 uppercase tracking-wide">
                    {doctor.specialty?.name}
                  </Text>
                  <Title
                    level={5}
                    className="!mb-1 !text-slate-800 line-clamp-1"
                  >
                    {doctor.user?.fullName}
                  </Title>

                  <div className="flex items-start gap-1 mt-2 mb-4 text-slate-500">
                    <EnvironmentOutlined className="mt-1" />
                    <Text className="text-sm line-clamp-2">
                      {getClinicName(doctor)}
                    </Text>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <Text className="text-xs text-slate-400">Phí khám</Text>
                      <Text className="font-semibold text-slate-800">
                        {formatCurrency(doctor.consultationFee)}
                      </Text>
                    </div>
                    <Button type="primary" size="small" className="rounded-md">
                      Đặt khám
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      <Button
        block
        type="default"
        onClick={() => navigate("/doctors")}
        className="mt-6 sm:hidden"
      >
        Xem tất cả bác sĩ
      </Button>
    </section>
  );
};

export default FeaturedDoctors;
