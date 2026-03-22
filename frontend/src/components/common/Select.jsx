import { Select as AntSelect } from "antd";
import { useState, useEffect } from "react";

const Select = ({
  options,
  value,
  onChange,
  mode,
  searchable = true,
  loading = false,
  placeholder,
  allowClear = true,
  onSearch,
  onLoadMore,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (val) => {
    setSearchValue(val);
    if (onSearch) onSearch(val);
  };

  const handlePopupScroll = (e) => {
    const { target } = e;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      if (onLoadMore) onLoadMore();
    }
  };

  return (
    <AntSelect
      showSearch={searchable}
      options={options}
      value={value}
      onChange={onChange}
      mode={mode}
      loading={loading}
      placeholder={placeholder}
      allowClear={allowClear}
      onSearch={handleSearch}
      onPopupScroll={handlePopupScroll}
      filterOption={false} // Tắt filter mặc định để dùng onSearch
      {...props}
    />
  );
};

export default Select;
