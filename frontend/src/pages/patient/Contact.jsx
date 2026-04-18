import React from 'react';
import { Form, Input, Button } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';

const ContactPage = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log('Dữ liệu đăng ký:', values);
    // Xử lý API gửi dữ liệu tại đây
  };

  return (
    <section className="bg-[#f2f6f9] min-h-screen py-12 px-4 md:py-20 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Tiêu đề trang */}
        <div className="text-center mb-10 md:mb-16 px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-[#00b5f1] mb-4">
            Hợp tác với chúng tôi
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-4xl mx-auto leading-relaxed">
            Medpro rất hân hạnh được hợp tác cùng với các cơ sở y tế, các quý
            bác sĩ để tiếp cận đến hàng triệu bệnh nhân trên nền tảng Medpro.
            Đặc biệt với chính sách chia sẻ doanh thu hấp dẫn khi trở thành Cộng
            Tác Viên phát triển mạng lưới cơ sở y tế.
          </p>
        </div>

        {/* Box chứa Nội dung chính (Form & Info) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Cột trái: Thông tin liên hệ */}
            <div className="w-full md:w-5/12 bg-[#fafbfc] p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-8 border-b border-gray-200 pb-3">
                Thông tin chi tiết
              </h3>

              <div className="flex flex-col gap-8">
                {/* Item 1: Địa chỉ */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    {/* <BuildingOutlined className="text-[#00b5f1] text-xl" /> */}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#00558f] text-base mb-1">
                      MEDPRO - ĐẶT LỊCH KHÁM BỆNH
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      236/29/18 Điện Biên Phủ - Phường 17 -<br />
                      Quận Bình Thạnh - TPHCM.
                    </p>
                  </div>
                </div>

                {/* Item 2: Liên hệ */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <CustomerServiceOutlined className="text-[#00b5f1] text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#00558f] text-base mb-1">
                      LIÊN HỆ TƯ VẤN
                    </h4>
                    <p className="text-gray-600 text-sm">
                      <a
                        href="tel:0984448419"
                        className="text-[#00b5f1] font-medium hover:underline"
                      >
                        0984448419
                      </a>{' '}
                      (Bộ phận Kinh doanh)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Form nhập liệu */}
            <div className="w-full md:w-7/12 p-8 md:p-12">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false} // Tắt dấu sao mặc định để tự custom lại cho đẹp
              >
                {/* Họ và tên */}
                <Form.Item
                  name="fullName"
                  label={
                    <span className="font-medium text-gray-700 text-sm">
                      Họ và tên <span className="text-red-500 ml-1">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ và tên!' },
                  ]}
                  className="mb-5!"
                >
                  <Input
                    placeholder="Nhập họ và tên"
                    className="h-11! rounded-lg! border-gray-300! hover:border-[#00b5f1]! focus:border-[#00b5f1]! focus:shadow-[0_0_0_2px_rgba(0,181,241,0.1)]! text-base!"
                  />
                </Form.Item>

                {/* Email */}
                <Form.Item
                  name="email"
                  label={
                    <span className="font-medium text-gray-700 text-sm">
                      Email <span className="text-red-500 ml-1">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không hợp lệ!' },
                  ]}
                  className="mb-5!"
                >
                  <Input
                    placeholder="Nhập email"
                    className="h-11! rounded-lg! border-gray-300! hover:border-[#00b5f1]! focus:border-[#00b5f1]! focus:shadow-[0_0_0_2px_rgba(0,181,241,0.1)]! text-base!"
                  />
                </Form.Item>

                {/* Số điện thoại */}
                <Form.Item
                  name="phone"
                  label={
                    <span className="font-medium text-gray-700 text-sm">
                      Số điện thoại <span className="text-red-500 ml-1">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại!' },
                    {
                      pattern: /^[0-9]{10}$/,
                      message: 'Số điện thoại phải gồm 10 chữ số!',
                    },
                  ]}
                  className="mb-5!"
                >
                  <Input
                    placeholder="Nhập số điện thoại"
                    className="h-11! rounded-lg! border-gray-300! hover:border-[#00b5f1]! focus:border-[#00b5f1]! focus:shadow-[0_0_0_2px_rgba(0,181,241,0.1)]! text-base!"
                  />
                </Form.Item>

                {/* Ghi chú */}
                <Form.Item
                  name="notes"
                  label={
                    <span className="font-medium text-gray-700 text-sm">
                      Ghi chú <span className="text-red-500 ml-1">*</span>
                    </span>
                  }
                  rules={[
                    { required: true, message: 'Vui lòng nhập ghi chú!' },
                  ]}
                  className="mb-6!"
                >
                  <Input.TextArea
                    placeholder="Nhập ghi chú của bạn"
                    rows={4}
                    className="rounded-lg! border-gray-300! hover:border-[#00b5f1]! focus:border-[#00b5f1]! focus:shadow-[0_0_0_2px_rgba(0,181,241,0.1)]! text-base! py-3!"
                  />
                </Form.Item>

                {/* Nút Submit */}
                <div className="flex justify-end mt-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="bg-[#00b5f1]! hover:bg-[#009ad4]! active:bg-[#0082b5]! border-none! h-11! px-8! rounded-lg! font-semibold! text-base! shadow-md! transition-all!"
                  >
                    Đăng ký ngay
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactPage;
