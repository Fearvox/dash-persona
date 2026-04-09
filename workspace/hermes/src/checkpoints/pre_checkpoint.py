"""Pre-checkpoint Express (pc-pre-001): self-alignment check, < 2s, no user interruption."""
import re
from typing import Dict, List, Optional, Tuple


# Mid-task correction signals that trigger adaptive tightening
MID_TASK_SIGNALS = frozenset([
    "不对", "奇怪", "为什么", "找不到", "不是这样",
])


class PreCheckpoint:
    """
    Pre-checkpoint Express flow: self-alignment check without user interruption.

    Triggered after TaskClassifier classifies as "express" flow.
    User says "你来做" → Hermes executes + self-monitors + continues.

    Behavior:
      - Generate one-liner confirmation (from TaskClassifier)
      - Self-alignment check: does the direction match user's intent?
      - Safe mechanism: algorithm adaptive tightening when risk signals detected
    """

    def __init__(self, classifier):
        """
        Initialize PreCheckpoint with a TaskClassifier.

        Args:
            classifier: TaskClassifier instance for task classification
        """
        self.classifier = classifier
        self._mid_task_tightened = False

    def run(self, task_description: str, context: Optional[Dict] = None) -> Dict:
        """
        Run Express pre-checkpoint.

        Args:
            task_description: The task to confirm
            context: Optional context dict that may include mid_task_signals

        Returns:
            {
                'confirmed': bool,
                'flow': 'express' | 'standard',
                'confirmation_text': str,
                'adaptive_tightened': bool,  # true if mid-task tightening triggered
                'risks': list of detected risks,
                'self_alignment_passed': bool,
            }
        """
        # Check for mid-task correction signals
        mid_task_signals = []
        if context and "mid_task_signals" in context:
            mid_task_signals = context["mid_task_signals"]

        self._mid_task_tightened = False
        if mid_task_signals:
            self.tighten_if_needed(mid_task_signals)

        # If tightened, upgrade to standard flow
        if self._mid_task_tightened:
            flow = "standard"
            confirmed = False
            self_alignment_passed = False
            risks = ["Mid-task correction detected - requires standard review"]
        else:
            # Run self-alignment check
            self_alignment_passed, alignment_risks = self.express_self_check(
                task_description, context
            )

            # If self-alignment failed, still express but with warning
            confirmed = True
            flow = "express"
            risks = alignment_risks

        # Generate confirmation text
        confirmation_text = self.classifier.generate_confirmation(task_description, context)

        return {
            "confirmed": confirmed,
            "flow": flow,
            "confirmation_text": confirmation_text,
            "adaptive_tightened": self._mid_task_tightened,
            "risks": risks,
            "self_alignment_passed": self_alignment_passed,
        }

    def express_self_check(self, task_description: str, context: Optional[Dict] = None) -> Tuple[bool, List[str]]:
        """
        Internal: express self-alignment check.

        Asks three core questions:
          1. Did I understand the goal correctly?
          2. Is my approach correct for this goal?
          3. What could go wrong?

        Args:
            task_description: The task text
            context: Optional context dict

        Returns:
            (passed, risks) where passed=True if Hermes believes it understands
            the goal correctly and risks is a list of detected risk strings.
        """
        risks = []
        text = task_description.lower()

        # Question 1: Did I understand the goal correctly?
        # Check for vague patterns that indicate unclear goals
        vague_patterns = [
            r"更好", r"更快", r"改进", r"更优",
            r"让系统", r"让这个东西", r"探索", r"试试",
        ]
        vague_count = sum(1 for p in vague_patterns if re.search(p, text))
        if vague_count >= 2:
            risks.append("目标模糊：检测到多个模糊描述")
            return False, risks

        # Question 2: Is my approach correct for this goal?
        # Check for high-risk operations
        high_risk_keywords = [
            "删除", "删掉", "强制", "覆盖", "不可逆",
            "force", "delete", "rm", "remove", "drop",
        ]
        has_high_risk = any(kw in text for kw in high_risk_keywords)
        if has_high_risk:
            risks.append("高风险操作：涉及不可逆操作")

        # Question 3: What could go wrong?
        # Check for multi-step complexity
        step_markers = ["然后", "之后", "接着", "再", "最后", "先"]
        step_count = sum(1 for m in step_markers if m in text)
        if step_count >= 2:
            risks.append("复杂度风险：多步骤任务可能存在依赖")

        # Context-based mismatch detection
        if context:
            implied_action = context.get("implied_action", "")
            write_keywords = ["写", "创建", "修改", "编辑", "write", "create", "edit"]
            read_keywords = ["查看", "浏览", "读", "view", "read", "get"]

            is_read_task = any(kw in text for kw in read_keywords)
            is_write_task = any(kw in text for kw in write_keywords)

            if implied_action in write_keywords and is_read_task:
                risks.append("方向不匹配：任务描述与预期操作不符")
                return False, risks
            if implied_action in read_keywords and is_write_task:
                risks.append("方向不匹配：任务描述与预期操作不符")
                return False, risks

        # If high risk or vague, fail self-check
        if has_high_risk and risks:
            return False, risks

        # Low risk tasks pass
        return True, risks

    def tighten_if_needed(self, mid_task_signals: Optional[List[str]] = None) -> None:
        """
        Temporarily raise TaskClassifier thresholds (adaptive tightening).

        When Pre-checkpoint (Express) triggers mid-task due to user corrections
        ("不对", "奇怪", "为什么", "找不到", "不是这样"), the irr_score threshold
        is temporarily raised one level. What was Express becomes treated as
        Standard (强化审查).

        Args:
            mid_task_signals: List of detected correction signals
        """
        if mid_task_signals is None:
            mid_task_signals = []

        # Check if any mid-task signals are present
        detected_signals = MID_TASK_SIGNALS.intersection(
            set(mid_task_signals) if isinstance(mid_task_signals, list)
            else set()
        )

        if detected_signals:
            self._mid_task_tightened = True
        else:
            self._mid_task_tightened = False
