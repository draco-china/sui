"use client";

import {
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import type { ExampleProps } from "../types";

type Invoice = {
  id: string;
  customer: string;
  status: "paid" | "open" | "void";
  total: number;
  tax: number;
  quantity: number;
  issuedAt: string;
  updatedAt: string;
  sent: boolean;
};

const invoices: Invoice[] = [
  {
    id: "INV-1001",
    customer: "Northwind",
    status: "paid",
    total: 12840.5,
    tax: 13,
    quantity: 18,
    issuedAt: "2026-03-02",
    updatedAt: "2026-03-04T09:30:00Z",
    sent: true,
  },
  {
    id: "INV-1002",
    customer: "Contoso",
    status: "open",
    total: 5420,
    tax: 6,
    quantity: 4,
    issuedAt: "2026-03-11",
    updatedAt: "2026-03-12T16:05:00Z",
    sent: true,
  },
  {
    id: "INV-1003",
    customer: "Fabrikam",
    status: "void",
    total: 980.25,
    tax: 0,
    quantity: 1,
    issuedAt: "2026-04-01",
    updatedAt: "2026-04-01T08:12:00Z",
    sent: false,
  },
];

export default function DataTableValueTypes({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo<DataTableColumn<Invoice>[]>(
    () => [
      { key: "id", title: zh ? "编号" : "Invoice", copyable: true },
      { key: "customer", title: zh ? "客户" : "Customer", valueType: "text" },
      {
        key: "status",
        title: zh ? "状态" : "Status",
        valueEnum: [
          { value: "paid", label: zh ? "已付款" : "Paid" },
          { value: "open", label: zh ? "待付款" : "Open", color: "outline" },
          {
            value: "void",
            label: zh ? "已作废" : "Void",
            color: "destructive",
          },
        ],
        filter: false,
      },
      {
        key: "total",
        title: zh ? "金额" : "Total",
        valueType: "money",
        format: { currency: zh ? "CNY" : "USD" },
        align: "end",
      },
      {
        key: "tax",
        title: zh ? "税率" : "Tax",
        valueType: "percent",
        align: "end",
      },
      {
        key: "quantity",
        title: zh ? "数量" : "Qty",
        valueType: "number",
        align: "end",
      },
      { key: "issuedAt", title: zh ? "开票日期" : "Issued", valueType: "date" },
      {
        key: "updatedAt",
        title: zh ? "更新时间" : "Updated",
        valueType: "datetime",
        format: { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
      },
      { key: "sent", title: zh ? "已发送" : "Sent", valueType: "boolean" },
    ],
    [zh],
  );
  return (
    <DataTable
      rowKey="id"
      layout="auto"
      pagination={false}
      columns={columns}
      data={invoices}
      labels={zh ? dataTableLabelsZhCN : undefined}
      className="w-full"
    />
  );
}
