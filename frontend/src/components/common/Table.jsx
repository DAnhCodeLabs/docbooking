import { Table as AntTable } from "antd";
import { useState, useEffect } from "react";
import ActionButtons from "./ActionButtons";
import EmptyState from "./EmptyState";

const Table = ({
  dataSource,
  columns,
  rowKey = "id",
  loading = false,
  pagination,
  serverSide = false,
  onChange,
  rowSelection,
  actions,
  exportable = false,
  onExport,
  scroll = { x: "max-content" },
  bordered = true,
  emptyText = "Không có dữ liệu",
  ...props
}) => {
  // Nếu có actions, thêm cột cuối
  const finalColumns = actions
    ? [
        ...columns,
        {
          title: "Thao tác",
          key: "actions",
          width: 150,
          align: "center",
          render: (_, record) => (
            <ActionButtons
              items={actions.map((action) => ({
                ...action,
                onClick: () => action.onClick(record),
              }))}
              size="small"
            />
          ),
        },
      ]
    : columns;

  const handleTableChange = (pagination, filters, sorter) => {
    if (onChange) {
      onChange({ pagination, filters, sorter });
    }
  };

  return (
    <AntTable
      dataSource={dataSource}
      columns={finalColumns}
      rowKey={rowKey}
      loading={loading}
      pagination={
        pagination
          ? {
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng số ${total} bản ghi`,
              ...pagination,
            }
          : false
      }
      onChange={handleTableChange}
      rowSelection={rowSelection}
      scroll={scroll}
      bordered={bordered}
      locale={{
        emptyText: <EmptyState description={emptyText} />,
      }}
      {...props}
    />
  );
};

export default Table;
