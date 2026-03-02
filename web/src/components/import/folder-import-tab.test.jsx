import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Upload: () => null,
  Folder: () => null,
  FolderOpen: () => null,
}), { virtual: true });

vi.mock("@/components/ui/button", () => ({
  Button: () => null,
}), { virtual: true });

vi.mock("@/components/ui/card", () => ({
  Card: () => null,
  CardContent: () => null,
  CardHeader: () => null,
  CardTitle: () => null,
  CardDescription: () => null,
}), { virtual: true });

vi.mock("@/components/ui/spinner", () => ({
  Spinner: () => null,
}), { virtual: true });

vi.mock("@/components/ui/select", () => ({
  Select: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}), { virtual: true });

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: (key) => key }),
}), { virtual: true });

vi.mock("./import-result-display", () => ({
  BulkImportSuccessDisplay: () => null,
  ImportErrorDisplay: () => null,
  ImportSuccessDisplay: () => null,
  isBulkImportResult: () => false,
}), { virtual: true });

import {
  detectFolderImportMode,
  getFolderImportEndpoint,
  shouldPreflightFolderImport,
} from "./folder-import-tab";

function makeFile(name) {
  return new File(["content"], name, { type: "text/plain" });
}

describe("folder-import-tab helpers", () => {
  it("detects single, multi, and invalid mixed folder layouts", () => {
    expect(
      detectFolderImportMode([
        makeFile("parent/SKILL.md"),
        makeFile("parent/scripts/run.py"),
      ])
    ).toBe("single");

    expect(
      detectFolderImportMode([
        makeFile("parent/skill-a/SKILL.md"),
        makeFile("parent/skill-b/SKILL.md"),
      ])
    ).toBe("multi");

    expect(
      detectFolderImportMode([
        makeFile("skill-a/SKILL.md"),
        makeFile("skill-b/SKILL.md"),
      ])
    ).toBe("multi");

    expect(
      detectFolderImportMode([
        makeFile("parent/SKILL.md"),
        makeFile("parent/skill-a/SKILL.md"),
      ])
    ).toBe("invalid");
  });

  it("routes folder imports and preflight by detected mode", () => {
    expect(typeof getFolderImportEndpoint).toBe("function");
    expect(typeof shouldPreflightFolderImport).toBe("function");

    expect(getFolderImportEndpoint("single")).toBe("import-folder");
    expect(getFolderImportEndpoint("multi")).toBe("import-directory");
    expect(shouldPreflightFolderImport("single")).toBe(true);
    expect(shouldPreflightFolderImport("multi")).toBe(false);
  });
});
