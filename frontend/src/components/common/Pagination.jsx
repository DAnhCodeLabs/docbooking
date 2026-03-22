import { Pagination as AntPagination } from "antd";

const Pagination = ({
  current,
  pageSize,
  total,
  onChange,
  onShowSizeChange,
  showSizeChanger = true,
  pageSizeOptions = ["10", "20", "50"],
  ...props
}) => {
  return (
    <AntPagination
      current={current}
      pageSize={pageSize}
      total={total}
      onChange={onChange}
      onShowSizeChange={onShowSizeChange}
      showSizeChanger={showSizeChanger}
      pageSizeOptions={pageSizeOptions}
      showQuickJumper
      showTotal={(total) => `Tổng số ${total} bản ghi`}
      {...props}
    />
  );
};

export default Pagination;
