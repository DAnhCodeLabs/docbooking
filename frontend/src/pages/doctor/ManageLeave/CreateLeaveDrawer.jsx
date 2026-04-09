import { getTodayUTC } from "@/utils/date";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  TimePicker,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { leaveApi } from "./leaveApi";

const { RangePicker } = TimePicker;
const { TextArea } = Input;
const { Text } = Typography;

const schema = z
  .object({
    date: z.any({ required_error: "Vui lòng chọn ngày" }),
    timeRange: z
      .array(z.any())
      .length(2, "Vui lòng chọn khung giờ")
      .refine(
        ([start, end]) => start < end,
        "Giờ kết thúc phải sau giờ bắt đầu",
      ),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      // FIX: Compare Date objects instead of dayjs objects
      // getTodayUTC() now returns Date object (at 00:00:00 UTC)
      const selectedDate = dayjs.utc(data.date).startOf("day").toDate();
      const today = getTodayUTC(); // Date object
      return selectedDate >= today; // Date comparison
    },
    { message: "Không thể chọn ngày trong quá khứ", path: ["date"] },
  );

const CreateLeaveDrawer = ({ visible, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      date: null,
      timeRange: null,
      reason: "",
    },
  });

  // Tự động reset form khi mở lại
  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Master Dev: Chuẩn hóa dữ liệu y hệt Backend Validation yêu cầu
      const payload = {
        date: dayjs(data.date).format("YYYY-MM-DD"),
        startTime: dayjs(data.timeRange[0]).format("HH:mm"),
        endTime: dayjs(data.timeRange[1]).format("HH:mm"),
        reason: data.reason || "",
      };

      await leaveApi.createLeave(payload);

      reset();
      onClose();
      if (onSuccess) onSuccess(); // Báo cho table load lại
    } catch (error) {
      // Đã được xử lý bởi axios interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          Đăng ký Ngày nghỉ
        </span>
      }
      width={450}
      open={visible}
      onClose={onClose}
      styles={{ body: { padding: "24px", backgroundColor: "#f8fafc" } }}
      footer={
        <div className="flex justify-end gap-3 p-2">
          <Button
            onClick={onClose}
            className=" font-semibold! h-10! text-slate-600!"
          >
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit(onSubmit)}
            loading={loading}
            className="bg-indigo-600! hover:bg-indigo-700! border-none! font-semibold!  h-10! px-6! shadow-sm! shadow-indigo-600/20!"
          >
            Xác nhận nghỉ
          </Button>
        </div>
      }
    >
      <Form
        layout="vertical"
        className="bg-white p-6! rounded-2xl shadow-sm border border-slate-100"
      >
        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700! flex! items-center! gap-2!">
              <CalendarOutlined className="text-indigo-500!" /> Ngày nghỉ
            </Text>
          }
          validateStatus={errors.date ? "error" : ""}
          help={errors.date?.message}
          className="mb-5!"
        >
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                format="DD/MM/YYYY"
                className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500!"
                placeholder="Chọn ngày"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700! flex! items-center! gap-2!">
              <ClockCircleOutlined className="text-indigo-500!" /> Khung giờ
              vắng mặt
            </Text>
          }
          validateStatus={errors.timeRange ? "error" : ""}
          help={errors.timeRange?.message}
          className="mb-5!"
        >
          <Controller
            name="timeRange"
            control={control}
            render={({ field }) => (
              <RangePicker
                {...field}
                format="HH:mm"
                className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500!"
                placeholder={["Bắt đầu", "Kết thúc"]}
                minuteStep={15}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700! flex! items-center! gap-2!">
              <FileTextOutlined className="text-indigo-500!" /> Lý do nghỉ{" "}
              <span className="text-slate-400! font-normal!">(Tùy chọn)</span>
            </Text>
          }
          validateStatus={errors.reason ? "error" : ""}
          help={errors.reason?.message}
          className="mb-0!"
        >
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                rows={4}
                className="bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500! focus:bg-white!"
                placeholder="VD: Bận việc gia đình đột xuất..."
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateLeaveDrawer;
