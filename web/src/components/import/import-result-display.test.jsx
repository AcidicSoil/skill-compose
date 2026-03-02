import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }) => <span>{children}</span>,
}), { virtual: true });

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }) => <button type="button">{children}</button>,
}), { virtual: true });

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}:${params.count}`;
      if (params?.files !== undefined) return `${key}:${params.files}`;
      return key;
    },
  }),
}), { virtual: true });

import * as display from "./import-result-display";

describe("import-result-display", () => {
  it("detects bulk import responses by results array", () => {
    expect(typeof display.isBulkImportResult).toBe("function");
    expect(
      display.isBulkImportResult({
        results: [],
        total_imported: 1,
        total_skipped: 0,
        total_failed: 0,
      })
    ).toBe(true);
    expect(
      display.isBulkImportResult({
        success: true,
        skill_name: "alpha",
        version: "0.0.1",
        message: "ok",
      })
    ).toBe(false);
  });

  it("renders localized bulk import summary and per-skill messages", () => {
    const markup = renderToStaticMarkup(
      <display.BulkImportSuccessDisplay
        result={{
          results: [
            {
              success: true,
              skill_name: "alpha",
              version: "0.1.0",
              message: "Imported alpha",
              status: "imported",
            },
            {
              success: false,
              skill_name: "beta",
              version: "",
              message: "Skipped beta",
              status: "skipped",
            },
            {
              success: false,
              skill_name: "gamma",
              version: "",
              message: "Failed gamma",
              status: "failed",
            },
          ],
          total_imported: 1,
          total_skipped: 1,
          total_failed: 1,
        }}
      />
    );

    expect(markup).toContain("status.bulkImported:1");
    expect(markup).toContain("status.bulkSkipped:1");
    expect(markup).toContain("status.bulkFailed:1");
    expect(markup).toContain("status.resultImported");
    expect(markup).toContain("status.resultSkipped");
    expect(markup).toContain("status.resultFailed");
    expect(markup).toContain("alpha");
    expect(markup).toContain("beta");
    expect(markup).toContain("gamma");
    expect(markup).toContain("Imported alpha");
    expect(markup).toContain("Skipped beta");
    expect(markup).toContain("Failed gamma");
  });
});
