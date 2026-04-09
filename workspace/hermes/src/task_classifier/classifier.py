"""TaskClassifier: four-dimension scoring, Express/Standard classification."""
from typing import Dict, Optional


class TaskClassifier:
    """
    Four-dimension scoring classifier.

    Dimensions:
      - step_score: number of implied steps (0/1/2)
      - irr_score:  operation risk level (0/1/2)
      - layer_score: technology layers involved (0/1/2)
      - explore_score: goal clarity (0/1/2)

    Classification:
      - total <= 2 → Express flow
      - total >= 3 → Standard flow
    """

    def classify(self, task_description: str, context: Optional[Dict] = None) -> Dict:
        """
        Classify a task description.

        Args:
            task_description: The task text (Chinese or English)
            context: Optional context dict that may influence scoring

        Returns:
            {
                "flow": "express" | "standard",
                "total_score": int,
                "breakdown": {"step": int, "irr": int, "layer": int, "explore": int},
                "reasoning": str
            }
        """
        from .rules import score_all

        total, breakdown, reasoning = score_all(task_description, context)
        flow = "express" if total <= 2 else "standard"

        return {
            "flow": flow,
            "total_score": total,
            "breakdown": breakdown,
            "reasoning": reasoning,
        }

    def generate_confirmation(self, task_description: str, context: Optional[Dict] = None) -> str:
        """
        Generate a confirmation message for the task.

        Express: one-liner with target, understanding, and risk points.
        Standard: structured list with goal, direction, assumptions, and risks.
        """
        result = self.classify(task_description, context)
        breakdown = result["breakdown"]

        if result["flow"] == "express":
            return self._express_confirmation(task_description, breakdown)
        else:
            return self._standard_confirmation(task_description, breakdown, context)

    # -----------------------------------------------------------------------
    # Internal
    # -----------------------------------------------------------------------
    def _express_confirmation(self, task: str, breakdown: Dict) -> str:
        """Build Express flow confirmation."""
        # Summarize the detected target in one phrase
        target = task[:50] + ("..." if len(task) > 50 else "")

        understanding_parts = []
        if breakdown["step"] == 0:
            understanding_parts.append("单步任务")
        elif breakdown["step"] == 1:
            understanding_parts.append("两步任务")
        else:
            understanding_parts.append("多步任务")

        if breakdown["irr"] == 0:
            understanding_parts.append("只读操作")
        elif breakdown["irr"] == 1:
            understanding_parts.append("涉及写入")
        else:
            understanding_parts.append("高风险操作")

        understanding = "，".join(understanding_parts)

        risk_parts = []
        if breakdown["irr"] >= 2:
            risk_parts.append("涉及不可逆操作")
        if breakdown["layer"] >= 2:
            risk_parts.append("多层技术栈变更")
        if breakdown["explore"] >= 2:
            risk_parts.append("目标模糊，存在较大不确定性")

        if not risk_parts:
            risk_parts.append("整体风险可控")

        return (
            f"## 任务确认（Express）\n"
            f"目标：{target}\n"
            f"我的理解：{understanding}\n"
            f"风险点：{'；'.join(risk_parts)}"
        )

    def _standard_confirmation(self, task: str, breakdown: Dict, context: Optional[Dict]) -> str:
        """Build Standard flow confirmation."""
        target = task[:50] + ("..." if len(task) > 50 else "")

        direction_parts = []
        if breakdown["step"] >= 1:
            direction_parts.append("多步骤操作")
        if breakdown["irr"] >= 1:
            direction_parts.append("涉及写操作")
        if breakdown["layer"] >= 1:
            direction_parts.append("跨层技术变更")
        direction = "，".join(direction_parts) if direction_parts else "综合任务"

        assumptions = []
        if breakdown["step"] >= 1:
            assumptions.append("各步骤顺序可调整")
        if breakdown["irr"] >= 1:
            assumptions.append("写入操作需要备份")
        if breakdown["layer"] >= 1:
            assumptions.append("外部服务可用")
        if not assumptions:
            assumptions.append("任务理解准确")

        risk_parts = []
        if breakdown["irr"] >= 2:
            risk_parts.append("不可逆操作（删除/强制推送）")
        if breakdown["layer"] >= 2:
            risk_parts.append("平台层变更，可能影响生产")
        if breakdown["explore"] >= 1:
            risk_parts.append("目标清晰度不足，可能需要迭代")

        if not risk_parts:
            risk_parts.append("整体可控，但需按步骤验证")

        assumptions_str = "\n  ".join(f"{i+1}. {a}" for i, a in enumerate(assumptions))
        risk_str = "\n  - ".join(risk_parts)

        return (
            f"## 任务确认（Standard）\n"
            f"目标：{target}\n"
            f"方向：{direction}\n"
            f"关键假设：\n  {assumptions_str}\n"
            f"风险点：\n  - {risk_str}"
        )
