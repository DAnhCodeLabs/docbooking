import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Input, Button, Row, Col, Typography } from "antd";
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { registerSchema } from "@/utils/validations/authSchemas";

const { Title, Text } = Typography;

const RegisterForm = ({ onSubmit, loading }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phone: "",
    },
  });

  const inputClasses =
    "rounded-xl h-12 bg-slate-50 border-transparent hover:border-blue-400 focus:bg-white focus:border-blue-500 transition-colors";

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <Title
          level={2}
          className="mb-2! font-bold! text-slate-800! tracking-tight!"
        >
          Đăng ký
        </Title>
        <Text className="text-slate-500 text-base">
          Tạo tài khoản để đặt lịch khám dễ dàng
        </Text>
      </div>

      <Form layout="vertical" onFinish={handleSubmit(onSubmit)} size="large">
            <Form.Item
              validateStatus={errors.fullName ? "error" : ""}
              help={errors.fullName?.message}
              className="mb-4!"
            >
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<UserOutlined className="text-slate-400 mr-2" />}
                    placeholder="Họ và tên đệm"
                    className={inputClasses}
                  />
                )}
              />
            </Form.Item>

        <Form.Item
          validateStatus={errors.email ? "error" : ""}
          help={errors.email?.message}
          className="mb-4!"
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined className="text-slate-400 mr-2" />}
                placeholder="Địa chỉ Email"
                className={inputClasses}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          validateStatus={errors.phone ? "error" : ""}
          help={errors.phone?.message}
          className="mb-4!"
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<PhoneOutlined className="text-slate-400 mr-2" />}
                placeholder="Số điện thoại"
                className={inputClasses}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          validateStatus={errors.password ? "error" : ""}
          help={errors.password?.message}
          className="mb-4!"
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined className="text-slate-400 mr-2" />}
                placeholder="Mật khẩu"
                className={inputClasses}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          validateStatus={errors.confirmPassword ? "error" : ""}
          help={errors.confirmPassword?.message}
          className="mb-8!"
        >
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined className="text-slate-400 mr-2" />}
                placeholder="Nhập lại mật khẩu"
                className={inputClasses}
              />
            )}
          />
        </Form.Item>

        <Form.Item className="mb-0!">
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="rounded-xl font-semibold h-12 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
          >
            Hoàn tất đăng ký
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterForm;
