// src/pages/components/ClinicReviewStats.jsx
import { httpGet } from "@/services/http";
import { formatDateUTC } from "@/utils/date";
import {
  StarFilled,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Card,
  Col,
  Progress,
  Rate,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;

const ClinicReviewStats = ({ dateRange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const fetchReviewStats = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      params.groupBy = "month";
      params.sortBy = "avgRating";
      params.limit = 5;
      const response = await httpGet(
        "/clinic-admin/review-stats",
        params,
        false,
      );
      setStats(response);
    } catch (err) {
      console.error("Lỗi tải thống kê đánh giá phòng khám:", err);
      setError(err?.message || "Không thể tải dữ liệu đánh giá.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = formatDateUTC(dateRange[0], "YYYY-MM-DD");
      const end = formatDateUTC(dateRange[1], "YYYY-MM-DD");
      fetchReviewStats(start, end);
    } else {
      fetchReviewStats();
    }
  }, [dateRange]);

  if (loading) {
    return (
      <Card className="rounded-2xl! shadow-sm! border-slate-200! mt-8!">
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" className="text-amber-500!" />
          <div className="mt-4 text-slate-500">
            Đang phân tích phản hồi bệnh nhân...
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl! shadow-sm! border-slate-200! mt-8!">
        <Alert
          message="Lỗi tải đánh giá"
          description={error}
          type="error"
          showIcon
          className="border-red-200! bg-red-50!"
        />
      </Card>
    );
  }

  if (!stats) return null;

  const {
    totalReviews,
    averageRating,
    ratingDistribution,
    topDoctors,
    bottomDoctors,
    trend,
  } = stats;

  const total = totalReviews || 0;
  const avg = averageRating || 0;

  // Đảo ngược mảng để UX giống các nền tảng lớn (5 sao trên cùng)
  const starData = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingDistribution?.[star] || 0,
    percent: total ? (ratingDistribution[star] / total) * 100 : 0,
  }));

  const doctorColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      align: "center",
      render: (_, __, index) => (
        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold mx-auto">
          {index + 1}
        </div>
      ),
    },
    {
      title: "Bác sĩ",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => (
        <Text className="font-semibold! text-slate-700!">{text}</Text>
      ),
    },
    {
      title: "Điểm đánh giá",
      dataIndex: "avgRating",
      key: "avgRating",
      align: "center",
      render: (val) => (
        <Tag
          color="gold"
          className="rounded-md! border-0! font-bold! px-3! py-1! bg-amber-50! text-amber-600! text-sm!"
        >
          <StarFilled className="mr-1! text-xs!" /> {val?.toFixed(1)}
        </Tag>
      ),
    },
    {
      title: "Số lượt đánh giá",
      dataIndex: "totalReviews",
      key: "totalReviews",
      align: "right",
      render: (val) => <span className="text-slate-500">{val} lượt</span>,
    },
  ];

  const trendColumns = [
    {
      title: "Kỳ báo cáo",
      dataIndex: "period",
      key: "period",
      render: (text) => (
        <Text className="font-medium! text-slate-700!">{text}</Text>
      ),
    },
    {
      title: "Điểm Trung Bình",
      dataIndex: "avgRating",
      key: "avgRating",
      align: "center",
      render: (val) => (
        <div className="flex items-center justify-center gap-1">
          <span className="font-bold text-amber-500">
            {val?.toFixed(1) || "0"}
          </span>
          <StarFilled className="text-amber-400! text-xs!" />
        </div>
      ),
    },
    {
      title: "Lượt đánh giá",
      dataIndex: "count",
      key: "count",
      align: "right",
      render: (val) => <span className="text-slate-500">{val} lượt</span>,
    },
  ];

  return (
    <Card
      className="rounded-2xl! shadow-sm! border-slate-200! mt-8! overflow-hidden!"
      headStyle={{ borderBottom: "1px solid #f1f5f9", padding: "16px 24px" }}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <StarFilled className="text-amber-500!" />
          </div>
          <span className="font-bold text-slate-800 text-base">
            Phân tích Phản hồi & Đánh giá
          </span>
        </div>
      }
    >
      <Row gutter={[32, 32]}>
        {/* Cột trái: Thông số tổng quát */}
        <Col xs={24} md={10} lg={8}>
          <div className="bg-slate-50 rounded-2xl p-6 h-full flex flex-col justify-center items-center text-center border border-slate-100">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">
              Điểm trung bình
            </h3>
            <div className="text-6xl font-black text-slate-800 mb-2">
              {avg.toFixed(1)}
            </div>
            <Rate
              disabled
              value={avg}
              allowHalf
              className="text-amber-400! text-xl! mb-4!"
            />
            <div className="text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              Tổng cộng{" "}
              <span className="font-bold text-slate-800">{total}</span> đánh giá
            </div>
          </div>
        </Col>

        {/* Cột phải: Phân bổ sao */}
        <Col xs={24} md={14} lg={16} className="flex flex-col justify-center">
          <div className="pr-0 lg:pr-8">
            <div className="mb-4 text-slate-700 font-semibold">
              Phân bổ chi tiết theo số sao
            </div>
            {starData.map((item) => (
              <div key={item.star} className="flex items-center gap-4 mb-3">
                <div className="w-16 flex items-center justify-end gap-1">
                  <span className="font-medium text-slate-600 text-sm">
                    {item.star}
                  </span>
                  <StarFilled className="text-slate-400! text-xs!" />
                </div>
                <div className="flex-1">
                  <Progress
                    percent={item.percent}
                    showInfo={false}
                    strokeColor={
                      item.star >= 4
                        ? "#10b981"
                        : item.star === 3
                          ? "#f59e0b"
                          : "#ef4444"
                    }
                    trailColor="#f1f5f9"
                    size={["100%", 12]}
                    className="m-0!"
                  />
                </div>
                <div className="w-24 text-right text-sm font-medium text-slate-500">
                  {item.count}{" "}
                  <span className="text-slate-400 font-normal">
                    ({item.percent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Col>

        {/* Bảng Top Bác sĩ */}
        {topDoctors && topDoctors.length > 0 && (
          <Col xs={24} lg={12}>
            <div className="border border-slate-200 rounded-xl overflow-hidden h-full">
              <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
                {/* <TrendingUpOutlined className="text-emerald-600!" /> */}
                <span className="font-bold text-emerald-800">
                  Top Bác sĩ được đánh giá cao
                </span>
              </div>
              <Table
                columns={doctorColumns}
                dataSource={topDoctors}
                rowKey="doctorId"
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
                className="[&_.ant-table-thead_th]:bg-slate-50! m-0!"
              />
            </div>
          </Col>
        )}

        {/* Bảng Bottom Bác sĩ */}
        {bottomDoctors && bottomDoctors.length > 0 && (
          <Col xs={24} lg={12}>
            <div className="border border-rose-200 rounded-xl overflow-hidden h-full">
              <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center gap-2">
                <WarningOutlined className="text-rose-600!" />
                <span className="font-bold text-rose-800">
                  Bác sĩ cần theo dõi & cải thiện
                </span>
              </div>
              <Table
                columns={doctorColumns}
                dataSource={bottomDoctors}
                rowKey="doctorId"
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
                className="[&_.ant-table-thead_th]:bg-slate-50! m-0!"
              />
            </div>
          </Col>
        )}

        {/* Bảng xu hướng đánh giá */}
        {trend && trend.length > 0 && (
          <Col xs={24}>
            <div className="border-t border-slate-100 pt-6 mt-2">
              <div className="flex items-center justify-between mb-4">
                <Text className="font-bold! text-slate-800! text-base!">
                  Biến động điểm đánh giá theo thời gian
                </Text>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table
                  columns={trendColumns}
                  dataSource={trend}
                  rowKey="period"
                  pagination={false}
                  size="middle"
                  scroll={{ x: "max-content" }}
                  className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-600! [&_.ant-table-thead_th]:font-semibold! m-0!"
                />
              </div>
            </div>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default ClinicReviewStats;
