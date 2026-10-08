import { LongText } from "@workspace/ui/components/long-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { ExampleProps } from "../types";

export default function LongTextTable({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">ID</TableHead>
          <TableHead>{zh ? "名称" : "Name"}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {["sui", "production-api-gateway.asia-east-1.example.com"].map(
          (name, index) => (
            <TableRow key={name}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <LongText label={zh ? "显示完整名称" : "Show full name"}>
                  {name}
                </LongText>
              </TableCell>
            </TableRow>
          ),
        )}
      </TableBody>
    </Table>
  );
}
