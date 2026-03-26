'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ContentPlan, ContentSlot } from '@/lib/engine';
import { exportToICS } from '@/lib/engine/content-planner';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<ContentSlot['priority'], string> = {
  high: 'var(--accent-green)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
};

function getMonthNames(): string[] {
  return [
    t('ui.calendar.month1'), t('ui.calendar.month2'), t('ui.calendar.month3'),
    t('ui.calendar.month4'), t('ui.calendar.month5'), t('ui.calendar.month6'),
    t('ui.calendar.month7'), t('ui.calendar.month8'), t('ui.calendar.month9'),
    t('ui.calendar.month10'), t('ui.calendar.month11'), t('ui.calendar.month12'),
  ];
}

function getDayHeaders(): string[] {
  return [
    t('ui.calendar.dayMon'), t('ui.calendar.dayTue'), t('ui.calendar.dayWed'),
    t('ui.calendar.dayThu'), t('ui.calendar.dayFri'), t('ui.calendar.daySat'),
    t('ui.calendar.daySun'),
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Get first day of month as Date (UTC). */
function firstOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

/** Get the number of days in a month. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Convert Date to YYYY-MM-DD string. */
function dateToStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Build the 6-row x 7-col grid of dates for a month view.
 * Rows start on Monday. Cells outside the target month are null.
 */
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const totalDays = daysInMonth(year, month);
  const first = firstOfMonth(year, month);
  // getUTCDay(): 0=Sun, convert to Mon=0
  const startDow = (first.getUTCDay() + 6) % 7;

  const grid: (Date | null)[][] = [];
  let dayCounter = 1;

  for (let row = 0; row < 6; row++) {
    const week: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      const cellIndex = row * 7 + col;
      if (cellIndex < startDow || dayCounter > totalDays) {
        week.push(null);
      } else {
        week.push(new Date(Date.UTC(year, month, dayCounter)));
        dayCounter++;
      }
    }
    grid.push(week);
    if (dayCounter > totalDays) break;
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Slot pill (compact representation for month cells)
// ---------------------------------------------------------------------------

interface SlotPillProps {
  slot: ContentSlot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SlotPill({ slot, isSelected, onSelect }: SlotPillProps) {
  const isDismissed = slot.status === 'dismissed';
  const isAccepted = slot.status === 'accepted';

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.id)}
      className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors"
      style={{
        background: isSelected ? 'var(--bg-secondary)' : 'transparent',
        opacity: isDismissed ? 0.4 : 1,
        textDecoration: isDismissed ? 'line-through' : 'none',
      }}
      aria-label={`${capitalise(slot.contentType)} on ${capitalise(slot.platform)} at ${slot.suggestedHour}:00`}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: PRIORITY_COLORS[slot.priority] }}
      />
      {isAccepted && (
        <span className="text-[10px] text-[var(--accent-green)]">
          &#10003;
        </span>
      )}
      <span
        className="truncate text-[11px] font-medium leading-tight"
        style={{ color: isDismissed ? 'var(--text-subtle)' : 'var(--text-secondary)' }}
      >
        {capitalise(slot.contentType)}
      </span>
      <span
        className="ml-auto shrink-0 font-mono text-[10px] text-[var(--text-subtle)]"
      >
        {slot.suggestedHour.toString().padStart(2, '0')}:00
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slot detail panel (shown when a slot is selected)
// ---------------------------------------------------------------------------

interface SlotDetailProps {
  slot: ContentSlot;
  onToggleStatus: (action: string) => void;
  onClose: () => void;
}

function SlotDetail({ slot, onToggleStatus, onClose }: SlotDetailProps) {
  const isAccepted = slot.status === 'accepted';
  const isDismissed = slot.status === 'dismissed';

  return (
    <div
      className="rounded-lg p-4 bg-[var(--bg-card)] border border-[var(--border-medium)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: PRIORITY_COLORS[slot.priority] }}
            />
            <h3
              className="truncate text-sm font-semibold text-[var(--text-primary)]"
            >
              {capitalise(slot.contentType)}
            </h3>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              {capitalise(slot.platform)}
            </span>
            <span
              className="font-mono text-xs text-[var(--text-subtle)]"
            >
              {slot.date} {slot.suggestedHour.toString().padStart(2, '0')}:00
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded px-2 py-1 text-xs text-[var(--text-subtle)]"
          aria-label="Close detail"
        >
          &#x2715;
        </button>
      </div>

      <p
        className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]"
      >
        {slot.reasoning}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: isAccepted ? 'var(--accent-green)' : 'var(--bg-secondary)',
            color: isAccepted ? 'var(--bg-primary)' : 'var(--text-secondary)',
          }}
          onClick={() => onToggleStatus(slot.id)}
        >
          {isAccepted ? t('ui.calendar.accepted') : t('ui.calendar.accept')}
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: isDismissed ? 'var(--accent-red)' : 'var(--bg-secondary)',
            color: isDismissed ? 'var(--bg-primary)' : 'var(--text-subtle)',
          }}
          onClick={() =>
            onToggleStatus(
              slot.id + (slot.status === 'dismissed' ? ':undismiss' : ':dismiss'),
            )
          }
        >
          {isDismissed ? t('ui.calendar.dismissed') : t('ui.calendar.dismiss')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyMonth() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg py-16 bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)]"
    >
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        No scheduled slots this month
      </p>
      <p className="max-w-xs text-center text-xs text-[var(--text-subtle)]">
        Navigate to a month with generated content slots, or increase the planning horizon.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main calendar client component — Month View
// ---------------------------------------------------------------------------

interface CalendarClientProps {
  plan: ContentPlan;
}

export default function CalendarClient({ plan }: CalendarClientProps) {
  // Slot state
  const [slots, setSlots] = useState<ContentSlot[]>(plan.slots);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Month navigation — start from today's month
  const today = new Date();
  const todayStr = dateToStr(today);
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, ContentSlot[]>();
    for (const slot of slots) {
      const existing = map.get(slot.date) ?? [];
      existing.push(slot);
      map.set(slot.date, existing);
    }
    return map;
  }, [slots]);

  // Build month grid
  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Check if any slots exist in the current month view
  const monthHasSlots = useMemo(() => {
    const monthPrefix = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}`;
    return slots.some((s) => s.date.startsWith(monthPrefix));
  }, [slots, viewYear, viewMonth]);

  // Selected slot object
  const selectedSlot = useMemo(
    () => (selectedSlotId ? slots.find((s) => s.id === selectedSlotId) ?? null : null),
    [selectedSlotId, slots],
  );

  // Status toggling
  const handleToggleStatus = useCallback((action: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (action === slot.id) {
          return {
            ...slot,
            status: slot.status === 'accepted' ? 'suggested' : 'accepted',
          };
        }
        if (action === slot.id + ':dismiss') {
          return { ...slot, status: 'dismissed' };
        }
        if (action === slot.id + ':undismiss') {
          return { ...slot, status: 'suggested' };
        }
        return slot;
      }),
    );
  }, []);

  // Month navigation
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedSlotId(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedSlotId(null);
  }, []);

  // ICS export
  const handleExportICS = useCallback(() => {
    const icsContent = exportToICS(slots);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashpersona-calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
  }, [slots]);

  const acceptedCount = slots.filter((s) => s.status === 'accepted').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar: month nav + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Previous month"
          >
            &larr;
          </button>
          <span
            className="min-w-[10rem] text-center text-sm font-semibold tracking-tight text-[var(--text-primary)]"
          >
            {getMonthNames()[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportICS}
          disabled={acceptedCount === 0}
          className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          style={{
            background: acceptedCount > 0 ? 'var(--accent-green)' : 'var(--bg-card)',
            color: acceptedCount > 0 ? 'var(--bg-primary)' : 'var(--text-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
          aria-label={`Export ${acceptedCount} accepted slots as .ics file`}
        >
          Export .ics{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
        </button>
      </div>

      {/* Month grid — desktop */}
      {monthHasSlots ? (
        <div className="hidden md:block">
          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7 gap-px">
            {getDayHeaders().map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-xs font-medium text-[var(--text-subtle)]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div
            className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-[var(--border-subtle)]"
          >
            {grid.flatMap((week, rowIdx) =>
              week.map((date, colIdx) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${rowIdx}-${colIdx}`}
                      className="min-h-[5rem] lg:min-h-[6rem] bg-[var(--bg-primary)]"
                    />
                  );
                }

                const dateStr = dateToStr(date);
                const daySlots = slotsByDate.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={dateStr}
                    className="flex min-h-[5rem] flex-col gap-0.5 p-1 lg:min-h-[6rem] lg:p-1.5 bg-[var(--bg-primary)]"
                  >
                    {/* Date number */}
                    <span
                      className="mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium"
                      style={{
                        background: isToday ? 'var(--accent-green)' : 'transparent',
                        color: isToday ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {date.getUTCDate()}
                    </span>

                    {/* Slot pills */}
                    {daySlots.map((slot) => (
                      <SlotPill
                        key={slot.id}
                        slot={slot}
                        isSelected={selectedSlotId === slot.id}
                        onSelect={setSelectedSlotId}
                      />
                    ))}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:block">
          <EmptyMonth />
        </div>
      )}

      {/* Month list — mobile */}
      {monthHasSlots ? (
        <div className="flex flex-col gap-2 md:hidden">
          {grid.flat().map((date) => {
            if (!date) return null;
            const dateStr = dateToStr(date);
            const daySlots = slotsByDate.get(dateStr) ?? [];
            if (daySlots.length === 0) return null;

            const isToday = dateStr === todayStr;
            const dayLabel = `${getDayHeaders()[(date.getUTCDay() + 6) % 7]} ${date.getUTCDate()}`;

            return (
              <div key={dateStr}>
                <div
                  className="flex items-center gap-2 rounded-t-lg px-3 py-1.5"
                  style={{
                    background: isToday ? 'var(--accent-green)' : 'var(--bg-secondary)',
                    color: isToday ? 'var(--bg-primary)' : 'var(--text-primary)',
                  }}
                >
                  <span className="text-xs font-semibold">{dayLabel}</span>
                  <span
                    className="text-[10px]"
                    style={{ color: isToday ? 'var(--bg-card)' : 'var(--text-subtle)' }}
                  >
                    {daySlots.length} slot{daySlots.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div
                  className="flex flex-col gap-1 rounded-b-lg px-2 py-2"
                  style={{
                    background: 'var(--bg-card)',
                    borderLeft: '1px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {daySlots.map((slot) => (
                    <SlotPill
                      key={slot.id}
                      slot={slot}
                      isSelected={selectedSlotId === slot.id}
                      onSelect={setSelectedSlotId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="md:hidden">
          <EmptyMonth />
        </div>
      )}

      {/* Selected slot detail panel */}
      {selectedSlot && (
        <SlotDetail
          slot={selectedSlot}
          onToggleStatus={handleToggleStatus}
          onClose={() => setSelectedSlotId(null)}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-subtle)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-green)]" />
          High priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-yellow)]" />
          Medium priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-blue)]" />
          Low priority
        </span>
      </div>
    </div>
  );
}
