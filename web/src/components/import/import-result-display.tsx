"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";

export interface ImportResult {
  success: boolean;
  skill_name: string;
  version: string;
  message: string;
  conflict?: boolean;
  existing_skill?: string;
  existing_version?: string;
  skipped_files?: string[];
}

export interface BulkImportResultItem {
  success: boolean;
  skill_name: string;
  version: string;
  message: string;
  status: string;
  conflict?: boolean;
  existing_skill?: string;
  existing_version?: string;
  skipped_files?: string[];
}

export interface BulkImportResult {
  results: BulkImportResultItem[];
  total_imported: number;
  total_skipped: number;
  total_failed: number;
}

export function isBulkImportResult(
  result: ImportResult | BulkImportResult | null | undefined
): result is BulkImportResult {
  return !!result && Array.isArray((result as BulkImportResult).results);
}

export function ImportErrorDisplay({ error }: { error: string }) {
  const { t } = useTranslation("import");

  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800">
      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-red-800 dark:text-red-200">{t("status.importFailed")}</p>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    </div>
  );
}

export function ImportSuccessDisplay({ result }: { result: ImportResult }) {
  const router = useRouter();
  const { t } = useTranslation("import");

  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-green-800 dark:text-green-200">{t("status.importSuccess")}</p>
        <p className="text-sm text-green-600 mt-1 dark:text-green-400">{result.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline-success">{result.skill_name}</Badge>
          <Badge variant="outline-info">v{result.version}</Badge>
        </div>
        {result.skipped_files && result.skipped_files.length > 0 && (
          <div className="flex items-start gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm dark:bg-amber-950 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-amber-700 dark:text-amber-300">
              <p>{t("status.skippedFiles", { count: result.skipped_files.length })}</p>
              <p className="text-xs mt-1 opacity-80">
                {t("status.skippedFilesList", { files: result.skipped_files.join(", ") })}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="link"
          className="p-0 h-auto mt-2 text-green-700"
          onClick={() => router.push(`/skills/${result.skill_name}`)}
        >
          {t("status.viewSkill")}
        </Button>
      </div>
    </div>
  );
}

export function BulkImportSuccessDisplay({ result }: { result: BulkImportResult }) {
  const { t } = useTranslation("import");

  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-3">
        <p className="font-medium text-green-800 dark:text-green-200">{t("status.importSuccess")}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline-success">{t("status.bulkImported", { count: result.total_imported })}</Badge>
          <Badge variant="outline-warning">{t("status.bulkSkipped", { count: result.total_skipped })}</Badge>
          <Badge variant="outline-error">{t("status.bulkFailed", { count: result.total_failed })}</Badge>
        </div>
        <div className="space-y-2">
          {result.results.map((item, index) => (
            <div
              key={`${item.skill_name}-${item.status}-${index}`}
              className="flex items-start justify-between gap-3 rounded border border-border/60 bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium break-words">{item.skill_name}</p>
                <p className="text-sm text-muted-foreground break-words">{item.message}</p>
              </div>
              <Badge
                variant={
                  item.status === "imported"
                    ? "outline-success"
                    : item.status === "failed"
                      ? "outline-error"
                      : item.status === "conflict"
                        ? "outline-warning"
                        : "outline-info"
                }
              >
                {item.status === "imported"
                  ? t("status.resultImported")
                  : item.status === "failed"
                    ? t("status.resultFailed")
                    : item.status === "conflict"
                      ? t("status.resultConflict")
                      : item.status === "skipped"
                        ? t("status.resultSkipped")
                        : item.status === "ready"
                          ? t("status.resultReady")
                          : item.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
