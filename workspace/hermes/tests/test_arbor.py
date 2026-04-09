"""Tests for Codex Arbitrator."""

import pytest
from src.codex_arbitrator import CodexArbitrator


class TestCodexArbitrator:
    def test_init(self):
        arb = CodexArbitrator()
        assert arb.result_dir.name == "codex_results"

    def test_check_codex_not_available(self):
        """When codex not installed, returns available=False"""
        arb = CodexArbitrator()
        result = arb.arbitrate_sync("Why is this returning 404?", timeout=5)
        # Codex may be installed but unavailable or return error — check structure
        assert 'available' in result
        assert result['available'] == False or 'error' in result

    def test_arbitrate_async_returns_job_id(self):
        arb = CodexArbitrator()
        job_id = arb.arbitrate_async(
            question="test question",
            context={'task': 'test'}
        )
        assert isinstance(job_id, str)
        assert len(job_id) == 8

    def test_format_arbitration_unavailable(self):
        arb = CodexArbitrator()
        result = {
            'available': False,
            'error': 'codex not found',
            'fallback': 'Use internal reasoning',
        }
        formatted = arb.format_arbitration(result)
        assert "不可用" in formatted
        assert "备选方案" in formatted or "reasoning" in formatted.lower()

    def test_format_arbitration_available(self):
        arb = CodexArbitrator()
        result = {
            'available': True,
            'layer_judgment': 'platform',
            'content': 'The issue is at the platform layer.',
            'suggestions': ['Check Vercel config', 'Verify Edge middleware'],
            'needs_code_verification': True,
            'adoption': 'suggested',
        }
        formatted = arb.format_arbitration(result)
        assert "平台" in formatted or "platform" in formatted.lower()

    def test_get_result_unknown_job_id(self):
        arb = CodexArbitrator()
        result = arb.get_result("unknown-job-id")
        assert result is None

    def test_build_prompt(self):
        arb = CodexArbitrator()
        prompt = arb._build_prompt(
            "Why 404?",
            {
                'task': 'fix auth',
                'layer_judgment': 'application',
                'initial_hypothesis': 'Route is wrong',
                'detected_issue': 'hotel-cashback-ops 404',
                'confidence': 0.4,
            }
        )
        assert "fix auth" in prompt
        assert "Why 404?" in prompt
        assert "0.4" in prompt