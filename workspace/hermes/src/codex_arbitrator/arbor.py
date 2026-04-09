"""Codex Arbitrator — async integration for external arbitration."""

import subprocess
import threading
import json
import uuid
from pathlib import Path
from typing import Optional, Callable


class CodexArbitrator:
    """
    Async Codex arbitration for Hermes self-evolution.

    Triggers when:
    - DETECT confidence < 0.7
    - Error type is UNKNOWN
    - Adversarial review has critical findings

    Usage:
        arbitrator = CodexArbitrator()

        # Async (preferred)
        job_id = arbitrator.arbitrate_async(
            question="Why is this function returning 404?",
            context={'task': 'fix auth bug', 'layer': 'application'},
            callback=self.on_result
        )

        # Sync (blocking, use sparingly)
        result = arbitrator.arbitrate_sync(question, context, timeout=60)
    """

    def __init__(self, result_dir: Path = None):
        self.result_dir = result_dir or Path.home() / ".hermes" / "codex_results"
        self.result_dir.mkdir(parents=True, exist_ok=True)
        self._pending = {}  # job_id -> metadata
        self._results = {}  # job_id -> result

    def arbitrate_sync(self, question: str, context: dict = None, timeout: int = 60) -> dict:
        """
        Synchronous arbitration (blocks main thread).

        Returns: {
            'available': bool,
            'layer_judgment': str,
            'content': str,
            'suggestions': [str],
            'needs_code_verification': bool,
            'adoption': 'suggested' | 'reference' | 'ignored',
        }
        """
        # Check if codex CLI is available
        if not self._check_codex_available():
            return {
                'available': False,
                'error': 'Codex CLI not found at $PATH',
                'fallback': 'Use internal reasoning (layer confusion detection)',
            }

        context = context or {}
        prompt = self._build_prompt(question, context)

        try:
            result = subprocess.run(
                ['codex', 'review', '--', prompt],  # '--' separates options from prompt
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                return self._parse_output(result.stdout, context)
            else:
                return {
                    'available': True,
                    'error': result.stderr,
                    'fallback': 'Codex returned non-zero',
                }
        except FileNotFoundError:
            return {
                'available': False,
                'error': 'codex command not found',
                'fallback': 'Use internal reasoning',
            }
        except subprocess.TimeoutExpired:
            return {
                'available': True,
                'error': 'Codex timed out after {timeout}s',
                'fallback': 'Proceed without external arbitration',
            }

    def arbitrate_async(self, question: str, context: dict = None,
                        callback: Callable[[dict], None] = None) -> str:
        """Start async arbitration, return job_id."""
        job_id = str(uuid.uuid4())[:8]

        request = {
            'job_id': job_id,
            'question': question,
            'context': context or {},
            'status': 'pending',
        }
        self._pending[job_id] = request

        # Write result file path
        result_file = self.result_dir / f"{job_id}.json"
        request['result_file'] = str(result_file)

        # Run in background thread
        def run():
            result = self.arbitrate_sync(question, context)
            result['job_id'] = job_id
            result['status'] = 'completed'

            # Write to result file
            with open(result_file, 'w') as f:
                json.dump(result, f)

            self._results[job_id] = result
            self._pending.pop(job_id, None)

            if callback:
                callback(result)

        thread = threading.Thread(target=run, daemon=True)
        thread.start()

        return job_id

    def get_result(self, job_id: str) -> Optional[dict]:
        """Get async result when available."""
        if job_id in self._results:
            return self._results[job_id]

        result_file = self.result_dir / f"{job_id}.json"
        if result_file.exists():
            try:
                with open(result_file) as f:
                    result = json.load(f)
                self._results[job_id] = result
                return result
            except (json.JSONDecodeError, IOError):
                return None

        return None

    def format_arbitration(self, result: dict) -> str:
        """Format result as 🔺 Codex 仲裁建议 markdown."""
        if not result.get('available', False):
            return f"🔺 **Codex 不可用**: {result.get('error', 'unknown')}\n\n备选方案: {result.get('fallback', '内部推理')}"

        layer = result.get('layer_judgment', 'Unknown')
        content = result.get('content', result.get('error', 'No content'))
        suggestions = result.get('suggestions', [])
        needs_cv = result.get('needs_code_verification', False)
        adoption = result.get('adoption', 'reference')

        lines = [
            "## 🔺 Codex 仲裁建议",
            f"**层判断**: {layer}",
            "",
            content,
        ]

        if suggestions:
            lines.append("")
            lines.append("**建议**:")
            for s in suggestions:
                lines.append(f"- {s}")

        lines.append("---")
        lines.append(f"**采纳度**: {adoption}（Hermes 标注）")
        lines.append(f"**needs_code_verification**: {needs_cv}")

        return "\n".join(lines)

    def _check_codex_available(self) -> bool:
        """Check if codex CLI is available."""
        try:
            subprocess.run(['codex', '--version'],
                          capture_output=True, timeout=5)
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _build_prompt(self, question: str, context: dict) -> str:
        """Build prompt for Codex arbitration."""
        task = context.get('task', '')
        layer = context.get('layer_judgment', '')
        hypothesis = context.get('initial_hypothesis', '')
        detected_issue = context.get('detected_issue', '')
        confidence = context.get('confidence', 0.5)

        prompt_parts = [
            f"Task: {task}",
            f"Question: {question}",
            f"Detected Issue: {detected_issue}",
            f"Initial Hypothesis: {hypothesis}",
            f"Current Layer Judgment: {layer}",
            f"Confidence: {confidence}",
            "",
            "Please provide:",
            "1. Layer diagnosis (platform/application/data)",
            "2. Hypothesis validation (is the current fix direction correct?)",
            "3. Alternative suggestions if direction is wrong",
            "Format as structured markdown.",
        ]

        return "\n".join(prompt_parts)

    def _parse_output(self, output: str, context: dict) -> dict:
        """Parse Codex output into structured result."""
        # Simple parsing: look for key sections
        result = {
            'available': True,
            'content': output,
            'layer_judgment': 'application',  # default
            'suggestions': [],
            'needs_code_verification': False,
            'adoption': 'reference',
        }

        # Try to extract layer from content
        output_lower = output.lower()
        if any(k in output_lower for k in ['platform layer', 'platform-level', 'infra']):
            result['layer_judgment'] = 'platform'
        elif any(k in output_lower for k in ['data layer', 'database', 'db layer']):
            result['layer_judgment'] = 'data'

        # Look for code verification flag
        if 'needs_code_verification: true' in output_lower:
            result['needs_code_verification'] = True

        return result