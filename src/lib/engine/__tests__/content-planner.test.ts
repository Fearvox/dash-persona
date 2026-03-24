/**
 * Tests for the content planner engine.
 *
 * @module engine/__tests__/content-planner
 */

import { describe, it, expect } from 'vitest';
import { generateContentPlan, exportToICS } from '../content-planner';
import type { ContentSlot } from '../content-planner';
import type { CreatorProfile, Post } from '../../schema/creator-data';
import { getDemoProfile } from '../../adapters/demo-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal CreatorProfile with the given posts. */
function makeProfile(
  posts: Post[],
  platform = 'douyin',
): CreatorProfile {
  return {
    platform,
    profileUrl: `https://${platform}.example.com/@test`,
    fetchedAt: new Date().toISOString(),
    source: 'demo',
    profile: {
      nickname: 'Test Creator',
      uniqueId: 'test_creator',
      followers: 10_000,
      likesTotal: 50_000,
      videosCount: posts.length,
    },
    posts,
  };
}

/** Build N posts with varied content for testing. */
function makePosts(count: number): Post[] {
  const descs = [
    '5分钟学会 CSS Grid 布局 #前端开发 #编程教学',
    '搞笑段子合集 #搞笑 #段子',
    '这款面霜真实测评 #护肤 #测评',
    '旅行打卡日记 #旅行 #打卡',
    '美食做饭教程 #美食 #做饭',
    'React 18 新特性全解析 #React #前端',
    '健身运动日常 #健身 #运动',
    '穿搭分享 OOTD #穿搭 #时尚',
    '宠物猫咪日常 #宠物 #猫',
    '读书笔记分享 #读书 #书单',
  ];

  const posts: Post[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(i * 2.5); // spread over time
    const hour = (8 + (i * 3) % 14); // vary hours between 8-22
    const publishedAt = new Date(now - daysAgo * 86_400_000);
    publishedAt.setUTCHours(hour, 0, 0, 0);

    posts.push({
      postId: `test_post_${i}`,
      desc: descs[i % descs.length],
      publishedAt: publishedAt.toISOString(),
      views: 5000 + i * 500,
      likes: 200 + i * 30,
      comments: 20 + i * 5,
      shares: 10 + i * 2,
      saves: 15 + i * 3,
      tags: descs[i % descs.length].match(/#[^\s#]+/g)?.map((t) => t.slice(1)) ?? [],
    });
  }

  // Newest first by convention
  posts.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  return posts;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateContentPlan', () => {
  it('returns empty slots with correct dataPoints when total posts < 10', () => {
    const posts = makePosts(5);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles);

    expect(plan.slots).toHaveLength(0);
    expect(plan.dataPoints).toBe(5);
    expect(plan.generatedAt).toBeTruthy();
  });

  it('returns empty plan when all profiles combined have < 10 posts', () => {
    const profiles = {
      douyin: makeProfile(makePosts(3)),
      tiktok: makeProfile(makePosts(4), 'tiktok'),
    };

    const plan = generateContentPlan(profiles);

    expect(plan.slots).toHaveLength(0);
    expect(plan.dataPoints).toBe(7);
  });

  it('generates 7-14 slots for 7 days with 30+ posts', () => {
    const posts = makePosts(35);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    expect(plan.slots.length).toBeGreaterThanOrEqual(7);
    expect(plan.slots.length).toBeLessThanOrEqual(14);
    expect(plan.dataPoints).toBe(35);
  });

  it('generates slots with future dates only', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    const todayStr = new Date().toISOString().slice(0, 10);
    for (const slot of plan.slots) {
      expect(slot.date > todayStr).toBe(true);
    }
  });

  it('does not assign the same content type on consecutive days', () => {
    const posts = makePosts(40);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 14);

    // Group slots by date and get the last content type per day
    const slotsByDate = new Map<string, ContentSlot[]>();
    for (const slot of plan.slots) {
      const existing = slotsByDate.get(slot.date) ?? [];
      existing.push(slot);
      slotsByDate.set(slot.date, existing);
    }

    const dates = [...slotsByDate.keys()].sort();
    for (let i = 1; i < dates.length; i++) {
      const prevDaySlots = slotsByDate.get(dates[i - 1])!;
      const currDaySlots = slotsByDate.get(dates[i])!;

      // Last type of previous day vs first type of current day
      const lastPrevType = prevDaySlots[prevDaySlots.length - 1].contentType;
      const firstCurrType = currDaySlots[0].contentType;

      // They can be the same only if there's only one recommended type
      // (edge case), but generally should differ
      if (plan.slots.length > 2) {
        // Collect all unique types to check if diversity is possible
        const allTypes = new Set(plan.slots.map((s) => s.contentType));
        if (allTypes.size > 1) {
          expect(lastPrevType).not.toBe(firstCurrType);
        }
      }
    }
  });

  it('generates non-empty reasoning strings', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    for (const slot of plan.slots) {
      expect(slot.reasoning).toBeTruthy();
      expect(slot.reasoning.length).toBeGreaterThan(10);
    }
  });

  it('recommends the platform with highest engagement for each type', () => {
    // Create profiles where tiktok has higher engagement for tutorial content
    const douyinPosts = makePosts(15);
    const tiktokPosts = makePosts(15).map((p) => ({
      ...p,
      postId: `tiktok_${p.postId}`,
      views: p.views * 2, // keep views high
      likes: p.likes * 5, // boost engagement on tiktok
      comments: p.comments * 3,
      shares: p.shares * 4,
      saves: p.saves * 3,
    }));

    const profiles = {
      douyin: makeProfile(douyinPosts),
      tiktok: makeProfile(tiktokPosts, 'tiktok'),
    };

    const plan = generateContentPlan(profiles, 7);

    // At least some slots should recommend tiktok since it has higher engagement
    const tiktokSlots = plan.slots.filter((s) => s.platform === 'tiktok');
    expect(tiktokSlots.length).toBeGreaterThan(0);
  });

  it('is deterministic: same input produces same output', () => {
    const profiles = getDemoProfile('tutorial');

    const plan1 = generateContentPlan(profiles, 7);
    const plan2 = generateContentPlan(profiles, 7);

    // Compare slots (excluding generatedAt which is a timestamp)
    expect(plan1.slots.length).toBe(plan2.slots.length);
    expect(plan1.dataPoints).toBe(plan2.dataPoints);

    for (let i = 0; i < plan1.slots.length; i++) {
      expect(plan1.slots[i].id).toBe(plan2.slots[i].id);
      expect(plan1.slots[i].date).toBe(plan2.slots[i].date);
      expect(plan1.slots[i].contentType).toBe(plan2.slots[i].contentType);
      expect(plan1.slots[i].platform).toBe(plan2.slots[i].platform);
      expect(plan1.slots[i].suggestedHour).toBe(plan2.slots[i].suggestedHour);
      expect(plan1.slots[i].priority).toBe(plan2.slots[i].priority);
    }
  });

  it('generates valid slot IDs', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    for (const slot of plan.slots) {
      expect(slot.id).toMatch(/^slot-\d{4}-\d{2}-\d{2}-.+-.+$/);
    }
  });

  it('assigns valid time slots matching suggestedHour', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    for (const slot of plan.slots) {
      expect(slot.suggestedHour).toBeGreaterThanOrEqual(0);
      expect(slot.suggestedHour).toBeLessThanOrEqual(23);

      if (slot.suggestedHour >= 6 && slot.suggestedHour <= 11) {
        expect(slot.timeSlot).toBe('morning');
      } else if (slot.suggestedHour >= 12 && slot.suggestedHour <= 17) {
        expect(slot.timeSlot).toBe('afternoon');
      } else {
        expect(slot.timeSlot).toBe('evening');
      }
    }
  });

  it('all slots start with status "suggested"', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan = generateContentPlan(profiles, 7);

    for (const slot of plan.slots) {
      expect(slot.status).toBe('suggested');
    }
  });

  it('respects custom daysAhead parameter', () => {
    const posts = makePosts(30);
    const profiles = { douyin: makeProfile(posts) };

    const plan3 = generateContentPlan(profiles, 3);
    const plan14 = generateContentPlan(profiles, 14);

    // More days = more slots
    expect(plan14.slots.length).toBeGreaterThan(plan3.slots.length);

    // All dates should be within the requested range
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const maxDate3 = new Date(today.getTime() + 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    for (const slot of plan3.slots) {
      expect(slot.date <= maxDate3).toBe(true);
    }
  });
});

describe('exportToICS', () => {
  it('generates valid iCal format with VCALENDAR wrapper', () => {
    const slots: ContentSlot[] = [
      {
        id: 'slot-2026-03-25-douyin-tutorial',
        date: '2026-03-25',
        timeSlot: 'morning',
        suggestedHour: 10,
        platform: 'douyin',
        contentType: 'tutorial',
        reasoning: 'Tutorial content performs well.',
        priority: 'high',
        status: 'accepted',
      },
    ];

    const ics = exportToICS(slots);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('DTSTART:20260325T100000Z');
    expect(ics).toContain('SUMMARY:[Tutorial] on Douyin');
    expect(ics).toContain('DESCRIPTION:Tutorial content performs well.');
  });

  it('only includes accepted slots', () => {
    const slots: ContentSlot[] = [
      {
        id: 'slot-1',
        date: '2026-03-25',
        timeSlot: 'morning',
        suggestedHour: 10,
        platform: 'douyin',
        contentType: 'tutorial',
        reasoning: 'Accepted slot.',
        priority: 'high',
        status: 'accepted',
      },
      {
        id: 'slot-2',
        date: '2026-03-26',
        timeSlot: 'afternoon',
        suggestedHour: 14,
        platform: 'tiktok',
        contentType: 'review',
        reasoning: 'Dismissed slot.',
        priority: 'medium',
        status: 'dismissed',
      },
      {
        id: 'slot-3',
        date: '2026-03-27',
        timeSlot: 'evening',
        suggestedHour: 20,
        platform: 'xhs',
        contentType: 'food',
        reasoning: 'Suggested slot.',
        priority: 'low',
        status: 'suggested',
      },
    ];

    const ics = exportToICS(slots);

    // Only 1 VEVENT for the accepted slot
    const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(1);
    expect(ics).toContain('Accepted slot.');
    expect(ics).not.toContain('Dismissed slot.');
    expect(ics).not.toContain('Suggested slot.');
  });

  it('returns empty calendar when no accepted slots', () => {
    const slots: ContentSlot[] = [
      {
        id: 'slot-1',
        date: '2026-03-25',
        timeSlot: 'morning',
        suggestedHour: 10,
        platform: 'douyin',
        contentType: 'tutorial',
        reasoning: 'Not accepted.',
        priority: 'high',
        status: 'suggested',
      },
    ];

    const ics = exportToICS(slots);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
