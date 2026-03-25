/**
 * MCP Server for bb-browser data collection.
 *
 * Exposes BrowserAdapter collection methods as MCP tools,
 * allowing Claude Code / Cowork / other MCP clients to call
 * bb-browser data collection directly without going through
 * the web API route.
 *
 * Tools:
 * - collect_xhs(userId): Collect XHS creator profile via bb-browser
 * - collect_douyin(url): Collect Douyin creator profile via bb-browser
 * - list_platforms(): List supported platforms and their capabilities
 *
 * Usage:
 *   npx tsx src/lib/mcp/browser-mcp-server.ts
 *
 * Or configure in .mcp.json / Claude Code settings.
 *
 * @module mcp/browser-mcp-server
 */

import { execBrowser, parseBrowserOutput, BrowserAdapterError } from '../adapters/browser-adapter';
import type { CreatorProfile } from '../schema/creator-data';

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

interface PlatformInfo {
  id: string;
  name: string;
  collectMethod: string;
  requiredParam: string;
  description: string;
  bbBrowserAdapters: string[];
  status: 'ready' | 'experimental' | 'planned';
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'xhs',
    name: 'Red Note (XiaoHongShu)',
    collectMethod: 'collect_xhs',
    requiredParam: 'userId',
    description: 'Collect XHS creator profile + posts via bb-browser xiaohongshu adapters',
    bbBrowserAdapters: ['xiaohongshu/me', 'xiaohongshu/user_posts', 'xiaohongshu/note'],
    status: 'ready',
  },
  {
    id: 'douyin',
    name: 'Douyin',
    collectMethod: 'collect_douyin',
    requiredParam: 'url',
    description: 'Collect Douyin creator profile via page automation (open + eval)',
    bbBrowserAdapters: [],
    status: 'experimental',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    collectMethod: 'collect_tiktok',
    requiredParam: 'url',
    description: 'TikTok collection (planned)',
    bbBrowserAdapters: [],
    status: 'planned',
  },
];

// ---------------------------------------------------------------------------
// Collection functions (reuse from BrowserAdapter)
// ---------------------------------------------------------------------------

async function collectXhs(userId: string): Promise<CreatorProfile> {
  const profileOut = await execBrowser(['site', 'xiaohongshu/user_posts', userId, '--json']);
  const data = parseBrowserOutput<{ user?: Record<string, unknown>; notes?: Record<string, unknown>[] }>(profileOut);

  const user = data.user ?? {};
  const notes = data.notes ?? [];

  return {
    platform: 'xhs',
    profileUrl: `https://www.xiaohongshu.com/user/profile/${userId}`,
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: String(user.nickname ?? ''),
      uniqueId: String(user.red_id ?? userId),
      followers: Number(user.fans) || 0,
      likesTotal: Number(user.interaction) || 0,
      videosCount: notes.length,
      bio: user.desc ? String(user.desc) : undefined,
    },
    posts: notes.map((note, i) => ({
      postId: String(note.note_id ?? note.id ?? `xhs-${i}`),
      desc: String(note.title ?? note.desc ?? ''),
      views: 0,
      likes: Number(note.liked_count) || 0,
      comments: Number(note.comment_count) || 0,
      shares: Number(note.share_count) || 0,
      saves: Number(note.collected_count) || 0,
    })),
  };
}

async function collectDouyin(url: string): Promise<CreatorProfile> {
  await execBrowser(['open', url]);
  await new Promise((r) => setTimeout(r, 5000));

  const profileOut = await execBrowser([
    'eval',
    `JSON.stringify({ title: document.title, text: document.body.innerText.slice(0, 5000), url: window.location.href })`,
    '--json',
  ]);
  const pageData = parseBrowserOutput<{ title: string; text: string; url: string }>(profileOut);

  const fansMatch = pageData.text.match(/粉丝\s*([\d,]+)/);
  const likesMatch = pageData.text.match(/获赞\s*([\d,]+)/);
  const idMatch = pageData.text.match(/抖音号[：:]\s*(\S+)/);
  const parseNum = (s?: string) => Number(s?.replace(/,/g, '') ?? '0') || 0;

  return {
    platform: 'douyin',
    profileUrl: url,
    fetchedAt: new Date().toISOString(),
    source: 'manual_import',
    profile: {
      nickname: pageData.title.replace(/ - 抖音.*$/, '').trim() || 'Douyin Creator',
      uniqueId: idMatch?.[1] ?? 'unknown',
      followers: parseNum(fansMatch?.[1]),
      likesTotal: parseNum(likesMatch?.[1]),
      videosCount: 0,
    },
    posts: [],
  };
}

// ---------------------------------------------------------------------------
// MCP Protocol Implementation (stdio JSON-RPC)
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function success(id: number | string, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function error(id: number | string, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP tools/list response)
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: 'collect_xhs',
    description: 'Collect Red Note (XiaoHongShu) creator profile and posts via bb-browser. Requires user to be logged in to xiaohongshu.com in their browser.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'XHS user ID (from profile URL)' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'collect_douyin',
    description: 'Collect Douyin creator profile via bb-browser page automation. Requires user to be logged in to creator.douyin.com.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Douyin creator page URL' },
      },
      required: ['url'],
    },
  },
  {
    name: 'list_platforms',
    description: 'List all supported data collection platforms and their status.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  switch (req.method) {
    case 'initialize':
      return success(req.id, {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'dashpersona-browser-mcp', version: '0.1.0' },
        capabilities: { tools: {} },
      });

    case 'tools/list':
      return success(req.id, { tools: TOOL_DEFINITIONS });

    case 'tools/call': {
      const toolName = req.params?.name as string;
      const args = (req.params?.arguments ?? {}) as Record<string, string>;

      try {
        switch (toolName) {
          case 'collect_xhs': {
            if (!args.userId) return error(req.id, -32602, 'Missing required param: userId');
            const profile = await collectXhs(args.userId);
            return success(req.id, {
              content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
            });
          }
          case 'collect_douyin': {
            if (!args.url) return error(req.id, -32602, 'Missing required param: url');
            const profile = await collectDouyin(args.url);
            return success(req.id, {
              content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
            });
          }
          case 'list_platforms':
            return success(req.id, {
              content: [{ type: 'text', text: JSON.stringify(PLATFORMS, null, 2) }],
            });
          default:
            return error(req.id, -32601, `Unknown tool: ${toolName}`);
        }
      } catch (err) {
        const msg = err instanceof BrowserAdapterError
          ? `[${err.code}] ${err.message}`
          : err instanceof Error ? err.message : String(err);
        return success(req.id, {
          content: [{ type: 'text', text: `Error: ${msg}` }],
          isError: true,
        });
      }
    }

    default:
      return error(req.id, -32601, `Method not found: ${req.method}`);
  }
}

// ---------------------------------------------------------------------------
// stdio transport
// ---------------------------------------------------------------------------

async function main() {
  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line) as JsonRpcRequest;
      const res = await handleRequest(req);
      process.stdout.write(JSON.stringify(res) + '\n');
    } catch {
      process.stdout.write(
        JSON.stringify(error(0, -32700, 'Parse error')) + '\n',
      );
    }
  }
}

main().catch((err) => {
  process.stderr.write(`MCP server fatal: ${err}\n`);
  process.exit(1);
});
