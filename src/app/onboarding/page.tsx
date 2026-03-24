"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PlatformEntry = {
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [entries, setEntries] = useState<PlatformEntry[]>([
    { url: "", platform: null },
  ]);
  const [benchmarks, setBenchmarks] = useState<PlatformEntry[]>([
    { url: "", platform: null },
  ]);

  function updateEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
    index: number,
    value: string,
  ) {
    const updated = list.map((entry, i) =>
      i === index
        ? { url: value, platform: value.length > 8 ? detectPlatform(value) : null }
        : entry,
    );
    setter(updated);
  }

  function addEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
  ) {
    setter([...list, { url: "", platform: null }]);
  }

  function removeEntry(
    list: PlatformEntry[],
    setter: (v: PlatformEntry[]) => void,
    index: number,
  ) {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  }

  const hasValidEntry = entries.some((e) => e.platform !== null);

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
              Paste your profile URL from any supported platform. We will
              auto-detect which platform it belongs to.
            </p>

            <fieldset className="mt-8 flex flex-col gap-4">
              <legend className="sr-only">Profile URLs</legend>
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
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
                      placeholder="https://www.douyin.com/user/..."
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

            <button
              type="button"
              onClick={() => addEntry(entries, setEntries)}
              className="mt-4 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent-green)" }}
            >
              + Add another platform
            </button>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/dashboard?source=demo&persona=tutorial"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--text-subtle)" }}
              >
                Skip &mdash; use demo data
              </Link>
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
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Add benchmark accounts
            </h1>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Optionally add competitor or aspirational accounts to compare
              against. Same URL format as before.
            </p>

            <fieldset className="mt-8 flex flex-col gap-4">
              <legend className="sr-only">Benchmark URLs</legend>
              {benchmarks.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <label
                      htmlFor={`benchmark-${index}`}
                      className="sr-only"
                    >
                      Benchmark URL {index + 1}
                    </label>
                    <input
                      id={`benchmark-${index}`}
                      type="url"
                      placeholder="https://www.tiktok.com/@..."
                      value={entry.url}
                      onChange={(e) =>
                        updateEntry(
                          benchmarks,
                          setBenchmarks,
                          index,
                          e.target.value,
                        )
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
                  {benchmarks.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeEntry(benchmarks, setBenchmarks, index)
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-subtle)" }}
                      aria-label={`Remove benchmark URL ${index + 1}`}
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

            <button
              type="button"
              onClick={() => addEntry(benchmarks, setBenchmarks)}
              className="mt-4 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent-green)" }}
            >
              + Add another account
            </button>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--text-subtle)" }}
              >
                &larr; Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-sm font-semibold transition-colors hover:bg-white/5"
                  style={{
                    borderColor: "var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  Skip
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
          </div>
        )}
      </div>
    </div>
  );
}
