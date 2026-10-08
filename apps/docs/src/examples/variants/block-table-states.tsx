import {
  DataTable,
  type DataTableColumnDef,
} from "@workspace/ui/blocks/data-table";
import { Button } from "@workspace/ui/components/button";
import { useCallback, useRef, useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type RecordRow = { id: string; name: string };
export default function TableStates({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [fail, setFail] = useState(false);
  const failOnce = useRef(true);
  const request = useCallback(async () => {
    if (failOnce.current) {
      failOnce.current = false;
      throw new Error("Demo request failed");
    }
    return { data: [{ id: "1", name: "Recovered project" }] };
  }, []);
  const columns: DataTableColumnDef<RecordRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: zh ? "名称" : "Name" },
  ];
  return (
    <div className="flex w-full flex-col gap-4">
      <DataTable
        columns={columns}
        loading={{ rows: 3 }}
        labels={zh ? chineseTableLabels : undefined}
        layout="auto"
        pagination={false}
      />
      <Button
        variant="outline"
        className="w-fit"
        onClick={() => {
          failOnce.current = true;
          setFail((value) => !value);
        }}
      >
        {zh ? "切换空状态 / 加载失败" : "Toggle empty / failed request"}
      </Button>
      <DataTable
        key={String(fail)}
        columns={columns}
        data={[]}
        request={fail ? request : undefined}
        layout="auto"
        pagination={false}
        labels={zh ? chineseTableLabels : undefined}
      />
    </div>
  );
}
