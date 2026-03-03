"use client";

import React from "react";
import { Upload, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
<<<<<<< HEAD
import { useTranslation } from "@/i18n/client";
import type { ImportResult } from "./import-result-display";
import { ImportErrorDisplay, ImportSuccessDisplay } from "./import-result-display";
=======
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/client";
import type { BulkImportResult, ImportResult } from "./import-result-display";
import {
  BulkImportSuccessDisplay,
  ImportErrorDisplay,
  ImportSuccessDisplay,
  isBulkImportResult,
} from "./import-result-display";
>>>>>>> feat/spec-tree-plan
import type { ConflictInfo } from "./conflict-dialog";

interface FolderImportTabProps {
  onConflict: (info: ConflictInfo) => void;
  onResolveConflict: (doImport: (action?: string) => Promise<void>) => void;
}

<<<<<<< HEAD
=======
export function detectFolderImportMode(files: File[]): "single" | "multi" | "invalid" {
  const parentMultiSkillNames = new Set<string>();
  const siblingMultiSkillNames = new Set<string>();
  let hasSingleSkillMd = false;

  for (const file of files) {
    const parts = file.name.split("/");

    if (parts.length === 2 && parts[1].toUpperCase() === "SKILL.MD") {
      hasSingleSkillMd = true;
      siblingMultiSkillNames.add(parts[0]);
    }

    if (parts.length === 3 && parts[2].toUpperCase() === "SKILL.MD") {
      parentMultiSkillNames.add(parts[1]);
    }
  }

  const hasParentMulti = parentMultiSkillNames.size > 0;
  const hasSiblingMulti = siblingMultiSkillNames.size > 1;

  if (hasSingleSkillMd && hasParentMulti) return "invalid";
  if (hasParentMulti || hasSiblingMulti) return "multi";
  if (hasSingleSkillMd) return "single";

  return "invalid";
}

export function getFolderImportEndpoint(mode: "single" | "multi") {
  return mode === "multi" ? "import-directory" : "import-folder";
}

export function shouldPreflightFolderImport(mode: "single" | "multi") {
  return mode === "single";
}

>>>>>>> feat/spec-tree-plan
export function FolderImportTab({ onConflict, onResolveConflict }: FolderImportTabProps) {
  const { t } = useTranslation("import");
  const { t: tc } = useTranslation("common");

  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
<<<<<<< HEAD
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<{ name: string; files: File[] } | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  const handleFolderSelect = (folderName: string, files: File[]) => {
    setError(null);
    setResult(null);

    const hasSkillMd = files.some((f) => {
      const parts = f.name.split("/");
      return parts.length === 2 && parts[1].toUpperCase() === "SKILL.MD";
    });

    if (!hasSkillMd) {
=======
  const [result, setResult] = React.useState<ImportResult | BulkImportResult | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<{
    name: string;
    files: File[];
    mode: "single" | "multi";
  } | null>(null);
  const [conflictAction, setConflictAction] = React.useState<"skip" | "copy" | "overwrite">("skip");
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  const detectedSkills = React.useMemo<string[]>(() => {
    if (!selectedFolder || selectedFolder.mode !== "multi") return [];
    const names = new Set<string>();
    for (const file of selectedFolder.files) {
      const parts = file.name.split("/");
      if (parts.length === 3 && parts[2].toUpperCase() === "SKILL.MD") {
        names.add(parts[1]);
      }
    }
    return Array.from(names).sort();
  }, [selectedFolder]);

  const handleFolderSelect = (folderName: string, files: File[]) => {
    setError(null);
    setResult(null);
    setSelectedFolder(null);
    setConflictAction("skip");

    const mode = detectFolderImportMode(files);

    if (mode === "invalid") {
>>>>>>> feat/spec-tree-plan
      setError(t("folder.errors.noSkillMd"));
      return;
    }

<<<<<<< HEAD
    setSelectedFolder({ name: folderName, files });
=======
    setSelectedFolder({ name: folderName, files, mode });
>>>>>>> feat/spec-tree-plan
  };

  const handleFolderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const item = items[0];
    const entry = item.webkitGetAsEntry?.();

    if (!entry) {
      setError(t("folder.errors.cannotRead"));
      return;
    }

    if (!entry.isDirectory) {
      setError(t("folder.errors.notFolder"));
      return;
    }

    const files: File[] = [];
    const folderName = entry.name;

    const readDirectory = async (dirEntry: FileSystemDirectoryEntry, path: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = dirEntry.createReader();
        const readEntries = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve();
              return;
            }
            for (const ent of entries) {
              if (ent.isFile) {
                const fileEntry = ent as FileSystemFileEntry;
                const file = await new Promise<File>((res, rej) => {
                  fileEntry.file(
                    (f) => {
                      const relativePath = path ? `${path}/${f.name}` : f.name;
                      const newFile = new File([f], `${folderName}/${relativePath}`, { type: f.type });
                      res(newFile);
                    },
                    rej
                  );
                });
                files.push(file);
              } else if (ent.isDirectory) {
                const subPath = path ? `${path}/${ent.name}` : ent.name;
                await readDirectory(ent as FileSystemDirectoryEntry, subPath);
              }
            }
            readEntries();
          }, reject);
        };
        readEntries();
      });
    };

    try {
      await readDirectory(entry as FileSystemDirectoryEntry, "");
      handleFolderSelect(folderName, files);
    } catch {
      setError(t("folder.errors.readFailed"));
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstPath = (files[0] as any).webkitRelativePath as string;
    const folderName = firstPath.split("/")[0];

    const fileArray: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      const relativePath = file.webkitRelativePath as string;
      const newFile = new File([file], relativePath, { type: file.type });
      fileArray.push(newFile);
    }

    handleFolderSelect(folderName, fileArray);
  };

<<<<<<< HEAD
  const doImport = async (conflictAction?: string) => {
=======
  const doImport = async (conflictActionOverride?: string) => {
>>>>>>> feat/spec-tree-plan
    if (!selectedFolder) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedFolder.files.forEach((file) => {
        formData.append("files", file);
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:62610";
<<<<<<< HEAD
      const url = conflictAction
        ? `${apiUrl}/api/v1/registry/import-folder?conflict_action=${conflictAction}`
        : `${apiUrl}/api/v1/registry/import-folder`;
=======
      const endpoint = getFolderImportEndpoint(selectedFolder.mode);

      // For multi-mode, always send conflict_action (using the override if provided, else current state).
      // For single-mode, use the override only (set by the conflict dialog resolver).
      let actionParam: string | undefined;
      if (selectedFolder.mode === "multi") {
        actionParam = conflictActionOverride ?? conflictAction;
      } else {
        actionParam = conflictActionOverride;
      }

      const url = actionParam
        ? `${apiUrl}/api/v1/registry/${endpoint}?conflict_action=${actionParam}`
        : `${apiUrl}/api/v1/registry/${endpoint}`;
>>>>>>> feat/spec-tree-plan

      const response = await fetch(url, { method: "POST", body: formData });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        if (typeof detail === "object" && detail.message) throw new Error(detail.message);
        throw new Error(detail || `Import failed: ${response.statusText}`);
      }

<<<<<<< HEAD
      const importResult: ImportResult = await response.json();
=======
      const importResult: ImportResult | BulkImportResult = await response.json();
>>>>>>> feat/spec-tree-plan
      setResult(importResult);
      setSelectedFolder(null);
      if (folderInputRef.current) folderInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.genericError"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFolder) return;
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
<<<<<<< HEAD
=======
      // Multi-mode skips the check-only pre-flight: conflict strategy is chosen
      // upfront via the conflictAction selector, so there's no need for a round-trip.
      if (!shouldPreflightFolderImport(selectedFolder.mode)) {
        await doImport();
        return;
      }

>>>>>>> feat/spec-tree-plan
      const formData = new FormData();
      selectedFolder.files.forEach((file) => {
        formData.append("files", file);
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:62610";
<<<<<<< HEAD

      const checkResponse = await fetch(`${apiUrl}/api/v1/registry/import-folder?check_only=true`, {
=======
      const checkUrl = `${apiUrl}/api/v1/registry/import-folder?check_only=true`;

      const checkResponse = await fetch(checkUrl, {
>>>>>>> feat/spec-tree-plan
        method: "POST",
        body: formData,
      });
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => null);
        throw new Error(errorData?.detail || `Check failed: ${checkResponse.statusText}`);
      }

      const checkResult: ImportResult = await checkResponse.json();
      if (checkResult.conflict) {
        onConflict({
          skillName: checkResult.existing_skill || checkResult.skill_name,
          existingVersion: checkResult.existing_version || "unknown",
          source: "folder",
        });
        onResolveConflict(doImport);
        setIsUploading(false);
        return;
      }

      await doImport();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("status.genericError"));
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFolder(null);
    setError(null);
    setResult(null);
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("folder.title")}</CardTitle>
        <CardDescription>{t("folder.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleFolderDrop}
          onClick={() => !isUploading && folderInputRef.current?.click()}
        >
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in the types
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderInputChange}
            className="hidden"
            disabled={isUploading}
          />
          {selectedFolder ? (
            <div className="space-y-3">
              <FolderOpen className="h-12 w-12 mx-auto text-primary" />
              <div>
                <p className="font-medium">{selectedFolder.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("folder.filesCount", { count: selectedFolder.files.length })}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">{t("folder.dropHere")}</p>
                <p className="text-sm text-muted-foreground">{t("folder.orClickToBrowse")}</p>
              </div>
            </div>
          )}
        </div>

        {error && <ImportErrorDisplay error={error} />}
<<<<<<< HEAD
        {result?.success && <ImportSuccessDisplay result={result} />}
=======
        {result && isBulkImportResult(result) && <BulkImportSuccessDisplay result={result} />}
        {result && !isBulkImportResult(result) && result.success && <ImportSuccessDisplay result={result} />}

        {selectedFolder?.mode === "multi" && !result && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("folder.multi.label")}
              </p>
              <p className="text-sm mt-1">
                {t("folder.multi.detectedSkills", { count: detectedSkills.length })}
              </p>
              <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
                {detectedSkills.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0">
                {t("folder.conflict.label")}
              </label>
              <Select
                value={conflictAction}
                onValueChange={(v) => setConflictAction(v as "skip" | "copy" | "overwrite")}
                disabled={isUploading}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">{t("folder.conflict.skip")}</SelectItem>
                  <SelectItem value="copy">{t("folder.conflict.copy")}</SelectItem>
                  <SelectItem value="overwrite">{t("folder.conflict.overwrite")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
>>>>>>> feat/spec-tree-plan

        <div className="flex gap-3">
          {selectedFolder && !result && (
            <>
              <Button onClick={handleUpload} disabled={isUploading} className="flex-1">
                {isUploading ? (
                  <>
                    <Spinner size="md" className="mr-2 text-white" />
                    {t("status.importing")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("folder.button")}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={isUploading}>
                {tc("actions.cancel")}
              </Button>
            </>
          )}
<<<<<<< HEAD
          {result?.success && (
=======
          {result && (
>>>>>>> feat/spec-tree-plan
            <Button variant="outline" onClick={handleReset} className="flex-1">
              {t("status.importAnother")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
