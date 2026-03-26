"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FileDropZone, { type FileParseResult } from "@/components/file-drop-zone";
import CDPSetupGuide from "@/components/cdp-setup-guide";
import { parseFileContent, parseXlsxRaw, mergeXlsxResults, type XlsxParseResult } from "@/lib/adapters/file-import-adapter";
import type { CreatorProfile } from "@/lib/schema/creator-data";
import { saveProfiles } from "@/lib/store/profile-store";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"import" | "url" | "browser">("import");
  const [entries, setEntries] = useState<PlatformEntry[]>([
    { id: crypto.randomUUID(), url: "", platform: null },
  ]);
  const [benchmarks, setBenchmarks] = useState<PlatformEntry[]>([
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

          const label = result.schema === "post_list" ? "作品列表"
            : result.schema === "post_analysis" ? "投稿分析"
            : result.schema === "aggregate" ? "投稿汇总"
            : result.schema === "timeseries" ? "时间序列"
            : "通用数据";
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

  function handleContinueToStep2() {
    if (!hasValidEntry) return;
    setStep(2);
  }

  function handleFinish() {
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
        {/* Progress indicator */}
        <div
          className="mb-10 flex items-center gap-3"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label={`Step ${step} of 2`}
        >
          <div
            className="h-1 flex-1 rounded-full"
            style={{
              background: "var(--accent-green)",
            }}
          />
          <div
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              background:
                step === 2
                  ? "var(--accent-green)"
                  : "var(--border-subtle)",
            }}
          />
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Connect your accounts
            </h1>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Import your data files or paste a TikTok profile URL to get started.
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
                Import Files
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
                Paste URL
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
                Auto Collect
              </button>
            </div>

            {/* File import mode */}
            {mode === "import" && (
              <div className="mt-8">
                {/* Export guide — teach users how to get the data */}
                <div className="mb-6 rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.06)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--accent-yellow)]">
                    How to export your data from Creator Centers
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Douyin</strong> —
                      Open <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.65rem] text-[var(--text-primary)]">creator.douyin.com</code>:
                      <ol className="mt-1 ml-3 flex flex-col gap-0.5 text-[var(--text-subtle)]">
                        <li>1. Data Center &rarr; Account Overview &rarr; select <strong className="text-[var(--text-secondary)]">Last 30 days</strong> &rarr; click each metric tab &rarr; Export Data</li>
                        <li>2. Data Center &rarr; Content Analysis &rarr; Post List &rarr; click calendar icon &rarr; select <strong className="text-[var(--text-secondary)]">All</strong> (max range) &rarr; Export Data</li>
                      </ol>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">TikTok</strong> —
                      Open <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.65rem] text-[var(--text-primary)]">tiktok.com/tiktokstudio/analytics</code>:
                      <ol className="mt-1 ml-3 flex flex-col gap-0.5 text-[var(--text-subtle)]">
                        <li>1. Overview tab &rarr; Download Data (365 days of views, likes, comments)</li>
                        <li>2. Content tab &rarr; Download Data (per-video metrics)</li>
                        <li>3. Followers tab &rarr; Download Data (follower history, demographics, regions)</li>
                        <li>4. Viewers tab &rarr; Download Data (viewer trends)</li>
                      </ol>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Red Note</strong> —
                      Open <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.65rem] text-[var(--text-primary)]">creator.xiaohongshu.com</code> &rarr; Data Dashboard &rarr; Export Data
                    </div>
                  </div>
                  <p className="mt-2 text-[0.65rem] text-[var(--text-subtle)]">
                    Export as much data as possible — more data means more accurate analysis.
                    Select the maximum date range available for the best results.
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
                        Merge preview
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                        {totalPosts > 0 && <span>{totalPosts} posts</span>}
                        {totalHistory > 0 && <span>{totalHistory} daily snapshots</span>}
                        {schemaTypes.map((t) => (
                          <span key={t} className="rounded bg-[rgba(126,210,154,0.1)] px-1.5 py-0.5 text-[var(--accent-green)]">
                            {t === "post_list" ? "作品列表" : t === "post_analysis" ? "投稿分析" : t === "aggregate" ? "投稿汇总" : t === "timeseries" ? "时间序列" : t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ready to analyze
                    </p>
                    <button
                      type="button"
                      onClick={handleLaunchImport}
                      className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
                      style={{
                        background: "var(--accent-green)",
                        color: "var(--bg-primary)",
                      }}
                    >
                      Launch Dashboard
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
              className="mt-4 rounded-md px-3 py-2 text-xs leading-5"
              style={{
                background: "rgba(210, 200, 126, 0.08)",
                color: "var(--accent-yellow)",
                border: "1px solid rgba(210, 200, 126, 0.15)",
              }}
            >
              TikTok is supported via URL paste. For Douyin, install the
              Data Passport browser extension for one-click data capture.
              Red Note support is coming soon.
            </p>

            <fieldset className="mt-8 flex flex-col gap-4">
              <legend className="sr-only">Profile URLs</legend>
              {entries.map((entry, index) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <label
                      htmlFor={`url-${index}`}
                      className="sr-only"
                    >
                      Profile URL {index + 1}
                    </label>
                    <input
                      id={`url-${index}`}
                      type="url"
                      placeholder="https://www.tiktok.com/@username"
                      value={entry.url}
                      onChange={(e) =>
                        updateEntry(entries, setEntries, index, e.target.value)
                      }
                      className="h-12 w-full rounded-lg border bg-transparent px-4 pr-28 text-sm outline-none transition-colors focus:border-[var(--accent-green)]"
                      style={{
                        borderColor: "var(--border-medium)",
                        color: "var(--text-primary)",
                      }}
                    />
                    {/* Gradient fade overlay to prevent text/badge overlap */}
                    <div
                      className="pointer-events-none absolute inset-y-[1px] right-[1px] w-28 rounded-r-lg"
                      style={{
                        background: "linear-gradient(to right, rgba(10,15,13,0) 0%, rgba(10,15,13,0.15) 15%, rgba(10,15,13,0.25) 30%, rgba(10,15,13,0.50) 50%, rgba(10,15,13,0.85) 85%, rgba(10,15,13,1) 100%)",
                        opacity: entry.url.length > 30 ? 1 : 0,
                        transition: "opacity 0.2s",
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
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-subtle)" }}
                      aria-label={`Remove URL ${index + 1}`}
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
                className="mt-3 text-xs"
                style={{ color: "var(--accent-red)" }}
              >
                Douyin and Red Note URLs detected but not yet supported for live
                collection. Please use a TikTok URL or try demo data.
              </p>
            )}

            <button
              type="button"
              onClick={() => addEntry(entries, setEntries)}
              className="mt-4 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent-green)" }}
            >
              + Add another platform
            </button>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <Link
                  href="/dashboard?source=demo&persona=tutorial"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--text-subtle)" }}
                >
                  Skip &mdash; use demo data
                </Link>
                <Link
                  href="/dashboard?source=extension"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Use extension (Douyin)
                </Link>
              </div>
              <button
                type="button"
                onClick={handleContinueToStep2}
                disabled={!hasValidEntry}
                className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors disabled:opacity-40"
                style={{
                  background: "var(--accent-green)",
                  color: "var(--bg-primary)",
                }}
              >
                Continue
              </button>
            </div>
              </>
            )}

            {/* CDP auto collect mode */}
            {mode === "browser" && (
              <CDPSetupGuide />
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Benchmark comparison
            </h1>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Compare your account against competitors or aspirational
              creators to identify gaps and opportunities.
            </p>
            <div
              className="mt-4 rounded-md px-4 py-3 text-xs leading-5"
              style={{
                background: "rgba(210, 200, 126, 0.08)",
                color: "var(--accent-yellow)",
                border: "1px solid rgba(210, 200, 126, 0.15)",
              }}
            >
              Benchmark comparison is not yet available. This feature
              requires live data collection for both your account and
              benchmark accounts, which is currently limited to TikTok
              snapshots. Full benchmark support is on the roadmap.
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--text-subtle)" }}
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
                style={{
                  background: "var(--accent-green)",
                  color: "var(--bg-primary)",
                }}
              >
                Launch Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
