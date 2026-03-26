import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '安装指南 — DashPersona',
  description: 'DashPersona CLI 安装教程 — 获取完整数据分析功能',
};

/* ── Local helper components ────────────────────────────── */

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: 'rgba(126, 210, 154, 0.15)',
            color: 'var(--accent-green)',
          }}
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3
            className="text-base font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {children}
        </div>
      </div>
    </div>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div
      className="overflow-x-auto rounded-lg px-4 py-3"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <code
        className="text-sm leading-relaxed"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-green)',
        }}
      >
        {command}
      </code>
    </div>
  );
}


function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="card p-5">
      <h4
        className="mb-2 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {question}
      </h4>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {answer}
      </p>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function InstallPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      {/* ── Header ── */}
      <header>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
        >
          &larr; 返回首页
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          安装 DashPersona CLI
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          按照以下步骤在您的电脑上安装 DashPersona 完整版。无需编程经验，整个过程约 10 分钟。
        </p>
      </header>

      {/* ── Full version unlocks ── */}
      <section aria-labelledby="unlocks-heading">
        <h2 id="unlocks-heading" className="kicker mb-4">
          完整版解锁功能
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div
            className="card p-4"
            style={{ borderColor: 'rgba(126, 210, 154, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-green)' }}
            >
              实时数据采集
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              直接从平台采集最新数据，告别手动导出
            </p>
          </div>

          <div
            className="card p-4"
            style={{ borderColor: 'rgba(210, 200, 126, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-yellow)' }}
            >
              深度人设分析
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              解锁全部 9 个分析模块，获取完整洞察报告
            </p>
          </div>

          <div
            className="card p-4"
            style={{ borderColor: 'rgba(126, 184, 210, 0.2)' }}
          >
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-blue)' }}
            >
              跨平台对比
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              抖音、TikTok、小红书多平台数据对比分析
            </p>
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section aria-labelledby="requirements-heading">
        <h2 id="requirements-heading" className="kicker mb-4">
          准备工作
        </h2>
        <div className="card p-5">
          <ul className="flex flex-col gap-2">
            {[
              'Chrome 浏览器（最新版本）',
              'macOS、Windows 或 Linux 操作系统',
              '约 10 分钟的时间',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{
                    background: 'rgba(126, 210, 154, 0.15)',
                    color: 'var(--accent-green)',
                  }}
                >
                  &#10003;
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 5-step guide ── */}
      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="kicker mb-4">
          安装步骤
        </h2>
        <div className="flex flex-col gap-4">
          {/* Step 1 */}
          <StepCard step={1} title="安装 Node.js">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Node.js 是运行 DashPersona 所需的基础环境。请访问官网下载安装包：
            </p>
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent-green)' }}
            >
              nodejs.org &rarr;
            </a>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              安装完成后，打开终端（Terminal）输入以下命令验证：
            </p>
            <CommandBlock command="node --version" />
            <Image
              src="/screenshots/install-node-version.png"
              alt="终端显示 node --version 输出 v25.8.0"
              width={720}
              height={90}
              className="rounded-lg"
              style={{ border: '1px solid var(--border-subtle)' }}
            />
          </StepCard>

          {/* Step 2 */}
          <StepCard step={2} title="安装 Claude Code CLI">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Claude Code 是 DashPersona 的运行引擎。在终端中执行：
            </p>
            <CommandBlock command="npm install -g @anthropic-ai/claude-code" />
            <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
              安装完成后，可以用 <code
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >claude --version</code> 验证。
            </p>
          </StepCard>

          {/* Step 3 */}
          <StepCard step={3} title="安装 web-access 技能包">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              web-access 让 DashPersona 能够访问社交媒体平台并采集数据：
            </p>
            <CommandBlock command="claude skill install --global github.com/eze-is/web-access" />
          </StepCard>

          {/* Step 4 */}
          <StepCard step={4} title="开启 Chrome 远程调试">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              DashPersona 通过 Chrome 的调试接口读取您的创作者中心数据。只需三步：
            </p>
            <ol
              className="flex flex-col gap-2 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>1.</span>
                <span>打开 Chrome，在地址栏输入 <code
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >chrome://inspect/#remote-debugging</code></span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>2.</span>
                <span>勾选 <strong style={{ color: 'var(--text-primary)' }}>&quot;Allow remote debugging for this browser instance&quot;</strong> 复选框</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" style={{ color: 'var(--text-subtle)' }}>3.</span>
                <span>重启 Chrome（关闭所有窗口后重新打开）</span>
              </li>
            </ol>
            <Image
              src="/screenshots/install-chrome-debugging.png"
              alt="Chrome inspect 页面 — 勾选 Allow remote debugging for this browser instance"
              width={720}
              height={480}
              className="rounded-lg"
              style={{ border: '1px solid var(--border-subtle)' }}
            />
          </StepCard>

          {/* Step 5 */}
          <StepCard step={5} title="开始采集数据">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              一切就绪！前往数据导入页面，选择您要分析的平台，开始采集第一份数据：
            </p>
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                background: 'var(--accent-green)',
                color: 'var(--bg-primary)',
              }}
            >
              前往数据导入 &rarr;
            </Link>
          </StepCard>
        </div>
      </section>

      {/* ── Troubleshooting FAQ ── */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="kicker mb-4">
          常见问题
        </h2>
        <div className="flex flex-col gap-3">
          <FaqItem
            question="输入 node --version 提示「command not found」怎么办？"
            answer="说明 Node.js 尚未正确安装或未添加到系统 PATH。请重新从 nodejs.org 下载安装，安装过程中确保勾选「Add to PATH」选项。安装完成后关闭并重新打开终端再试。"
          />
          <FaqItem
            question="npm install 报权限错误（EACCES）怎么办？"
            answer="macOS/Linux 用户可在命令前加 sudo 以管理员权限运行：sudo npm install -g @anthropic-ai/claude-code。Windows 用户请以管理员身份运行命令提示符或 PowerShell。"
          />
          <FaqItem
            question="Chrome 远程调试端口连接失败？"
            answer="请确保没有其他 Chrome 实例在运行。先完全关闭所有 Chrome 窗口，然后用上面的命令重新启动。如果端口 9222 被占用，可以换用其他端口号，如 --remote-debugging-port=9223。"
          />
          <FaqItem
            question="数据采集速度很慢或中途中断？"
            answer="采集速度取决于网络状况和平台响应速度。建议保持网络稳定，不要在采集过程中手动操作浏览器。如果中断，DashPersona 会自动记录进度，重新运行即可从断点继续。"
          />
        </div>
      </section>

      {/* ── Footer link ── */}
      <footer className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
        >
          &larr; 返回首页
        </Link>
      </footer>
    </div>
  );
}
