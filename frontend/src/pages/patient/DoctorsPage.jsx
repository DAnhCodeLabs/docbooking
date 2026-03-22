import DoctorCard from "@/components/DoctorCard";
import DoctorDetailModal from "@/components/DoctorDetailModal";
import DoctorFilterSidebar from "@/components/DoctorFilterSidebar";
import {
  CheckCircleFilled,
  FilterOutlined,
  StarFilled,
} from "@ant-design/icons";
import { Button, Drawer, Empty, Pagination, Select, Skeleton } from "antd";
import { useEffect, useMemo, useState } from "react";
import { TbShieldCheckFilled } from "react-icons/tb";
import { publicApi } from "./publicApi";

const { Option } = Select;

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("experience_desc");

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // STATE MỚI: QUẢN LÝ MODAL XEM CHI TIẾT
  const [selectedDoctorDetail, setSelectedDoctorDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    specialty: null,
    clinicId: null,
    priceRange: [0, 2000000],
    experience: null,
  });

  const getSortedDoctors = (list, sortKey) => {
    if (!list || list.length === 0) return list;

    const sorted = [...list]; // tạo bản sao để không mutate state gốc

    switch (sortKey) {
      case "experience_desc":
        return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
      case "experience_asc":
        return sorted.sort((a, b) => (a.experience || 0) - (b.experience || 0));
      case "fee_asc":
        return sorted.sort(
          (a, b) => (a.consultationFee || 0) - (b.consultationFee || 0),
        );
      case "fee_desc":
        return sorted.sort(
          (a, b) => (b.consultationFee || 0) - (a.consultationFee || 0),
        );
      default:
        return sorted;
    }
  };

  const sortedDoctors = useMemo(() => {
    return getSortedDoctors(doctors, sortBy);
  }, [doctors, sortBy]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [specRes, clinicRes] = await Promise.all([
          publicApi.getSpecialties({ status: "active" }),
          publicApi.getClinics({ status: "resolved" }),
        ]);
        setSpecialties(specRes?.specialties || []);
        setClinics(clinicRes?.clinics || clinicRes?.data || []);
      } catch (error) {}
    };
    fetchInitialData();
  }, []);

  const fetchDoctors = async (
    page = pagination.current,
    currentFilters = filters,
  ) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        search: currentFilters.search || undefined,
        specialty: currentFilters.specialty || undefined,
      };

      if (currentFilters.priceRange && currentFilters.priceRange.length === 2) {
        params.minPrice = currentFilters.priceRange[0];
        params.maxPrice = currentFilters.priceRange[1];
      }
      if (currentFilters.experience)
        params.minExperience = currentFilters.experience;
      if (currentFilters.clinicId) params.clinicId = currentFilters.clinicId;

      const res = await publicApi.getDoctors(params);

      setDoctors(res?.doctors || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: res?.total || 0,
      }));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(pagination.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchDoctors(1, filters);
    // Đóng Drawer trên Mobile sau khi bấm tìm kiếm
    setMobileFilterOpen(false);
  };

  const handleReset = () => {
    const defaultFilters = {
      search: "",
      specialty: null,
      clinicId: null,
      priceRange: [0, 2000000],
      experience: null,
    };
    setFilters(defaultFilters);
    fetchDoctors(1, defaultFilters);
    // Có thể không đóng Drawer để user chọn tiếp, hoặc đóng luôn tùy ý. Ở đây giữ mở để user thấy đã reset.
  };

  const handleOpenDetailModal = async (doctorId) => {
    setLoadingDetail(true);
    try {
      const response = await publicApi.getDoctorById(doctorId); // Gọi API chi tiết
      setSelectedDoctorDetail(response); // response là object bác sĩ đầy đủ
      setIsDetailModalOpen(true);
    } catch (error) {
      // Xử lý lỗi (có thể thông báo)
      console.error("Lỗi khi lấy chi tiết bác sĩ:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* ================= BANNER HERO ================= */}
      {/* Code Banner giữ nguyên hoàn toàn như cũ... */}
      <div className="relative bg-[#022c43] pt-20 pb-24 lg:pt-28 lg:pb-32 overflow-hidden mb-8 lg:mb-12 border-b border-blue-900/50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-size-[32px_32px]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-150 h-150 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl text-center lg:text-left z-10 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 text-cyan-300 text-sm font-semibold mb-6 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Nền tảng Y tế Chuyên sâu
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black text-white tracking-tight mb-6 leading-[1.15]">
                Đội ngũ Chuyên gia <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-300">
                  & Y Bác sĩ Hàng đầu
                </span>
              </h1>

              <p className="text-blue-100/80 text-lg md:text-xl mb-10 leading-relaxed font-medium max-w-xl mx-auto lg:mx-0">
                Tiếp cận mạng lưới hơn 500+ bác sĩ giỏi, chuyên gia y tế giàu
                kinh nghiệm từ các bệnh viện tuyến đầu. Đặt lịch nhanh chóng, an
                toàn và bảo mật.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <TbShieldCheckFilled className="text-emerald-400! text-[22px]!" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-base">
                      100% Xác minh
                    </div>
                    <div className="text-xs text-blue-200/70 font-medium">
                      Chứng chỉ hành nghề
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <StarFilled className="text-yellow-400! text-[22px]!" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-base">
                      4.9/5 Điểm
                    </div>
                    <div className="text-xs text-blue-200/70 font-medium">
                      Đánh giá thực tế
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative z-10 w-full max-w-md animate-fade-in">
              <div className="absolute -top-8 -right-8 w-24 h-24 border border-white/10 rounded-full"></div>
              <div className="absolute -bottom-6 -left-6 w-16 h-16 border border-cyan-400/20 rounded-full"></div>

              <div className="bg-[#0f172a]/50 backdrop-blur-xl border border-white/10 p-8 rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

                <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                  <CheckCircleFilled className="text-cyan-400!" />
                  Thống kê Nền tảng
                </h3>

                <div className="space-y-5">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-colors hover:bg-white/10">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-cyan-400">
                      50+
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        Chuyên khoa
                      </div>
                      <div className="text-xs text-blue-200/70 font-medium mt-0.5">
                        Khám chữa bệnh đa dạng
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/10">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <div className="text-white font-semibold text-sm mb-2">
                          Sự hài lòng của Bệnh nhân
                        </div>
                        <div className="flex -space-x-3">
                          <img
                            src="https://i.pravatar.cc/100?img=5"
                            alt="user"
                            className="w-9 h-9 rounded-full border-2 border-[#0f172a] shadow-sm"
                          />
                          <img
                            src="https://i.pravatar.cc/100?img=8"
                            alt="user"
                            className="w-9 h-9 rounded-full border-2 border-[#0f172a] shadow-sm"
                          />
                          <img
                            src="https://i.pravatar.cc/100?img=9"
                            alt="user"
                            className="w-9 h-9 rounded-full border-2 border-[#0f172a] shadow-sm"
                          />
                          <div className="w-9 h-9 rounded-full border-2 border-[#0f172a] bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                            +12k
                          </div>
                        </div>
                      </div>
                      <div className="text-4xl font-black text-white">
                        98<span className="text-xl text-cyan-400">%</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
                      <div className="bg-linear-to-r from-cyan-400 to-blue-500 w-[98%] h-full rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ================= KẾT THÚC BANNER ================= */}

      {/* ================= MAIN CONTENT ================= */}
      <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* CỘT TRÁI: DESKTOP SIDEBAR */}
          {/* Trên màn hình nhỏ (dưới lg) sẽ bị hidden đi */}
          <div className="hidden lg:block w-80 shrink-0 animate-fade-in-left">
            <DoctorFilterSidebar
              specialties={specialties}
              clinics={clinics}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
              onReset={handleReset}
              isMobile={false}
            />
          </div>

          {/* CỘT PHẢI: DANH SÁCH KẾT QUẢ */}
          <div className="flex-1 min-w-0">
            {/* Toolbar (Mobile có thêm nút Filter) */}
            <div className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-slate-600 font-medium px-2 self-start sm:self-center">
                {loading ? (
                  "Đang tìm kiếm dữ liệu..."
                ) : (
                  <span>
                    Tìm thấy{" "}
                    <strong className="text-blue-600 text-base">
                      {pagination.total}
                    </strong>{" "}
                    bác sĩ phù hợp
                  </span>
                )}
              </div>

              {/* Các thao tác (Filter Mobile & Sort) */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Nút bật Filter trên Mobile */}
                <Button
                  className="lg:hidden! flex! items-center! justify-center! flex-1! sm:flex-none!  h-10! font-semibold! text-blue-600! border-blue-200! bg-blue-50!"
                  icon={<FilterOutlined />}
                  onClick={() => setMobileFilterOpen(true)}
                >
                  Lọc kết quả
                </Button>

                {/* Sắp xếp */}
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <span className="text-sm text-slate-500 font-medium hidden sm:block">
                    Sắp xếp:
                  </span>
                  <Select
                    value={sortBy} // liên kết với state
                    className="w-full! sm:w-48!  h-10!"
                    onChange={(val) => setSortBy(val)} // cập nhật state
                  >
                    <Option value="experience_desc">
                      Kinh nghiệm (Nhiều nhất)
                    </Option>
                    <Option value="experience_asc">
                      Kinh nghiệm (Ít nhất)
                    </Option>
                    <Option value="fee_asc">Phí khám (Thấp đến cao)</Option>
                    <Option value="fee_desc">Phí khám (Cao đến thấp)</Option>
                  </Select>
                </div>
              </div>
            </div>

            {/* List Bác sĩ */}
            <div className="flex flex-col gap-6">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-6"
                  >
                    <Skeleton.Avatar
                      active
                      size={120}
                      shape="square"
                      className="rounded-2xl!"
                    />
                    <div className="flex-1">
                      <Skeleton.Input
                        active
                        size="small"
                        className="w-3/4! mb-4!"
                      />
                      <Skeleton active paragraph={{ rows: 3 }} />
                    </div>
                  </div>
                ))
              ) : sortedDoctors.length > 0 ? (
                sortedDoctors.map((doctor, idx) => (
                  <div
                    key={doctor._id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <DoctorCard
                      doctor={doctor}
                      onViewDetail={handleOpenDetailModal}
                    />
                  </div>
                ))
              ) : (
                <div className="py-20 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center">
                  <Empty
                    description={
                      <span className="text-slate-500 font-medium">
                        Không tìm thấy bác sĩ nào khớp với bộ lọc của bạn.
                      </span>
                    }
                  />
                  <Button
                    type="link"
                    onClick={handleReset}
                    className="mt-2! text-blue-600! font-semibold!"
                  >
                    Xóa bộ lọc để thử lại
                  </Button>
                </div>
              )}
            </div>

            {!loading && pagination.total > 0 && (
              <div className="flex justify-center mt-10">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={(page, pageSize) =>
                    setPagination({ ...pagination, current: page, pageSize })
                  }
                  showSizeChanger
                  className="bg-white! px-4! py-2!  shadow-sm! border! border-slate-100!"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MOBILE FILTER DRAWER ================= */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <FilterOutlined className="text-blue-600" />
            <span className="font-bold! text-slate-800! text-lg!">
              Bộ lọc tìm kiếm
            </span>
          </div>
        }
        placement="left" // Mở từ trái sang theo thói quen lướt web mobile
        width={320}
        onClose={() => setMobileFilterOpen(false)}
        open={mobileFilterOpen}
        styles={{ body: { padding: 0, backgroundColor: "#f8fafc" } }} // Xóa padding mặc định để component con tự handle
      >
        <DoctorFilterSidebar
          specialties={specialties}
          clinics={clinics}
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onReset={handleReset}
          isMobile={true} // Báo cho component con biết nó đang nằm trong Drawer
        />
      </Drawer>
      <DoctorDetailModal
        visible={isDetailModalOpen}
        doctor={selectedDoctorDetail}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};

export default DoctorsPage;
