# DashPersona Testing Conventions

## Test Framework: Vitest

**Config:** `vitest.config.ts`
```ts
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Commands:**
- `npm run test` — Run all tests once (CI mode)
- `npm run test:watch` — Run tests in watch mode during development

**Globals enabled:** `describe`, `it`, `expect` available without imports (but imports are recommended for clarity)

## Test File Structure

**Location Convention:**
- Tests colocated in `__tests__/` subdirectory at same level as source code
- Test files: `*.test.ts` or `*.test.tsx` (matching source file type)

**Directory Examples:**
```
src/lib/
├── adapters/
│   ├── demo-adapter.ts
│   └── __tests__/
│       └── demo-adapter.test.ts
├── engine/
│   ├── persona.ts
│   ├── stats/
│   │   ├── normalize.ts
│   │   └── __tests__/
│   │       └── normalize.test.ts
│   └── __tests__/
│       ├── persona.test.ts
│       ├── benchmark.test.ts
│       └── stats/
│           ├── percentile.test.ts
│           ├── regression.test.ts
│           └── threshold.test.ts
├── textcraft/
│   ├── composers/
│   │   ├── ascii-logo.ts
│   │   └── ...
│   └── __tests__/
│       └── composers.test.ts
```

## Test Structure & Naming

**Test File Pattern:**

```ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../function-module';

describe('functionToTest', () => {
  it('does X when given Y', () => {
    expect(functionToTest(input)).toBe(expected);
  });

  it('returns Z for edge case', () => {
    expect(functionToTest(edgeCase)).toEqual(expected);
  });
});
```

**Describe Block Organization:**
- Top-level `describe()` per function or component
- Nested describes for related test groups
- Clear section headers separating logical groups (see `persona.test.ts` pattern)

**Test Naming:**
- Use `it('should...')` or `it('does X when Y')`
- Describe the expected behavior, not the implementation
- Example: `it('classifies posts with tutorial keywords into the tutorial category')`

**Section Headers** (optional but used in project):
```ts
// ---------------------------------------------------------------------------
// functionName
// ---------------------------------------------------------------------------

describe('functionName', () => {
  // tests here
});
```

## Assertion Patterns

**Common Matchers (from Vitest/Jest):**

```ts
// Equality
expect(value).toBe(expected);                // strict equality (===)
expect(value).toEqual(expected);             // deep equality
expect(value).toStrictEqual(expected);       // strict deep equality

// Existence
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(5);
expect(value).toBeLessThanOrEqual(5);
expect(value).toBeCloseTo(0.3, 5);           // tolerance for floats

// Strings & arrays
expect(string).toContain('substring');
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Types
expect(typeof value).toBe('number');

// Collections (Maps, Sets)
expect(map.has('key')).toBe(true);
expect(map.size).toBe(3);
```

**Common Patterns from Project:**

```ts
// Checking existence in collection
expect(dist.has('tutorial')).toBe(true);

// Checking numeric bounds
expect(score.score).toBeGreaterThanOrEqual(80);
expect(score.score).toBeLessThanOrEqual(100);

// Checking array membership
expect(['accelerating', 'steady', 'decelerating']).toContain(score.momentum);

// Float precision
expect(result).toBeCloseTo(12.5, 5);  // 5 decimal places

// Array/object lengths
expect(history.length).toBeGreaterThan(0);
expect(Object.keys(score).length).toBeGreaterThan(0);
```

## Test Patterns in Project

### Helper Functions

**Pattern (from `persona.test.ts`):**
```ts
function makePost(overrides: Partial<Post> & { desc: string }): Post {
  return {
    postId: `test_${Math.random().toString(36).slice(2, 8)}`,
    views: 10_000,
    likes: 500,
    comments: 50,
    shares: 20,
    saves: 30,
    publishedAt: new Date(Date.now() - Math.random() * 30 * 86_400_000).toISOString(),
    ...overrides,
  };
}
```

**Usage:**
```ts
const posts: Post[] = [
  makePost({ desc: '5分钟学会 CSS Grid 布局 #教程' }),
  makePost({ desc: 'React 18 tutorial for beginners' }),
];
```

### Test Data Management

**External Data Imports:**
- Use adapter demo data: `import { getDemoProfile } from '@/lib/adapters/demo-adapter'`
- Deterministic by design — calling same function twice returns identical data
- Good for persona tests, benchmarking, comparison tests

**Inline Data Creation:**
- Create test fixtures with helper functions for readability
- Override only the fields that matter for the test
- Use meaningful test values (e.g., realistic post counts, timestamps)

### Status & Result Object Tests

**Pattern (from `demo-adapter.test.ts`):**
```ts
it('each profile has required top-level fields', () => {
  for (const type of PERSONA_TYPES) {
    const profiles = getDemoProfile(type);
    for (const profile of Object.values(profiles)) {
      expect(typeof profile.platform).toBe('string');
      expect(typeof profile.profileUrl).toBe('string');
      expect(typeof profile.fetchedAt).toBe('string');
      expect(profile.source).toBe('demo');
      expect(typeof profile.profile.nickname).toBe('string');
      expect(typeof profile.profile.followers).toBe('number');
    }
  }
});
```

### Parameterized Tests

**Pattern (from `demo-adapter.test.ts`):**
```ts
const PERSONA_TYPES: DemoPersonaType[] = ['tutorial', 'entertainment', 'lifestyle'];

describe('getDemoProfile', () => {
  it('returns 3 platforms for each persona type', () => {
    for (const type of PERSONA_TYPES) {
      const profiles = getDemoProfile(type);
      const platforms = Object.keys(profiles);
      expect(platforms).toHaveLength(3);
      expect(platforms).toContain('douyin');
    }
  });
});
```

Use loops for parameterized testing (Vitest doesn't have built-in parameterization like Jest's `test.each`)

### Side-Effect Testing

**Pattern (from `persona.test.ts`):**
```ts
it('assigns contentType to posts as a side effect', () => {
  const posts: Post[] = [
    makePost({ desc: '健身 workout 日常 #fitness' }),
  ];
  classifyContent(posts);  // side-effect: mutates posts
  expect(posts[0].contentType).toBeDefined();
  expect(['fitness', 'daily']).toContain(posts[0].contentType);
});
```

### Sorting & Ordering Tests

**Pattern (from `persona.test.ts`):**
```ts
it('returns tags sorted by confidence descending', () => {
  const profiles = getDemoProfile('lifestyle');
  const score = computePersonaScore(profiles.xhs);
  const tags = generatePersonaTags(score);
  for (let i = 1; i < tags.length; i++) {
    expect(tags[i - 1].confidence).toBeGreaterThanOrEqual(tags[i].confidence);
  }
});
```

### Error & Edge Case Testing

**Pattern (from `normalize.test.ts`):**
```ts
it('returns 0 when divisor is zero (default fallback)', () => {
  expect(safeDivide(10, 0)).toBe(0);
});

it('returns custom fallback when divisor is zero', () => {
  expect(safeDivide(10, 0, -1)).toBe(-1);
});

it('returns 50 when steps has a single element', () => {
  expect(recalibrateSteps(42, [10])).toBe(50);
});

it('clamps below minimum to 0', () => {
  expect(recalibrateSteps(-10, steps)).toBe(0);
});

it('returns empty array for empty input', () => {
  expect(rankNormalize([], ['a'])).toEqual([]);
});
```

### Determinism Testing

**Pattern (from `demo-adapter.test.ts`):**
```ts
it('is deterministic: same input produces same output', () => {
  const first = getDemoProfile('tutorial');
  const second = getDemoProfile('tutorial');

  for (const platform of ['douyin', 'tiktok', 'xhs'] as const) {
    const a = first[platform];
    const b = second[platform];

    expect(a.platform).toBe(b.platform);
    expect(a.profile.nickname).toBe(b.profile.nickname);
    expect(a.posts.length).toBe(b.posts.length);
    for (let i = 0; i < a.posts.length; i++) {
      expect(a.posts[i].postId).toBe(b.posts[i].postId);
    }
  }
});
```

## Test File Examples

**Complete Test Example (`src/lib/engine/__tests__/stats/normalize.test.ts`):**
- Tests 3 functions: `safeDivide`, `recalibrateSteps`, `rankNormalize`
- Edge cases: division by zero, clamping, empty arrays, single elements
- Organized with section headers and focused assertions
- 119 lines covering ~30 test cases

**Component Test Example (`src/lib/textcraft/__tests__/composers.test.ts`):**
- Tests ASCII rendering functions
- Checks output structure (line count, character types)
- Tests clamping behavior
- Validates Unicode ranges (braille characters)

## Coverage & Best Practices

**Coverage Focus:**
- Business logic: 100% (algorithms, validators, adapters)
- Components: smoke tests (render, key interactions)
- Edge cases: always include (null, empty, boundary values)
- Error states: test error paths as thoroughly as success paths

**Don'ts:**
- Don't test implementation details (test behavior instead)
- Don't create unnecessarily complex test data
- Don't snapshot-test without reason (hard to maintain)
- Don't test third-party libraries (trust their tests)

**Do's:**
- Test public APIs and exported functions
- Name tests descriptively
- Keep tests independent (no test order dependencies)
- Use meaningful test values (not just `'a'`, `1`, `true`)
- Group related tests with `describe` blocks

## Mocking (if used)

**Current Project State:**
- No explicit mocks in existing test files
- Tests use real demo data (`getDemoProfile`) or helper factories
- In future, if mocking needed: use Vitest's `vi.mock()` and `vi.spyOn()`

**Pattern (when needed):**
```ts
import { vi } from 'vitest';
import * as moduleToMock from '@/lib/module';

vi.mock('@/lib/module', () => ({
  functionName: vi.fn(() => mockValue),
}));

// Or for spying on existing function:
const spy = vi.spyOn(moduleToMock, 'functionName');
```

## Running Tests

**Single file:**
```bash
npm run test src/lib/engine/__tests__/persona.test.ts
```

**Watch mode (interactive):**
```bash
npm run test:watch
```

**With filter:**
```bash
npm run test -- --grep "classifyContent"
```

## Integration with CI

Tests in `src/**/*.test.ts` are discovered automatically by Vitest.
CI/CD runs `npm run test` which executes all tests in one-shot mode (exit after completion).

Path alias `@` is configured in `vitest.config.ts` to match `tsconfig.json`.
