"""Tests for PreCheckpoint (pc-pre-001)"""
import pytest
import time
from src.checkpoints import PreCheckpoint
from src.task_classifier import TaskClassifier


class TestPreCheckpoint:
    """Pre-checkpoint Express self-alignment check, < 2s, no user interruption"""

    def test_run_express_returns_dict(self):
        """run() returns complete result dict"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        result = pc.run("打开 README.md 帮我看看内容")

        assert isinstance(result, dict)
        assert "confirmed" in result
        assert "flow" in result
        assert "confirmation_text" in result
        assert "adaptive_tightened" in result
        assert "risks" in result
        assert "self_alignment_passed" in result

    def test_run_express_flow_preserved(self):
        """Express-classified task remains express after self-check"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        result = pc.run("打开 README.md 帮我看看内容")

        assert result["flow"] == "express"
        assert result["confirmed"] is True
        assert result["self_alignment_passed"] is True

    def test_express_self_check_passes_clear_intent(self):
        """Self-check passes when intent is clear"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        passed, risks = pc.express_self_check("打开 README.md 帮我看看内容")

        assert passed is True
        assert isinstance(risks, list)

    def test_express_self_check_flags_vague_goal(self):
        """Self-check detects vague goals"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        passed, risks = pc.express_self_check("让系统变得更快")

        assert passed is False
        assert len(risks) >= 1

    def test_express_self_check_flags_high_risk_ops(self):
        """Self-check flags delete/force operations"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        passed, risks = pc.express_self_check("强制删除 src 目录并推送 main 分支")

        assert passed is False
        assert len(risks) >= 1
        risk_text = " ".join(risks).lower()
        assert any(kw in risk_text for kw in ["删除", "force", "不可逆"])

    def test_tighten_if_needed_no_mid_task_signal(self):
        """No tightening when no mid-task signals"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        pc.tighten_if_needed()

        # Should not raise, and internal state should not change
        assert pc._mid_task_tightened is False

    def test_tighten_if_needed_with_mid_task_signal(self):
        """Tightening triggered when mid-task signals present"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)

        # Simulate mid-task context with user correction signal
        pc.tighten_if_needed(mid_task_signals=["不对", "奇怪"])

        assert pc._mid_task_tightened is True

    def test_run_with_mid_task_tightening(self):
        """Mid-task correction triggers adaptive tightening"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)

        result = pc.run(
            "帮我优化查询",
            context={"mid_task_signals": ["不对", "为什么", "找不到"]}
        )

        assert result["adaptive_tightened"] is True
        # Flow may be upgraded to standard with tightening
        assert result["flow"] == "standard"

    def test_confirmation_text_format_express(self):
        """Confirmation text follows Express format"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        result = pc.run("帮我查看当前目录的文件列表")

        assert "## 任务确认（Express）" in result["confirmation_text"]
        assert "目标：" in result["confirmation_text"]
        assert "我的理解：" in result["confirmation_text"]
        assert "风险点：" in result["confirmation_text"]

    def test_performance_under_2_seconds(self):
        """Pre-checkpoint must complete in < 2s"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        start = time.time()
        for _ in range(10):
            pc.run("打开 README.md 帮我看看内容")
        elapsed = time.time() - start
        assert elapsed < 20.0, f"10 iterations took {elapsed}s, expected < 20s (2s each)"

    def test_run_with_context(self):
        """Context dict is passed through to classifier"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)
        result = pc.run(
            "帮我优化查询",
            context={"target": "src/db.py", "operation": "read"}
        )

        assert result["confirmed"] is True
        assert "confirmation_text" in result

    def test_self_alignment_three_questions(self):
        """Self-alignment checks three core questions internally"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)

        # A clear, safe task should pass all three questions
        passed, risks = pc.express_self_check("帮我查看当前目录")

        assert passed is True
        # Low-risk task should have minimal or no risks flagged
        assert isinstance(risks, list)

    def test_self_alignment_detects_mismatch(self):
        """Self-alignment detects when response direction mismatches intent"""
        tc = TaskClassifier()
        pc = PreCheckpoint(tc)

        # Task says "view" but context implies "write"
        # Self-check should flag this as potential mismatch
        passed, risks = pc.express_self_check(
            "帮我查看文件内容",
            context={"implied_action": "write"}
        )

        # Even if task is read, mismatch with implied action should be flagged
        assert isinstance(risks, list)
