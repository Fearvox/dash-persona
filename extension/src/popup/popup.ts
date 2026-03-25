import type { CollectionState, CollectionStep, Post } from '../shared/types';
import { parseDouyinXlsx, xlsxRowsToPosts } from '../shared/parse-xlsx';

const STEP_LABELS: { step: CollectionStep; label: string }[] = [
  { step: 'collecting_profile', label: 'Profile + Posts' },
  { step: 'collecting_overview', label: 'Account Overview' },
  { step: 'collecting_post_list', label: 'Post Analysis' },
  { step: 'collecting_fans', label: 'Fan Portrait' },
  { step: 'merging', label: 'Merging data' },
  { step: 'sending', label: 'Sending to DashPersona' },
];

const ACTIVE_COLLECTING_STEPS: CollectionStep[] = [
  'collecting_profile', 'collecting_overview', 'collecting_posts',
  'collecting_post_list', 'collecting_fans', 'merging', 'sending',
];

function isCollecting(step: CollectionStep): boolean {
  return ACTIVE_COLLECTING_STEPS.includes(step);
}

function getStepIndex(step: CollectionStep): number {
  return STEP_LABELS.findIndex(s => s.step === step);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// Safe DOM builder helpers
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function div(cls: string, ...children: (Node | string)[]): HTMLDivElement {
  return el('div', { class: cls }, ...children);
}

function span(cls: string, text: string): HTMLSpanElement {
  return el('span', { class: cls }, text);
}

function p(cls: string, text: string): HTMLParagraphElement {
  return el('p', { class: cls }, text);
}

function statusRow(dotCls: string, subText: string): HTMLDivElement {
  return div('status-row',
    div(`status-dot ${dotCls}`),
    span('sub', subText),
  );
}

function renderIdle(): Node {
  const wrap = div('state-idle');
  wrap.append(
    statusRow('subtle', 'Ready to collect'),
    p('headline', 'Capture your Douyin creator data'),
    p('sub', 'Opens 4 pages in the Douyin creator center and extracts your profile, posts, account diagnostics, and fan portrait in one click.'),
  );
  return wrap;
}

function renderNotOnPlatform(): Node {
  const wrap = div('state-not-on-platform');
  const box = div('platform-box');
  box.append(
    document.createTextNode('Open the Douyin creator center to use Data Passport.'),
    el('div', { class: 'platform-url' }, 'creator.douyin.com'),
  );
  wrap.append(
    statusRow('yellow', 'Not on Douyin Creator Center'),
    p('headline', 'Navigate to creator.douyin.com'),
    box,
  );
  return wrap;
}

function renderCollecting(state: CollectionState): Node {
  const totalSteps = STEP_LABELS.length;
  const currentIdx = getStepIndex(state.step);
  const progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / totalSteps) * 100) : 10;

  const spinnerRow = div('status-row', div('spinner'), span('sub', state.stepLabel || 'Collecting...'));

  const progressBar = div('progress-bar');
  progressBar.style.width = `${progress}%`;
  const progressWrap = div('progress-wrap', progressBar);

  const stepList = div('step-list');
  for (let i = 0; i < STEP_LABELS.length; i++) {
    const s = STEP_LABELS[i];
    let cls = 'step-row';
    let icon = '\u00B7';
    if (i < currentIdx) { cls += ' done'; icon = '+'; }
    else if (i === currentIdx) { cls += ' active'; icon = '>'; }
    stepList.append(div(cls, el('span', { class: 'step-icon' }, icon), document.createTextNode(s.label)));
  }

  const wrap = div('state-collecting');
  wrap.append(spinnerRow, progressWrap, stepList);
  return wrap;
}

function renderDone(state: CollectionState): Node {
  const profile = state.profile?.profile;
  const posts = state.profile?.posts ?? [];
  const followers = profile?.followers ?? 0;
  const postsCount = posts.length;
  const timestamp = state.lastCollectedAt ? formatTimestamp(state.lastCollectedAt) : '';

  const followerCard = div('stat-card',
    el('div', { class: 'stat-value' }, followers.toLocaleString()),
    el('div', { class: 'stat-label' }, 'Followers'),
  );
  const postsCard = div('stat-card',
    el('div', { class: 'stat-value' }, String(postsCount)),
    el('div', { class: 'stat-label' }, 'Posts captured'),
  );
  const statsGrid = div('stats-grid', followerCard, postsCard);

  const wrap = div('state-done');
  wrap.append(
    statusRow('green', `Collection complete${timestamp ? ` \u00B7 ${timestamp}` : ''}`),
    p('headline', profile?.nickname ?? 'Creator'),
    statsGrid,
    p('sub-subtle', 'Data sent to DashPersona. Switch to that tab to see your analysis.'),
  );
  return wrap;
}

function renderError(state: CollectionState): Node {
  const errorBox = div('error-box');
  errorBox.textContent = state.error ?? 'Unknown error';

  const wrap = div('state-error');
  wrap.append(
    statusRow('red', 'Collection failed'),
    p('headline', 'Something went wrong'),
    errorBox,
    p('sub', 'Make sure you are logged in to creator.douyin.com and try again.'),
  );
  return wrap;
}

function buildFooter(state: CollectionState, isOnPlatform: boolean): Node {
  const frag = document.createDocumentFragment();

  if (!isOnPlatform) {
    const btn = el('button', { class: 'btn btn-primary', id: 'btn-open-douyin' }, 'Open Douyin Creator Center');
    frag.append(btn);
    return frag;
  }

  if (isCollecting(state.step)) {
    const btn = el('button', { class: 'btn btn-primary' }, 'Collecting...');
    btn.disabled = true;
    frag.append(btn);
    return frag;
  }

  if (state.step === 'done') {
    frag.append(
      el('button', { class: 'btn btn-primary', id: 'btn-start' }, 'Collect Again'),
      el('button', { class: 'btn btn-ghost', id: 'btn-import' }, 'Import Exported File'),
      el('button', { class: 'btn btn-ghost', id: 'btn-open-dash' }, 'View in DashPersona'),
    );
    return frag;
  }

  if (state.step === 'error') {
    frag.append(el('button', { class: 'btn btn-primary', id: 'btn-start' }, 'Retry Collection'));
    return frag;
  }

  // idle
  frag.append(
    el('button', { class: 'btn btn-primary', id: 'btn-start' }, 'Start Collection'),
    el('button', { class: 'btn btn-ghost', id: 'btn-import' }, 'Import Exported File'),
  );
  return frag;
}

function render(state: CollectionState, isOnPlatform: boolean): void {
  const content = document.getElementById('content');
  const footer = document.getElementById('footer');
  if (!content || !footer) return;

  content.replaceChildren();
  footer.replaceChildren();

  if (!isOnPlatform) {
    content.append(renderNotOnPlatform());
  } else if (isCollecting(state.step)) {
    content.append(renderCollecting(state));
  } else if (state.step === 'done') {
    content.append(renderDone(state));
  } else if (state.step === 'error') {
    content.append(renderError(state));
  } else {
    content.append(renderIdle());
  }

  footer.append(buildFooter(state, isOnPlatform));
  attachListeners();
}

function attachListeners(): void {
  const btnStart = document.getElementById('btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'START_COLLECTION' });
    });
  }

  const btnOpenDouyin = document.getElementById('btn-open-douyin');
  if (btnOpenDouyin) {
    btnOpenDouyin.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://creator.douyin.com/creator-micro/home' });
      window.close();
    });
  }

  const btnOpenDash = document.getElementById('btn-open-dash');
  if (btnOpenDash) {
    btnOpenDash.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://dash-persona.vercel.app/dashboard?source=extension' });
      window.close();
    });
  }

  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', handleFileImport);
  }
}

/**
 * Open file picker, parse xlsx, merge posts into profile, send to DashPersona.
 */
function handleFileImport(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseDouyinXlsx(buffer);
      const posts = xlsxRowsToPosts(parsed);

      if (posts.length === 0) {
        showImportStatus(`No data found in ${file.name}`, true);
        return;
      }

      // Send imported posts to service worker for merging
      chrome.runtime.sendMessage({
        type: 'IMPORT_FILE_DATA',
        posts,
        fileName: file.name,
      });

      showImportStatus(`Imported ${posts.length} posts from ${file.name}`, false);
    } catch (err) {
      showImportStatus(`Failed to parse: ${String(err)}`, true);
    }

    document.body.removeChild(input);
  });

  input.click();
}

function showImportStatus(message: string, isError: boolean): void {
  const content = document.getElementById('content');
  if (!content) return;

  const banner = div(isError ? 'error-box' : 'success-box', message);
  content.prepend(banner);

  // Auto-remove after 4 seconds
  setTimeout(() => banner.remove(), 4000);
}

async function checkPlatform(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? '';
      resolve(url.includes('creator.douyin.com'));
    });
  });
}

// Boot
async function boot(): Promise<void> {
  const isOnPlatform = await checkPlatform();

  // Get current state from service worker
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response: CollectionState | undefined) => {
    const state: CollectionState = response ?? {
      step: 'idle', currentStepIndex: 0, totalSteps: 4,
      stepLabel: '', profile: null, fanPortrait: null, diagnostics: null,
      error: null, lastCollectedAt: null,
    };
    render(state, isOnPlatform);
  });

  // Listen for state updates
  chrome.runtime.onMessage.addListener((message: { type: string; state?: CollectionState }) => {
    if (message.type === 'STATE_UPDATE' && message.state) {
      render(message.state, isOnPlatform);
    }
  });
}

boot();
