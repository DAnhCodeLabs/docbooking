import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const DatePickerRange = ({
  value,
  onChange,
  allowClear = true,
  disabledDate,
  ranges,
  ...props
}) => {
  return (
    <RangePicker
      value={value}
      onChange={onChange}
      allowClear={allowClear}
      disabledDate={disabledDate}
      ranges={ranges}
      format="DD/MM/YYYY"
      {...props}
    />
  );
};

export default DatePickerRange;
