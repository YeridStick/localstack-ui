"use client";

import { useState } from "react";
import { TableList } from "@/components/services/dynamodb/table-list";
import { TableViewer } from "@/components/services/dynamodb/table-viewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/main-layout";
import { Table2, Database } from "lucide-react";

export default function DynamoDBPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table2 className="h-6 w-6" />
            DynamoDB
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage NoSQL tables and items in your LocalStack environment.
          </p>
        </div>

        <Tabs defaultValue="tables" className="w-full">
          <TabsList>
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>DynamoDB Tables</CardTitle>
                <CardDescription>
                  View and manage your DynamoDB tables. Click on a table to browse and edit items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TableList
                  onSelectTable={setSelectedTable}
                  selectedTable={selectedTable}
                />
              </CardContent>
            </Card>

            {selectedTable && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Table: {selectedTable}
                  </CardTitle>
                  <CardDescription>
                    Browse, add, edit, and delete items in this table.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TableViewer
                    tableName={selectedTable}
                    onBack={() => setSelectedTable(null)}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
