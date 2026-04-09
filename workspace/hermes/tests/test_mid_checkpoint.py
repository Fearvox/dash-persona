"""Tests for MidCheckpoint (pc-mid-001): assumption fracture detection, keyword matching < 100ms"""
import pytest
import time
from src.checkpoints import MidCheckpoint


class TestMidCheckpoint:
    """Mid-checkpoint: assumption fracture detection with keyword matching"""

    def test_check_returns_dict(self):
        """check() returns complete result dict"""
        mc = MidCheckpoint()
        result = mc.check("文件打开失败了")

        assert isinstance(result, dict)
        assert "triggered" in result
        assert "signal_type" in result
        assert "matched_keywords" in result
        assert "layer_judgment" in result
        assert "fracture_report" in result
        assert "adaptive_tightened" in result
        assert "confidence" in result

    def test_keyword_match_triggers(self):
        """Keyword match from Type A list triggers checkpoint"""
        mc = MidCheckpoint()
        result = mc.check("这个不对，结果和预期不一样")

        assert result["triggered"] is True
        assert result["signal_type"] == "keyword"
        assert "不对" in result["matched_keywords"]

    def test_keyword_match_multiple_keywords(self):
        """Multiple keywords in same message are all matched"""
        mc = MidCheckpoint()
        result = mc.check("为什么还是报错？404错误，找不到页面")

        assert result["triggered"] is True
        assert result["signal_type"] == "keyword"
        assert len(result["matched_keywords"]) >= 3
        assert "为什么" in result["matched_keywords"]
        assert "404" in result["matched_keywords"]
        assert "找不到" in result["matched_keywords"]

    def test_no_keyword_match_returns_not_triggered(self):
        """Message without keywords does not trigger"""
        mc = MidCheckpoint()
        result = mc.check("帮我查看一下目录结构")

        assert result["triggered"] is False
        assert result["signal_type"] is None
        assert result["matched_keywords"] == []

    def test_layer_judgment_platform(self):
        """Platform layer keywords trigger platform layer judgment"""
        mc = MidCheckpoint()
        result = mc.check("平台层的CDN配置有问题，vercel部署失败")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "platform"

    def test_layer_judgment_application(self):
        """Application layer keywords trigger application layer judgment"""
        mc = MidCheckpoint()
        result = mc.check("应用层的路由逻辑不对，app.py的handler有问题")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "application"

    def test_layer_judgment_data(self):
        """Data layer keywords trigger data layer judgment"""
        mc = MidCheckpoint()
        result = mc.check("数据层的查询有问题，database连接失败")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "data"

    def test_keyword_matching_case_insensitive(self):
        """Keyword matching is case insensitive"""
        mc = MidCheckpoint()
        result = mc.check("404 ERROR - 找不到资源")

        assert result["triggered"] is True
        assert "404" in result["matched_keywords"]

    def test_keyword_matching_chinese_english(self):
        """Both Chinese and English keywords are matched"""
        mc = MidCheckpoint()
        result = mc.check("500 Internal Server Error，报错了")

        assert result["triggered"] is True
        assert "500" in result["matched_keywords"]
        assert "报错" in result["matched_keywords"]

    def test_fracture_report_generated_when_triggered(self):
        """Fracture report is generated when triggered"""
        mc = MidCheckpoint()
        result = mc.check("这个逻辑不对，按理说应该这样处理", initial_hypothesis="使用缓存优化性能")

        assert result["triggered"] is True
        assert result["fracture_report"] is not None
        assert "假设断裂报告" in result["fracture_report"]
        assert "原始假设" in result["fracture_report"]
        assert "断裂信号" in result["fracture_report"]
        assert "建议" in result["fracture_report"]

    def test_fracture_report_contains_context(self):
        """Fracture report contains hypothesis and matched keywords"""
        mc = MidCheckpoint()
        result = mc.check("奇怪，500错误", initial_hypothesis="服务应该正常运行")

        assert result["fracture_report"] is not None
        report = result["fracture_report"]
        assert "500错误" in report or "500" in report

    def test_confidence_score_range(self):
        """Confidence score is between 0.0 and 1.0"""
        mc = MidCheckpoint()

        result1 = mc.check("不对，404")
        assert 0.0 <= result1["confidence"] <= 1.0

        result2 = mc.check("帮我看看目录")
        assert 0.0 <= result2["confidence"] <= 1.0

    def test_confidence_higher_with_more_keywords(self):
        """More matched keywords yields higher confidence"""
        mc = MidCheckpoint()

        result1 = mc.check("不对")
        result2 = mc.check("不对 奇怪 为什么 找不到")

        assert result2["confidence"] >= result1["confidence"]

    def test_reasoning_backup_detection(self):
        """Type B reasoning backup detects contradiction"""
        mc = MidCheckpoint()
        result = mc.check(
            "Initial approach was wrong, need to check platform layer instead",
            initial_hypothesis="Application layer logic is correct",
            detected_contradiction="Platform evidence contradicts application assumption"
        )

        assert result["triggered"] is True
        assert result["signal_type"] == "reasoning"

    def test_adaptive_tightened_when_express_flow(self):
        """adaptive_tightened flag is set when in Express flow context"""
        mc = MidCheckpoint()
        result = mc.check("不对，结果和预期不符", in_express_flow=True)

        assert result["triggered"] is True
        assert result["adaptive_tightened"] is True

    def test_performance_keyword_match_under_100ms(self):
        """Keyword matching completes in < 100ms"""
        mc = MidCheckpoint()
        test_messages = [
            "这个不对",
            "为什么404错误",
            "找不到配置文件",
            "500报错",
            "按理说应该正常运行",
            "应用层有问题"
        ]

        for msg in test_messages:
            start = time.time()
            mc.check(msg)
            elapsed_ms = (time.time() - start) * 1000
            assert elapsed_ms < 100, f"Keyword match for '{msg}' took {elapsed_ms:.2f}ms"

    def test_performance_full_check_under_900ms(self):
        """Full check with report generation < 900ms"""
        mc = MidCheckpoint()
        start = time.time()
        mc.check(
            "不对，404错误，奇怪为什么找不到",
            initial_hypothesis="使用CDN加速"
        )
        elapsed_ms = (time.time() - start) * 1000
        assert elapsed_ms < 900, f"Full check took {elapsed_ms:.2f}ms"

    def test_full_report_under_1s(self):
        """Total operation < 1s"""
        mc = MidCheckpoint()
        start = time.time()
        for _ in range(10):
            mc.check("为什么还是报错", initial_hypothesis="缓存正常")
        elapsed = time.time() - start
        assert elapsed < 10.0, f"10 iterations took {elapsed:.2f}s, expected < 10s"

    def test_no_false_positive_on_normal_message(self):
        """Normal message without fracture signals does not trigger"""
        mc = MidCheckpoint()
        normal_messages = [
            "帮我打开README.md",
            "查看一下当前目录",
            "你好",
            "今天的天气怎么样",
            "给我写一个hello world程序"
        ]

        for msg in normal_messages:
            result = mc.check(msg)
            assert result["triggered"] is False, f"False positive for: {msg}"

    def test_platform_layer_detection_with_vercel(self):
        """Vercel keyword indicates platform layer"""
        mc = MidCheckpoint()
        result = mc.check("vercel部署失败了，报错")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "platform"

    def test_platform_layer_detection_with_aws(self):
        """AWS keyword indicates platform layer"""
        mc = MidCheckpoint()
        result = mc.check("AWS的EC2实例出问题了，奇怪")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "platform"

    def test_data_layer_detection_with_database(self):
        """Database keyword indicates data layer"""
        mc = MidCheckpoint()
        result = mc.check("database连接池满了，为什么")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "data"

    def test_data_layer_detection_with_sql(self):
        """SQL keyword indicates data layer"""
        mc = MidCheckpoint()
        result = mc.check("SQL查询报错，奇怪")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "data"

    def test_application_layer_detection_with_routes(self):
        """Routes keyword indicates application layer"""
        mc = MidCheckpoint()
        result = mc.check("routes配置不对，为什么")

        assert result["triggered"] is True
        assert result["layer_judgment"] == "application"

    def test_unknown_layer_when_no_specific_keywords(self):
        """Unknown layer when no platform/app/data keywords detected"""
        mc = MidCheckpoint()
        result = mc.check("不对，结果和预期不符")

        assert result["triggered"] is True
        assert result["layer_judgment"] is None

    def test_signal_collection_if_storage_available(self):
        """Signal is collected if storage is available"""
        # This would require a mock storage, testing the interface
        mc = MidCheckpoint(storage=None)  # No storage, should not raise
        result = mc.check("不对，奇怪")
        assert result["triggered"] is True
        # When storage is None, should still work without error

    def test_all_type_a_keywords_recognized(self):
        """All Type A keywords are recognized"""
        mc = MidCheckpoint()
        type_a_keywords = [
            "不对", "奇怪", "为什么", "找不到", "404", "500",
            "报错", "不是这样", "按理说", "应该", "平台层",
            "应用层", "基础设施"
        ]

        for keyword in type_a_keywords:
            result = mc.check(f"消息包含{keyword}关键词")
            assert keyword in result["matched_keywords"], f"Keyword '{keyword}' not matched"


class TestMidCheckpointIntegration:
    """Integration tests for MidCheckpoint"""

    def test_full_workflow_triggered(self):
        """Complete workflow when fracture is detected"""
        mc = MidCheckpoint()
        result = mc.check(
            "奇怪，vercel部署后500错误，按理说不应该这样",
            initial_hypothesis="CDN配置正确，平台层应该正常工作",
            in_express_flow=True
        )

        assert result["triggered"] is True
        assert result["signal_type"] == "keyword"
        assert "奇怪" in result["matched_keywords"]
        assert "500" in result["matched_keywords"]
        assert result["layer_judgment"] == "platform"
        assert result["adaptive_tightened"] is True
        assert result["fracture_report"] is not None

    def test_full_workflow_not_triggered(self):
        """Complete workflow when no fracture detected"""
        mc = MidCheckpoint()
        result = mc.check(
            "帮我优化一下查询性能",
            initial_hypothesis="使用索引优化",
            in_express_flow=False
        )

        assert result["triggered"] is False
        assert result["signal_type"] is None
        assert result["matched_keywords"] == []