"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ColumnDef {
  key: string;
  header: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface RegistrationTableProps {
  columns: ColumnDef[];
  data: Record<string, unknown>[];
  emptyMessage?: string;
  /**
   * Optional per-row actions rendered in a trailing column (e.g. a "View" link
   * or lifecycle buttons). When omitted, no actions column is rendered so that
   * existing usages remain unchanged.
   */
  actions?: (row: Record<string, unknown>) => React.ReactNode;
  /** Header label for the trailing actions column. */
  actionsHeader?: string;
}

export function RegistrationTable({
  columns,
  data,
  emptyMessage = "No matching records found",
  actions,
  actionsHeader = "Actions",
}: RegistrationTableProps) {
  if (data.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.header}</TableHead>
          ))}
          {actions && <TableHead>{actionsHeader}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow key={(row.id as string) || index}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? "")}
              </TableCell>
            ))}
            {actions && <TableCell>{actions(row)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
