'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ContentPlan, ContentSlot } from '@/lib/engine';
import { exportToICS } from '@/lib/engine/content-planner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<ContentSlot['priority'], string> = {
  high: 'var(--accent-green)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
};

const TIME_SLOT_LABELS: Record<ContentSlot['timeSlot'], string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const TIME_SLOT_ORDER: ContentSlot['timeSlot'][] = [
  'morning',
  'afternoon',
  'evening',
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Get the Monday of the week containing a given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** Get 7 dates starting from a given Monday. */
function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateHeader(date: Date): string {
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${DAY_NAMES_SHORT[date.getUTCDay()]} ${day} ${month}`;
}

function dateToStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Slot card component
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: ContentSlot;
  onToggleStatus: (id: string) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

function SlotCard({
  slot,
  onToggleStatus,
  expandedId,
  onToggleExpand,
}: SlotCardProps) {
  const isExpanded = expandedId === slot.id;
  const isAccepted = slot.status === 'accepted';
  const isDismissed = slot.status === 'dismissed';

  return (
    <div
      className="relative min-w-[200px] overflow-hidden rounded-lg px-3 py-2.5 transition-all"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isDismissed ? 'var(--border-subtle)' : 'var(--border-medium)'}`,
        borderLeftWidth: '3px',
        borderLeftColor: PRIORITY_COLORS[slot.priority],
        opacity: isDismissed ? 0.5 : 1,
        textDecoration: isDismissed ? 'line-through' : 'none',
      }}
    >
      {/* Row 1: checkmark + content type name */}
      <div className="flex items-center gap-2">
        {isAccepted && (
          <span
            className="text-xs"
            style={{ color: 'var(--accent-green)' }}
            aria-label="Accepted"
          >
            &#10003;
          </span>
        )}
        <span
          className="truncate text-sm font-medium"
          style={{
            color: isDismissed
              ? 'var(--text-subtle)'
              : 'var(--text-primary)',
          }}
        >
          {capitalise(slot.contentType)}
        </span>
      </div>

      {/* Row 2: platform badge + priority indicator */}
      <div className="mt-1 flex items-center gap-2">
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          {capitalise(slot.platform)}
        </span>
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: PRIORITY_COLORS[slot.priority] }}
          aria-label={`${slot.priority} priority`}
        />
      </div>

      {/* Time */}
      <p
        className="mt-1 text-xs"
        style={{ color: 'var(--text-subtle)' }}
      >
        {slot.suggestedHour.toString().padStart(2, '0')}:00 &middot;{' '}
        {TIME_SLOT_LABELS[slot.timeSlot]}
      </p>

      {/* Reasoning (truncated / expandable) */}
      <button
        type="button"
        className="mt-1.5 text-left text-xs leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
        onClick={() => onToggleExpand(slot.id)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          slot.reasoning
        ) : (
          <>
            {slot.reasoning.slice(0, 80)}
            {slot.reasoning.length > 80 ? '...' : ''}
          </>
        )}
      </button>

      {/* Accept / Dismiss buttons */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            background: isAccepted
              ? 'var(--accent-green)'
              : 'var(--bg-secondary)',
            color: isAccepted
              ? 'var(--bg-primary)'
              : 'var(--text-secondary)',
          }}
          onClick={() => onToggleStatus(slot.id)}
          aria-label={
            isAccepted ? 'Undo accept' : isDismissed ? 'Accept' : 'Accept slot'
          }
        >
          {isAccepted ? 'Accepted' : 'Accept'}
        </button>
        <button
          type="button"
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            background: isDismissed
              ? 'var(--accent-red)'
              : 'var(--bg-secondary)',
            color: isDismissed
              ? 'var(--bg-primary)'
              : 'var(--text-subtle)',
          }}
          onClick={() =>
            onToggleStatus(
              slot.id + (slot.status === 'dismissed' ? ':undismiss' : ':dismiss'),
            )
          }
          aria-label={isDismissed ? 'Undo dismiss' : 'Dismiss slot'}
        >
          {isDismissed ? 'Dismissed' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main calendar client component
// ---------------------------------------------------------------------------

interface CalendarClientProps {
  plan: ContentPlan;
}

export default function CalendarClient({ plan }: CalendarClientProps) {
  // Slot state (local, no persistence)
  const [slots, setSlots] = useState<ContentSlot[]>(plan.slots);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Week navigation
  const firstSlotDate = plan.slots[0]?.date;
  const initialWeekStart = firstSlotDate
    ? getWeekStart(new Date(firstSlotDate + 'T00:00:00Z'))
    : getWeekStart(new Date());

  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

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

  // Status toggling
  const handleToggleStatus = useCallback((action: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (action === slot.id) {
          // Toggle accept
          return {
            ...slot,
            status:
              slot.status === 'accepted' ? 'suggested' : 'accepted',
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

  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  // Week navigation
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    });
  }, []);

  // ICS export
  const handleExportICS = useCallback(() => {
    const icsContent = exportToICS(slots);
    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashpersona-calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
  }, [slots]);

  const acceptedCount = slots.filter((s) => s.status === 'accepted').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar: navigation + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToPrevWeek}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Previous week"
          >
            &larr; Prev
          </button>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatDateHeader(weekDates[0])} &ndash;{' '}
            {formatDateHeader(weekDates[6])}
          </span>
          <button
            type="button"
            onClick={goToNextWeek}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Next week"
          >
            Next &rarr;
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportICS}
          disabled={acceptedCount === 0}
          className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          style={{
            background:
              acceptedCount > 0 ? 'var(--accent-green)' : 'var(--bg-card)',
            color:
              acceptedCount > 0
                ? 'var(--bg-primary)'
                : 'var(--text-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
          aria-label={`Export ${acceptedCount} accepted slots as .ics file`}
        >
          Export .ics{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
        </button>
      </div>

      {/* Desktop: week grid view */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-3">
          {weekDates.map((date) => {
            const dateStr = dateToStr(date);
            const daySlots = slotsByDate.get(dateStr) ?? [];
            const isToday =
              dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div key={dateStr} className="flex flex-col gap-2">
                {/* Day header */}
                <div
                  className="rounded-lg px-3 py-2 text-center text-xs font-medium"
                  style={{
                    background: isToday
                      ? 'var(--accent-green)'
                      : 'var(--bg-secondary)',
                    color: isToday
                      ? 'var(--bg-primary)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {formatDateHeader(date)}
                </div>

                {/* Time slot rows */}
                {TIME_SLOT_ORDER.map((timeSlot) => {
                  const slotsForTime = daySlots.filter(
                    (s) => s.timeSlot === timeSlot,
                  );
                  return (
                    <div key={timeSlot} className="min-h-[2rem]">
                      {slotsForTime.length === 0 ? (
                        <div
                          className="flex h-8 items-center justify-center rounded-lg text-xs"
                          style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-subtle)',
                            border: '1px dashed var(--border-subtle)',
                          }}
                        >
                          {TIME_SLOT_LABELS[timeSlot]}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {slotsForTime.map((slot) => (
                            <SlotCard
                              key={slot.id}
                              slot={slot}
                              onToggleStatus={handleToggleStatus}
                              expandedId={expandedId}
                              onToggleExpand={handleToggleExpand}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical list grouped by day */}
      <div className="flex flex-col gap-4 md:hidden">
        {weekDates.map((date) => {
          const dateStr = dateToStr(date);
          const daySlots = slotsByDate.get(dateStr) ?? [];
          const isToday =
            dateStr === new Date().toISOString().slice(0, 10);

          return (
            <div key={dateStr}>
              {/* Day header */}
              <div
                className="rounded-t-lg px-4 py-2 text-sm font-medium"
                style={{
                  background: isToday
                    ? 'var(--accent-green)'
                    : 'var(--bg-secondary)',
                  color: isToday
                    ? 'var(--bg-primary)'
                    : 'var(--text-primary)',
                }}
              >
                {formatDateHeader(date)}
              </div>

              {/* Slots */}
              <div
                className="rounded-b-lg px-3 py-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                {daySlots.length === 0 ? (
                  <p
                    className="py-3 text-center text-xs"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    No slots scheduled
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 py-1">
                    {daySlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        onToggleStatus={handleToggleStatus}
                        expandedId={expandedId}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 text-xs"
        style={{ color: 'var(--text-subtle)' }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: 'var(--accent-green)' }}
          />
          High priority
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: 'var(--accent-yellow)' }}
          />
          Medium priority
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: 'var(--accent-blue)' }}
          />
          Low priority
        </span>
      </div>
    </div>
  );
}
