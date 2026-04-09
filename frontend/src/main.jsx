import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import ReactDOM from "react-dom/client";
// Import các plugin
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
// Import CSS của Ant Design (bắt buộc)

import "./index.css";

import App from "./App";
import { date } from "zod";

// Mở rộng dayjs với các plugin
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(advancedFormat);

// Cấu hình dayjs locale tiếng Việt
dayjs.locale("vi");
dayjs(date).utc().format("DD/MM/YYYY");

// Cấu hình theme Ant Design
const theme = {
  token: {
    borderRadius: 24,
    fontFamily: "'Inter', sans-serif",
    controlHeight: 38,
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConfigProvider locale={viVN} theme={theme} componentSize="middle">
    <App />
  </ConfigProvider>,
);
