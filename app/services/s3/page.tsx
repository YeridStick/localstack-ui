"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { BucketList } from "@/components/services/s3/bucket-list";
import { CreateBucketDialog } from "@/components/services/s3/create-bucket-dialog";
import { ObjectBrowser } from "@/components/services/s3/object-browser";
import { UploadDialog } from "@/components/services/s3/upload-dialog";
import { CliCommandsPanel } from "@/components/cli-commands-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Database, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function S3Page() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const queryClient = useQueryClient();

  const handleSelectBucket = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setCurrentPrefix("");
  };

  const handleBack = () => {
    setSelectedBucket(null);
    setCurrentPrefix("");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">S3</h1>
            <p className="text-muted-foreground">
              Manage your S3 buckets and objects
            </p>
          </div>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["s3-buckets"] })
            }
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            S3 in LocalStack provides a complete implementation of Amazon S3 for
            local development. You can create buckets, upload objects, and test
            S3 integrations without AWS costs.
          </AlertDescription>
        </Alert>

        {!selectedBucket ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>S3 Buckets</CardTitle>
                  <CardDescription>
                    View and manage your S3 buckets
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateBucketOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bucket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <BucketList onSelectBucket={handleSelectBucket} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Objects in {selectedBucket}</CardTitle>
              <CardDescription>
                Browse and manage objects in this bucket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ObjectBrowser
                bucketName={selectedBucket}
                onBack={handleBack}
                onUploadClick={(prefix) => {
                  setCurrentPrefix(prefix);
                  setUploadOpen(true);
                }}
              />
            </CardContent>
          </Card>
        )}

        <CreateBucketDialog
          open={createBucketOpen}
          onOpenChange={setCreateBucketOpen}
        />

        {selectedBucket && (
          <UploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            bucketName={selectedBucket}
            currentPrefix={currentPrefix}
          />
        )}

        <CliCommandsPanel
          title="Comandos AWS CLI - S3"
          description="Ejemplos de comandos para gestionar buckets y objetos S3 con MiniStack/LocalStack"
          commands={[
            {
              label: "Listar buckets",
              command: "aws s3 ls --endpoint-url http://localhost:4566",
              description: "Muestra todos los buckets S3"
            },
            {
              label: "Crear bucket",
              command: "aws s3 mb s3://mi-bucket --endpoint-url http://localhost:4566",
              description: "Crea un nuevo bucket S3"
            },
            {
              label: "Listar objetos",
              command: "aws s3 ls s3://mi-bucket --endpoint-url http://localhost:4566",
              description: "Lista objetos en un bucket (reemplaza 'mi-bucket')"
            },
            {
              label: "Subir archivo",
              command: "aws s3 cp archivo.txt s3://mi-bucket/ --endpoint-url http://localhost:4566",
              description: "Sube un archivo al bucket S3"
            },
            {
              label: "Descargar archivo",
              command: "aws s3 cp s3://mi-bucket/archivo.txt . --endpoint-url http://localhost:4566",
              description: "Descarga un archivo desde S3"
            },
            {
              label: "Eliminar bucket",
              command: "aws s3 rb s3://mi-bucket --force --endpoint-url http://localhost:4566",
              description: "Elimina un bucket S3 y todo su contenido"
            }
          ]}
        />
      </div>
    </MainLayout>
  );
}
