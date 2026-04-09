import { getTodayUTC } from "@/utils/date";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FieldTimeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  InputNumber,
  Radio,
  TimePicker,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { scheduleApi } from "./scheduleApi";

const { RangePicker } = TimePicker;
const { Text } = Typography;

// Schema hỗ trợ cả date và dateRange
const schema = z
  .object({
    mode: z.enum(["single", "range"]),
    date: z.any().optional(),
    dateRange: z.array(z.any()).optional(),
    shifts: z
      .array(
        z.object({
          timeRange: z
            .array(z.any())
            .length(2, "Vui lòng chọn giờ bắt đầu và kết thúc")
            .refine(
              ([start, end]) => start && end && start < end,
              "Giờ kết thúc phải sau giờ bắt đầu",
            ),
        }),
      )
      .min(1, "Vui lòng thêm ít nhất 1 ca làm việc"),
    slotDuration: z
      .number()
      .min(5, "Tối thiểu 5 phút")
      .max(120, "Tối đa 120 phút"),
  })
  .refine(
    (data) => {
      if (data.mode === "single") {
        return !!data.date;
      } else {
        return (
          data.dateRange &&
          data.dateRange.length === 2 &&
          data.dateRange[0] &&
          data.dateRange[1]
        );
      }
    },
    {
      message: "Vui lòng chọn ngày hoặc khoảng ngày hợp lệ",
      path: ["date"],
    },
  );

const CreateScheduleDrawer = ({ visible, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: "single",
      date: null,
      dateRange: null,
      shifts: [{ timeRange: null }],
      slotDuration: 30,
    },
  });

  const mode = watch("mode");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "shifts",
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let payload;
      if (data.mode === "single") {
        payload = {
          date: dayjs(data.date).format("YYYY-MM-DD"),
          shifts: data.shifts.map((shift) => ({
            startTime: dayjs(shift.timeRange[0]).format("HH:mm"),
            endTime: dayjs(shift.timeRange[1]).format("HH:mm"),
          })),
          slotDuration: data.slotDuration,
        };
      } else {
        payload = {
          dateRange: {
            start: dayjs(data.dateRange[0]).format("YYYY-MM-DD"),
            end: dayjs(data.dateRange[1]).format("YYYY-MM-DD"),
          },
          shifts: data.shifts.map((shift) => ({
            startTime: dayjs(shift.timeRange[0]).format("HH:mm"),
            endTime: dayjs(shift.timeRange[1]).format("HH:mm"),
          })),
          slotDuration: data.slotDuration,
        };
      }

      await scheduleApi.createSchedule(payload);

      reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      // Lỗi đã xử lý qua interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={
        <span className="text-lg! font-bold! text-slate-800!">
          Thiết lập Lịch làm việc
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
            Lưu lịch khám
          </Button>
        </div>
      }
    >
      <Form
        layout="vertical"
        className="bg-white p-6! rounded-2xl shadow-sm border border-slate-100"
      >
        {/* Chọn chế độ */}
        <Form.Item label="Loại lịch" className="mb-4!">
          <Controller
            name="mode"
            control={control}
            render={({ field }) => (
              <Radio.Group
                {...field}
                className="flex!"
                buttonStyle="solid"
                optionType="button"
              >
                <Radio.Button value="single" className="flex-1! text-center!">
                  Một ngày
                </Radio.Button>
                <Radio.Button value="range" className="flex-1! text-center!">
                  Nhiều ngày
                </Radio.Button>
              </Radio.Group>
            )}
          />
        </Form.Item>

        {/* CHỌN NGÀY / KHOẢNG NGÀY */}
        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700! flex! items-center! gap-2!">
              <CalendarOutlined className="text-indigo-500!" />
              {mode === "single" ? "Ngày làm việc" : "Khoảng ngày làm việc"}
            </Text>
          }
          validateStatus={errors.date ? "error" : ""}
          help={errors.date?.message}
          className="mb-5!"
        >
          {mode === "single" ? (
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  {...field}
                  format="DD/MM/YYYY"
                  className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500!"
                  placeholder="Chọn ngày"
                  disabledDate={(current) =>
                    current && dayjs(getTodayUTC()).isAfter(current, "day")
                  }
                />
              )}
            />
          ) : (
            <Controller
              name="dateRange"
              control={control}
              render={({ field }) => (
                <DatePicker.RangePicker
                  {...field}
                  format="DD/MM/YYYY"
                  className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500!"
                  placeholder={["Từ ngày", "Đến ngày"]}
                  disabledDate={(current) =>
                    current && dayjs(getTodayUTC()).isAfter(current, "day")
                  }
                />
              )}
            />
          )}
        </Form.Item>

        {/* DANH SÁCH CA LÀM VIỆC ĐỘNG (giữ nguyên) */}
        <div className="mb-5!">
          <Text className="font-semibold! text-slate-700! flex! items-center! gap-2! mb-3">
            <ClockCircleOutlined className="text-indigo-500!" /> Các ca làm việc
            (Sáng, Chiều...)
          </Text>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-3 items-start">
              <div className="flex-1">
                <Controller
                  name={`shifts.${index}.timeRange`}
                  control={control}
                  render={({ field }) => (
                    <RangePicker
                      {...field}
                      format="HH:mm"
                      className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500!"
                      placeholder={["Giờ bắt đầu", "Giờ kết thúc"]}
                      minuteStep={15}
                    />
                  )}
                />
                {errors.shifts?.[index]?.timeRange && (
                  <div className="text-red-500 text-sm mt-1">
                    {errors.shifts[index].timeRange.message}
                  </div>
                )}
              </div>

              {fields.length > 1 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(index)}
                  className="h-11! w-11! "
                />
              )}
            </div>
          ))}

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => append({ timeRange: null })}
            className=" h-10! text-indigo-600! border-indigo-300! bg-indigo-50! hover:bg-indigo-100!"
          >
            Thêm ca làm việc
          </Button>
        </div>

        {/* THỜI LƯỢNG MỖI CA (giữ nguyên) */}
        <Form.Item
          label={
            <Text className="font-semibold! text-slate-700! flex! items-center! gap-2!">
              <FieldTimeOutlined className="text-indigo-500!" /> Thời lượng mỗi
              ca (phút)
            </Text>
          }
          validateStatus={errors.slotDuration ? "error" : ""}
          help={errors.slotDuration?.message}
          className="mb-0!"
        >
          <Controller
            name="slotDuration"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={5}
                max={120}
                step={5}
                className="w-full! h-11! bg-slate-50!  border-slate-200! hover:border-indigo-400! focus:border-indigo-500! flex! items-center!"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreateScheduleDrawer;
