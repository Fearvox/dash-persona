"""Post-checkpoint: TaskSummary generation and memory anchoring."""

from datetime import datetime, timezone
from typing import Optional


class PostCheckpoint:
    """Post-task checkpoint for generating TaskSummary and anchoring to memory."""

    def __init__(self, storage):
        """Initialize with EvolutionStorage instance."""
        self.storage = storage

    def run(self, task: str, deliverables: list, hypotheses: dict,
            context: dict = None) -> dict:
        """
        Generate post-checkpoint summary and anchor to memory.

        Args:
            task: Task description
            deliverables: List of deliverable strings
            hypotheses: Dict of {hypothesis: "verified"|"rejected"|"unverified"}
            context: Optional context (file_path, lines_modified, etc.)

        Returns: {
            'summary': str,  # human-readable
            'summary_id': str,
            'task_summary': TaskSummary,  # structured object
            'repeatable': bool,
        }
        """
        # Generate summary_id
        summary_id = self._generate_summary_id()

        # Assess repeatability
        repeatable = self._assess_repeatability(hypotheses, deliverables)

        # Anchor to storage
        task_summary = self.storage.append_task_summary(
            summary_id=summary_id,
            task=task,
            deliverables=deliverables,
            hypothesis_status=hypotheses,
            repeatable=repeatable,
        )

        # Generate human-readable summary
        next_steps = self._suggest_next_steps(hypotheses, repeatable)
        summary_text = self._generate_summary_text(task, deliverables, hypotheses, next_steps)

        return {
            'summary': summary_text,
            'summary_id': summary_id,
            'task_summary': task_summary,
            'repeatable': repeatable,
        }

    def _generate_summary_id(self) -> str:
        """Generate a unique summary ID based on timestamp."""
        now = datetime.now(timezone.utc)
        return f"task-{now.strftime('%Y%m%d%H%M%S')}"

    def _assess_repeatability(self, hypotheses: dict, deliverables: list) -> bool:
        """Assess if this task pattern is repeatable.

        A task is repeatable if:
        1. All hypotheses are verified (no rejections)
        2. At least one deliverable was produced
        """
        if not deliverables:
            return False

        # If any hypothesis was rejected, not repeatable
        for status in hypotheses.values():
            if status == "rejected":
                return False

        # If we have verified hypotheses, it's repeatable
        verified_count = sum(1 for s in hypotheses.values() if s == "verified")
        return verified_count > 0

    def _suggest_next_steps(self, hypotheses: dict, repeatable: bool) -> str:
        """Suggest next steps based on hypothesis verification status."""
        rejected = [h for h, s in hypotheses.items() if s == "rejected"]
        unverified = [h for h, s in hypotheses.items() if s == "unverified"]

        if not repeatable and rejected:
            return f"继续验证被推翻的假设: {', '.join(rejected)}"
        if unverified:
            return f"待验证: {', '.join(unverified)}"
        return "任务完成，模式可重复"

    def _generate_summary_text(self, task: str, deliverables: list,
                                hypotheses: dict, next_steps: str) -> str:
        """Generate human-readable post-checkpoint summary."""
        lines = [
            "## 任务交付摘要",
            f"目标：{task[:60]}{'...' if len(task) > 60 else ''}",
            "",
            "交付物：",
        ]

        for d in deliverables:
            lines.append(f"  - {d}")

        lines.append("")
        lines.append("假设验证：")

        status_symbols = {"verified": "✅", "rejected": "❌", "unverified": "❓"}
        for hypothesis, status in hypotheses.items():
            symbol = status_symbols.get(status, "?")
            status_text = {"verified": "已验证", "rejected": "被推翻", "unverified": "未验证"}[status]
            lines.append(f"  {symbol} {hypothesis}: {status_text}")

        lines.append("")
        lines.append(f"下一步：{next_steps}")

        return "\n".join(lines)