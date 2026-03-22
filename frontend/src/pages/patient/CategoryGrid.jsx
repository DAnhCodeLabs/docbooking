import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DownOutlined, AppstoreOutlined } from "@ant-design/icons";
import { specialtyService } from "../admin/ManageCategories/specialtyService";

// MASTER DEV FIX: Tách riêng Component Thẻ danh mục
// Cập nhật để hỗ trợ hiển thị thẻ <img> từ đường link Cloudinary
const CategoryCard = ({ category }) => {
  return (
    <div className="group bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 text-center hover:-translate-y-1 cursor-pointer border border-slate-100 transition-all duration-300">
      {/* Hiển thị ảnh nếu có, nếu không có thì hiển thị Icon mặc định */}
      {category.image ? (
        <div className="w-10 h-10 mx-auto mb-3 overflow-hidden flex justify-center items-center">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      ) : (
        <AppstoreOutlined className="text-[38px]! text-blue-500! mx-auto! mb-3! block group-hover:text-blue-600! group-hover:scale-110! transition-all! duration-300!" />
      )}

      <span className="block text-[13px] md:text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
        {category.name}
      </span>
    </div>
  );
};

const CategoryGrid = () => {
  const [expanded, setExpanded] = useState(false);

  // MASTER DEV FIX: State lưu danh sách lấy từ API
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy dữ liệu khi Component vừa render
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Lấy danh sách dịch vụ đang hoạt động. Lấy tối đa 30 cái để hiển thị trên trang chủ
        const res = await specialtyService.getSpecialties({
          status: "active",
          limit: 30,
        });
        setCategories(res.specialties || []);
      } catch (error) {
        console.error("Lỗi tải danh mục trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Cắt mảng dữ liệu làm 2 phần dựa trên mảng động lấy từ API
  const initialCategories = categories.slice(0, 14);
  const extraCategories = categories.slice(14);

  return (
    <section className="py-16 md:py-24 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            Danh mục Chuyên khoa
          </h2>
          <p className="mt-3 text-slate-500 text-lg">
            Khám chữa bệnh đa dạng các chuyên khoa với đội ngũ bác sĩ hàng đầu.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-slate-500">
            Đang tải danh mục dịch vụ...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500">
            Hệ thống đang cập nhật dịch vụ.
          </div>
        ) : (
          <>
            {/* 1. KHU VỰC CỐ ĐỊNH (Luôn hiển thị tối đa 14 items đầu) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-5">
              {initialCategories.map((category) => (
                <CategoryCard key={category._id} category={category} />
              ))}
            </div>

            {/* 2. KHU VỰC MỞ RỘNG (Chỉ render nếu có nhiều hơn 14 danh mục) */}
            {extraCategories.length > 0 && (
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-5 pt-4 md:pt-5">
                      {extraCategories.map((category) => (
                        <CategoryCard key={category._id} category={category} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* 3. NÚT ĐIỀU KHIỂN (Chỉ hiển thị nút Xem thêm nếu số lượng > 14) */}
            {extraCategories.length > 0 && (
              <div className="flex justify-center mt-10 relative z-10">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="group flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-600 font-semibold py-3 px-8 rounded-full text-[15px] border border-blue-100 shadow-sm hover:shadow transition-all duration-300"
                >
                  <span>
                    {expanded ? "Thu gọn danh mục" : "Xem tất cả chuyên khoa"}
                  </span>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex items-center justify-center"
                  >
                    <DownOutlined className="text-[12px]! font-bold!" />
                  </motion.span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CategoryGrid;
