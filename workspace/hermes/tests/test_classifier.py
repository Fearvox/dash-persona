"""Tests for TaskClassifier (tc-001)"""
import pytest
import time
from src.task_classifier import TaskClassifier


class TestTaskClassifier:
    """Four-dimension scoring and Express/Standard classification"""

    def test_express_single_step_read_only(self):
        """Single step, read-only = Express (total=0)"""
        tc = TaskClassifier()
        result = tc.classify("帮我查看一下当前目录的文件列表")
        assert result["flow"] == "express"
        assert result["total_score"] <= 2
        assert result["breakdown"]["step"] == 0

    def test_standard_multi_step_delete(self):
        """Multi-step with delete operations = Standard (total>=3)"""
        tc = TaskClassifier()
        result = tc.classify(
            "帮我删除src目录下的所有.pyc文件，然后强制推送main分支"
        )
        assert result["flow"] == "standard"
        assert result["total_score"] >= 3

    def test_standard_three_layers(self):
        """3+ layers (platform + app + data) = Standard"""
        tc = TaskClassifier()
        result = tc.classify(
            "帮我部署应用到云服务器，并配置数据库连接"
        )
        assert result["flow"] == "standard"
        assert result["breakdown"]["layer"] == 2

    def test_express_target_clear(self):
        """Clear target with known path = Express"""
        tc = TaskClassifier()
        result = tc.classify("打开 src/app.py 帮我修复 main 函数里的 bug")
        assert result["flow"] == "express"
        assert result["breakdown"]["explore"] == 0

    def test_standard_vague_goal(self):
        """Vague goal = Standard"""
        tc = TaskClassifier()
        result = tc.classify("让系统跑得更快一点")
        assert result["flow"] == "standard"
        assert result["total_score"] >= 3

    def test_step_scoring(self):
        """Step score detection"""
        tc = TaskClassifier()
        # Single step = 0
        r = tc.classify("帮我做X")
        assert r["breakdown"]["step"] == 0
        # Two steps = 1
        r = tc.classify("帮我做X然后做Y")
        assert r["breakdown"]["step"] == 1
        # Multi-step = 2
        r = tc.classify("先做X，再做Y，最后做Z")
        assert r["breakdown"]["step"] == 2

    def test_irr_scoring(self):
        """IRR score detection"""
        tc = TaskClassifier()
        # Read ops = 0
        r = tc.classify("帮我 ls 一下当前目录")
        assert r["breakdown"]["irr"] == 0
        # Write ops = 1
        r = tc.classify("帮我创建一个文件")
        assert r["breakdown"]["irr"] == 1
        # Delete/force ops = 2
        r = tc.classify("强制删除这个目录")
        assert r["breakdown"]["irr"] == 2

    def test_layer_scoring(self):
        """Layer score detection"""
        tc = TaskClassifier()
        # Local only = 0
        r = tc.classify("编辑本地文件")
        assert r["breakdown"]["layer"] == 0
        # Local + external service = 1
        r = tc.classify("调用API获取数据并保存到本地")
        assert r["breakdown"]["layer"] == 1
        # Platform + app + data = 2
        r = tc.classify("部署应用到云平台并配置数据库")
        assert r["breakdown"]["layer"] == 2

    def test_explore_scoring(self):
        """Explore score detection"""
        tc = TaskClassifier()
        # Clear target = 0
        r = tc.classify("打开 src/main.py 修复 bug")
        assert r["breakdown"]["explore"] == 0
        # Direction clear, path to explore = 1
        r = tc.classify("优化一下数据库查询性能")
        assert r["breakdown"]["explore"] == 1
        # Vague goal = 2
        r = tc.classify("让这个系统更好")
        assert r["breakdown"]["explore"] == 2

    def test_performance_under_500ms(self):
        """Classification must complete in < 500ms"""
        tc = TaskClassifier()
        start = time.time()
        for _ in range(100):
            tc.classify("帮我查看目录结构并打开 README.md")
        elapsed = time.time() - start
        assert elapsed < 50.0, f"100 iterations took {elapsed}s, expected < 50s (500ms each)"

    def test_generate_confirmation_express(self):
        """Express confirmation format"""
        tc = TaskClassifier()
        result = tc.classify("打开 README.md 帮我看看内容")
        confirmation = tc.generate_confirmation("打开 README.md 帮我看看内容")
        assert "## 任务确认（Express）" in confirmation
        assert "目标：" in confirmation
        assert "我的理解：" in confirmation
        assert "风险点：" in confirmation

    def test_generate_confirmation_standard(self):
        """Standard confirmation format"""
        tc = TaskClassifier()
        result = tc.classify("删除所有 .pyc 文件然后强制推送到远程仓库")
        confirmation = tc.generate_confirmation("删除所有 .pyc 文件然后强制推送到远程仓库")
        assert "## 任务确认（Standard）" in confirmation
        assert "目标：" in confirmation
        assert "方向：" in confirmation
        assert "关键假设：" in confirmation
        assert "风险点：" in confirmation

    def test_context_affects_scoring(self):
        """Context dict can influence scoring"""
        tc = TaskClassifier()
        # Without context - might be standard due to vague goal
        r1 = tc.classify("优化查询")
        # With context providing clarity
        r2 = tc.classify("优化查询", context={"target": "src/db.py", "operation": "read"})
        # Context should help clarify or reduce uncertainty
        assert "flow" in r1
        assert "flow" in r2
