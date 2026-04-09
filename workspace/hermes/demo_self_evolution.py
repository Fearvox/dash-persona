#!/usr/bin/env python3
"""
Self-Evolution Loop Demo — 跑一遍完整流程
Usage: python3 demo_self_evolution.py
"""

from src.evolution_memory import EvolutionStorage
from src.task_classifier import TaskClassifier
from src.checkpoints import PreCheckpoint, MidCheckpoint, PostCheckpoint
from src.adversarial_reviewer import AdversarialReviewer
from src.codex_arbitrator import CodexArbitrator
from src.self_evolution import SelfEvolutionLoop


def main():
    print("=" * 60)
    print("Self-Evolution Loop Demo")
    print("=" * 60)

    # ── 1. 初始化所有组件 ─────────────────────────────────────────
    storage = EvolutionStorage()
    classifier = TaskClassifier()
    pre_cp = PreCheckpoint(classifier)
    mid_cp = MidCheckpoint(classifier)
    post_cp = PostCheckpoint(storage)
    arbitrator = CodexArbitrator()
    reviewer = AdversarialReviewer(storage)

    loop = SelfEvolutionLoop(
        classifier=classifier,
        pre_checkpoint=pre_cp,
        mid_checkpoint=mid_cp,
        post_checkpoint=post_cp,
        storage=storage,
        arbitrator=arbitrator,
    )

    # ── 2. 模拟任务场景 ──────────────────────────────────────────
    task = "修复 Vercel 部署后 API 路由返回 404 的问题"

    print(f"\n## 任务: {task}\n")

    # Step 1: ACTIVATE + CLASSIFY + PRE-CHECKPOINT
    print("── [ACTIVATE → CLASSIFY → PRE-CHECKPOINT] ──")
    result = loop.run(task, initial_hypothesis="可能是 Vercel rewrite 规则配置错误")
    print(f"Flow: {result['flow']}")
    print(f"Matched memories: {len(result['matched_memories'])} 个")
    if result['suggestions']:
        print(f"Suggestions: {result['suggestions'][:2]}")
    print(f"Classify breakdown: {result['classify_breakdown']}")

    # Step 2: Mid-checkpoint（模拟用户消息中出现假设断裂）
    print("\n── [MID-CHECKPOINT] ──")
    mid_result = loop.check_mid(
        message="等等，我刚发现测试环境也有同样的问题，但那边根本没有 Vercel rewrite 配置",
        context={'task': task},
    )
    print(f"Mid triggered: {mid_result.get('triggered')}")
    if mid_result.get('triggered'):
        print(f"Keywords: {mid_result.get('matched_keywords')}")
        print(f"Confidence: {mid_result.get('confidence', 0):.2f}")

    # Step 3: Codex 仲裁（同步调用，15s 超时）
    print("\n── [CODEX ARBITRATOR] ──")
    codex_result = arbitrator.arbitrate_sync(
        question=f"Mid-checkpoint triggered: {mid_result.get('matched_keywords')}",
        context={'task': task, 'confidence': mid_result.get('confidence', 0.5)},
        timeout=15,
    )
    print(f"Codex available: {codex_result.get('available')}")
    if codex_result.get('available'):
        print(f"Layer: {codex_result.get('layer_judgment')}")
        print(arbitrator.format_arbitration(codex_result))
    else:
        print(f"Codex fallback: {codex_result.get('fallback')}")

    # Step 4: Adversarial Review（模拟 CCB phase）
    print("\n── [ADVERSARIAL REVIEWER] ──")
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        phase_dir = Path(tmpdir) / "phase-001"
        phase_dir.mkdir()

        (phase_dir / "SUMMARY.md").write_text("""
# Phase 1 Summary

## 完成的 REQUIREMENTS
- [REQ-001] 修复 API 404 问题
- [REQ-002] 验证 Vercel rewrite 规则

## 技术说明
我们修改了 vercel.json，添加了 rewrite 规则将 /api/* 指向正确的服务端点。
        """)

        (phase_dir / "REQUIREMENTS.md").write_text("""
# Phase 1 Requirements

- [REQ-001] 修复 API 404 问题
- [REQ-002] 验证 Vercel rewrite 规则
- [REQ-003] 确认测试环境和生产环境行为一致
        """)

        review_result = reviewer.review_phase(str(phase_dir))
        print(f"Verdict: {review_result['verdict']}")
        print(f"Critical findings: {len(review_result['findings']['critical'])}")
        print(f"Important findings: {len(review_result['findings']['important'])}")
        for f in review_result['findings']['critical']:
            print(f"  🔴 {f}")

    # Step 5: Post-checkpoint（任务完成）
    print("\n── [POST-CHECKPOINT] ──")
    post_result = post_cp.run(
        task=task,
        deliverables=[
            "修改了 vercel.json 添加 rewrite 规则",
            "验证了 /api/hotels 路由正常工作",
        ],
        hypotheses={
            "Vercel rewrite 规则配置错误导致 404": "rejected",
            "生产环境和测试环境配置一致": "verified",
            "Vercel rewrite 规则不影响测试环境": "unverified",
        },
    )
    print(post_result['summary'])
    print(f"\nSummary ID: {post_result['summary_id']}")

    # Step 6: 查看存储的信号
    print("\n── [EVOLUTION STORAGE] ──")
    signals = storage.get_signals()
    summaries = storage.get_summaries()
    print(f"Signals stored: {len(signals)}")
    print(f"Task summaries: {len(summaries)}")

    print("\n" + "=" * 60)
    print("Demo 完成 ✓")
    print("=" * 60)


if __name__ == "__main__":
    main()
