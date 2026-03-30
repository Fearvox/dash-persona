"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FileDropZone, { type FileParseResult } from "@/components/file-drop-zone";
import CDPSetupGuide from "@/components/cdp-setup-guide";
import { parseFileContent, parseXlsxRaw, mergeXlsxResults, type XlsxParseResult } from "@/lib/adapters/file-import-adapter";
import type { CreatorProfile } from "@/lib/schema/creator-data";
import { saveProfiles } from "@/lib/store/profile-store";
import { t } from "@/lib/i18n";

type PlatformEntry = {
  id: string;
  url: string;
  platform: string | null;
};

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("douyin.com") || lower.includes("v.douyin"))
    return "Douyin";
  if (lower.includes("tiktok.com") || lower.includes("vm.tiktok"))
    return "TikTok";
  if (
    lower.includes("xiaohongshu.com") ||
    lower.includes("xhslink.com") ||
    lower.includes("xhs.com")
  )
    return "Red Note";
  return null;
}

const platformBadgeColor: Record<string, string> = {
  Douyin: "badge-red",
  TikTok: "badge-green",
  "Red Note": "badge-yellow",
};

/** Merge two profiles for the same platform: combine posts (deduplicate by desc),
 *  keep the newer profile metadata, prefer the one with more followers. */
function mergeProfile(
  existing: CreatorProfile | undefined,
  incoming: CreatorProfile,
): CreatorProfile {
  if (!existing) return incoming;
  if (incoming.posts.length === 0) return existing;

  // Deduplicate posts by desc (title) — keep incoming version if duplicate
  const seen = new Set<string>();
  const mergedPosts = [];
  for (const p of incoming.posts) {
    seen.add(p.desc);
    mergedPosts.push(p);
  }
  for (const p of existing.posts) {
    if (!seen.has(p.desc)) {
      mergedPosts.push(p);
    }
  }

  return {
    ...existing,
    ...incoming,
    profile: {
      ...existing.profile,
      ...incoming.profile,
      // Keep the larger follower count (CDP is usually more accurate)
      followers: Math.max(existing.profile.followers, incoming.profile.followers),
      likesTotal: Math.max(existing.profile.likesTotal, incoming.profile.likesTotal),
      videosCount: mergedPosts.length,
    },
    posts: mergedPosts,
    // Preserve history from either source
    history: [...(existing.history ?? []), ...(incoming.history ?? [])],
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"import" | "url" | "browser">("import");
  const [entries, setEntries] = useState<PlatformEntry[]>([
    { id: crypto.randomUUID(), url: "", platform: null },
  ]);
  const [importResults, setImportResults] = useState<FileParseResult[]>([]);
  const [xlsxResults, setXlsxResults] = useState<XlsxParseResult[]>([]);
  const [jsonProfiles, setJsonProfiles] = useState<CreatorProfile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute merged profiles per platform from all uploaded files
  const douyinResults = xlsxResults.filter((r) => !r.schema.startsWith("tiktok_"));
  const tiktokResults = xlsxResults.filter((r) => r.schema.startsWith("tiktok_"));
  const mergedProfiles: CreatorProfile[] = [];
  if (douyinResults.length > 0) mergedProfiles.push(mergeXlsxResults(douyinResults));
  if (tiktokResults.length > 0) mergedProfiles.push(mergeXlsxResults(tiktokResults));
  const hasData = mergedProfiles.length > 0 || jsonProfiles.length > 0;
  const totalPosts = mergedProfiles.reduce((s, p) => s + p.posts.length, 0) + jsonProfiles.reduce((s, p) => s + p.posts.length, 0);
  const totalHistory = mergedProfiles.reduce((s, p) => s + (p.history?.length ?? 0), 0);
  const schemaTypes = [...new Set(xlsxResults.map((r) => r.schema))];

  async function handleFilesSelected(files: File[]) {
    setIsProcessing(true);
    const newResults: FileParseResult[] = [];
    const newXlsx: XlsxParseResult[] = [];
    const newJson: CreatorProfile[] = [];

    for (const file of files) {
      try {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

        if (ext === ".xlsx" || ext === ".xls") {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
          const base64 = btoa(binary);
          const result = parseXlsxRaw(base64, file.name);
          newXlsx.push(result);

          const label = result.schema === "post_list" ? t("ui.onboarding.schemaPostList")
            : result.schema === "post_analysis" ? t("ui.onboarding.schemaPostAnalysis")
            : result.schema === "aggregate" ? t("ui.onboarding.schemaAggregate")
            : result.schema === "timeseries" ? t("ui.onboarding.schemaTimeseries")
            : t("ui.onboarding.schemaGeneric");
          const count = result.posts?.length ?? result.history?.length ?? 1;
          newResults.push({ fileName: file.name, status: "success", profileCount: count, error: label });
        } else {
          const content = await file.text();
          const profiles = await parseFileContent(content, file.name);
          newJson.push(...profiles);
          newResults.push({ fileName: file.name, status: "success", profileCount: profiles.length });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        newResults.push({ fileName: file.name, status: "error", error: message });
      }
    }

    setImportResults((prev) => [...prev, ...newResults]);
    setXlsxResults((prev) => [...prev, ...newXlsx]);
    setJsonProfiles((prev) => [...prev, ...newJson]);
    setIsProcessing(false);
  }

  function handleLaunchImport() {
    if (!hasData) return;

    // Merge with existing data (preserve CDP-collected profiles)
    const existingRaw = sessionStorage.getItem("dashpersona-import-profiles");
    const profilesMap: Record<string, CreatorProfile> = existingRaw
      ? JSON.parse(existingRaw)
      : {};
    for (const mp of mergedProfiles) {
      const key = mp.platform || "unknown";
      profilesMap[key] = mergeProfile(profilesMap[key], mp);
    }
    for (const p of jsonProfiles) {
      let key = p.platform;
      if (key === "unknown") {
        const idx = Object.keys(profilesMap).filter((k) => k.startsWith("unknown")).length;
        key = idx === 0 ? "unknown" : `unknown-${idx}`;
      }
      profilesMap[key] = mergeProfile(profilesMap[key], p);
    }

    sessionStorage.setItem("dashpersona-import-profiles", JSON.stringify(profilesMap));
    saveProfiles(profilesMap); // Persist to IndexedDB
    router.push("/dashboard?source=import");
  }

  function updateEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
    index: number,
    value: string,
  ) {
    const updated = list.map((entry, i) =>
      i === index
        ? { ...entry, url: value, platform: value.length > 8 ? detectPlatform(value) : null }
        : entry,
    );
    setter(updated);
  }

  function addEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
  ) {
    setter([...list, { id: crypto.randomUUID(), url: "", platform: null }]);
  }

  function removeEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
    index: number,
  ) {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  }

  const hasTikTok = entries.some((e) => e.platform === "TikTok");
  const hasNonTikTok = entries.some(
    (e) => e.platform !== null && e.platform !== "TikTok",
  );
  const hasValidEntry = hasTikTok;

  function handleLaunchUrl() {
    if (!hasValidEntry) return;
    const firstValidUrl = entries.find((e) => e.platform !== null)?.url;
    if (firstValidUrl) {
      router.push(
        `/dashboard?source=live&url=${encodeURIComponent(firstValidUrl)}`,
      );
    } else {
      router.push("/dashboard?source=live");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-lg">
        {/* Single-step progress indicator */}
        <div
          className="mb-10 flex items-center gap-3"
          role="progressbar"
          aria-valuenow={1}
          aria-valuemin={1}
          aria-valuemax={1}
          aria-label={t("ui.onboarding.step", { step: 1 })}
        >
          <div
            className="h-1 flex-1 rounded-full bg-[var(--accent-green)]"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("ui.onboarding.connectAccounts")}
          </h1>
          <p
            className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
          >
            {t("ui.onboarding.connectDesc")}
          </p>

          {/* Mode toggle */}
          <div
            className="mt-6 flex rounded-lg bg-[var(--bg-card)] p-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "import"}
              onClick={() => setMode("import")}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                mode === "import"
                  ? "bg-[var(--accent-green)] text-[var(--bg-primary)]"
                  : "bg-transparent text-[var(--text-secondary)]"
              }`}
            >
              {t("ui.onboarding.importFiles")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "url"}
              onClick={() => setMode("url")}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                mode === "url"
                  ? "bg-[var(--accent-green)] text-[var(--bg-primary)]"
                  : "bg-transparent text-[var(--text-secondary)]"
              }`}
            >
              {t("ui.onboarding.pasteUrl")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "browser"}
              onClick={() => setMode("browser")}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                mode === "browser"
                  ? "bg-[var(--accent-green)] text-[var(--bg-primary)]"
                  : "bg-transparent text-[var(--text-secondary)]"
              }`}
            >
              {t("ui.onboarding.autoCollect")}
            </button>
          </div>

          {/* File import mode */}
          {mode === "import" && (
            <div className="mt-8">
              {/* Export guide — teach users how to get the data */}
              <div className="mb-6 rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.06)] px-4 py-3">
                <p className="text-xs font-semibold text-[var(--accent-yellow)]">
                  {t("ui.onboarding.exportGuideTitle")}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <div className="text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{t("ui.onboarding.douyinExport")}</strong> —
                    Open <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.65rem] text-[var(--text-primary)]">creator.douyin.com</code>:
                    <ol className="mt-1 ml-3 flex flex-col gap-0.5 text-[var(--text-subtle)]">
                      <li>{t("ui.onboarding.douyinStep1")}</li>
                      <li>{t("ui.onboarding.douyinStep2")}</li>
                    </ol>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{t("ui.onboarding.tiktokExport")}</strong> —
                    Open <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.65rem] text-[var(--text-primary)]">tiktok.com/tiktokstudio/analytics</code>:
                    <ol className="mt-1 ml-3 flex flex-col gap-0.5 text-[var(--text-subtle)]">
                      <li>{t("ui.onboarding.tiktokStep1")}</li>
                      <li>{t("ui.onboarding.tiktokStep2")}</li>
                      <li>{t("ui.onboarding.tiktokStep3")}</li>
                      <li>{t("ui.onboarding.tiktokStep4")}</li>
                    </ol>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{t("ui.onboarding.redNoteExport")}</strong> —{" "}
                    {t("ui.onboarding.redNoteStep")}
                  </div>
                </div>
                <p className="mt-2 text-[0.65rem] text-[var(--text-subtle)]">
                  {t("ui.onboarding.exportMoreData")}
                </p>
              </div>

              <FileDropZone
                onFilesSelected={handleFilesSelected}
                results={importResults}
                isProcessing={isProcessing}
              />
              {hasData && (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="rounded-lg bg-[var(--bg-card)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {t("ui.onboarding.mergePreview")}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                      {totalPosts > 0 && <span>{t("ui.onboarding.postsCount", { count: totalPosts })}</span>}
                      {totalHistory > 0 && <span>{t("ui.onboarding.dailySnapshots", { count: totalHistory })}</span>}
                      {schemaTypes.map((s) => (
                        <span key={s} className="rounded bg-[rgba(126,210,154,0.1)] px-1.5 py-0.5 text-[var(--accent-green)]">
                          {s === "post_list" ? t("ui.onboarding.schemaPostList") : s === "post_analysis" ? t("ui.onboarding.schemaPostAnalysis") : s === "aggregate" ? t("ui.onboarding.schemaAggregate") : s === "timeseries" ? t("ui.onboarding.schemaTimeseries") : s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t("ui.onboarding.readyToAnalyze")}
                  </p>
                  <button
                    type="button"
                    onClick={handleLaunchImport}
                    className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors bg-[var(--accent-green)] text-[var(--bg-primary)]"
                  >
                    {t("ui.common.launchDashboard")}
                  </button>
                </div>
                </div>
              )}
            </div>
          )}

          {/* URL paste mode */}
          {mode === "url" && (
            <>
          <p
            className="mt-4 rounded-md px-3 py-2 text-xs leading-5 bg-[rgba(210,_200,_126,_0.08)] text-[var(--accent-yellow)] border border-[rgba(210,_200,_126,_0.15)]"
          >
            {t("ui.onboarding.tiktokSupported")}
          </p>

          <fieldset className="mt-8 flex flex-col gap-4">
            <legend className="sr-only">{t("ui.onboarding.profileUrls")}</legend>
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <label
                    htmlFor={`url-${index}`}
                    className="sr-only"
                  >
                    {t("ui.onboarding.profileUrl", { index: index + 1 })}
                  </label>
                  <input
                    id={`url-${index}`}
                    type="url"
                    placeholder="https://www.tiktok.com/@username"
                    value={entry.url}
                    onChange={(e) =>
                      updateEntry(entries, setEntries, index, e.target.value)
                    }
                    className="h-12 w-full rounded-lg border border-[var(--border-medium)] bg-transparent px-4 pr-28 text-sm outline-none transition-colors focus:border-[var(--accent-green)] text-[var(--text-primary)]"
                  />
                  {/* Gradient fade overlay to prevent text/badge overlap */}
                  <div
                    className="pointer-events-none absolute inset-y-[1px] right-[1px] w-28 rounded-r-lg bg-[linear-gradient(to_right,_rgba(10,15,13,0)_0%,_rgba(10,15,13,0.15)_15%,_rgba(10,15,13,0.25)_30%,_rgba(10,15,13,0.50)_50%,_rgba(10,15,13,0.85)_85%,_rgba(10,15,13,1)_100%)] transition-opacity duration-200"
                    style={{
                      opacity: entry.url.length > 30 ? 1 : 0,
                    }}
                  />
                  {entry.platform && (
                    <span
                      className={`badge ${platformBadgeColor[entry.platform] ?? ""} absolute right-3 top-1/2 -translate-y-1/2`}
                    >
                      {entry.platform}
                    </span>
                  )}
                </div>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entries, setEntries, index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5 text-[var(--text-subtle)]"
                    aria-label={t("ui.onboarding.removeUrl", { index: index + 1 })}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </fieldset>

          {hasNonTikTok && (
            <p
              className="mt-3 text-xs text-[var(--accent-red)]"
            >
              {t("ui.onboarding.douyinRedNoteNotSupported")}
            </p>
          )}

          <button
            type="button"
            onClick={() => addEntry(entries, setEntries)}
            className="mt-4 text-sm font-medium transition-colors hover:opacity-80 text-[var(--accent-green)]"
          >
            {t("ui.onboarding.addPlatform")}
          </button>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <Link
                href="/dashboard?source=demo&persona=tutorial"
                className="text-sm font-medium transition-colors hover:opacity-80 text-[var(--text-subtle)]"
              >
                {t("ui.onboarding.skipDemo")}
              </Link>
              <Link
                href="/dashboard?source=extension"
                className="text-sm font-medium transition-colors hover:opacity-80 text-[var(--accent-blue)]"
              >
                {t("ui.onboarding.useExtension")}
              </Link>
            </div>
            <button
              type="button"
              onClick={handleLaunchUrl}
              disabled={!hasValidEntry}
              className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors disabled:opacity-40 bg-[var(--accent-green)] text-[var(--bg-primary)]"
            >
              {t("ui.common.launchDashboard")}
            </button>
          </div>
            </>
          )}

          {/* CDP auto collect mode */}
          {mode === "browser" && (
            <CDPSetupGuide />
          )}
        </div>
      </div>
    </div>
  );
}
