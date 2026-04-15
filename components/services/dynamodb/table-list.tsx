"use client";

import { useState } from "react";
import { useDynamoDBTables, useDeleteTable } from "@/hooks/use-dynamodb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, Eye, Database, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { DynamoDBTable } from "@/types";
import { CreateTableDialog } from "./create-table-dialog";

interface TableListProps {
  onSelectTable: (tableName: string) => void;
  selectedTable?: string | null;
}

export function TableList({ onSelectTable, selectedTable }: TableListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: tables, isLoading, error } = useDynamoDBTables();
  const deleteTable = useDeleteTable();

  const filteredTables = tables?.filter((table) =>
    table.tableName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { variant: "default" as const, label: "Active" },
      CREATING: { variant: "secondary" as const, label: "Creating" },
      UPDATING: { variant: "secondary" as const, label: "Updating" },
      DELETING: { variant: "destructive" as const, label: "Deleting" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">
          Failed to load tables: {error.message}
        </p>
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No tables found</h3>
        <p className="text-muted-foreground">
          Create your first DynamoDB table to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Table
        </Button>
      </div>
      <CreateTableDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTables?.map((table) => (
              <TableRow
                key={table.tableName}
                className={`cursor-pointer ${
                  selectedTable === table.tableName ? "bg-muted/50" : ""
                }`}
                onClick={() => onSelectTable(table.tableName)}
              >
                <TableCell className="font-medium">{table.tableName}</TableCell>
                <TableCell>{getStatusBadge(table.tableStatus)}</TableCell>
                <TableCell>{table.itemCount.toLocaleString()}</TableCell>
                <TableCell>{formatBytes(table.tableSizeBytes)}</TableCell>
                <TableCell>
                  {table.creationDateTime
                    ? formatDistanceToNow(new Date(table.creationDateTime), {
                        addSuffix: true,
                      })
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTable(table.tableName);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deleteTable.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Table</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the table "
                            {table.tableName}"? This action cannot be undone and
                            all items in the table will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTable.mutate(table.tableName)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
