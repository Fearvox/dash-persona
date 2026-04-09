"""Mid-checkpoint (pc-mid-001): assumption fracture detection, keyword matching < 100ms."""
import re
import time
from typing import Dict, List, Optional, Set


# Type A - Keyword Explicit Trigger (priority, < 100ms)
TYPE_A_KEYWORDS: Set[str] = frozenset([
    "不对", "奇怪", "为什么", "找不到", "404", "500",
    "报错", "不是这样", "按理说", "应该", "平台层",
    "应用层", "数据层", "基础设施"
])

# Platform layer indicators
PLATFORM_KEYWORDS: Set[str] = frozenset([
    "vercel", "aws", "nginx", "cdn", "edge", "平台层", "基础设施",
    "ec2", "s3", "cloudfront", "lambda", "serverless", "部署", "deployment"
])

# Application layer indicators
APPLICATION_KEYWORDS: Set[str] = frozenset([
    "应用层", "app.py", "routes", "handlers", "business logic",
    "api", "endpoint", "controller", "middleware", "router"
])

# Data layer indicators
DATA_KEYWORDS: Set[str] = frozenset([
    "数据层", "database", "db", "sql", "storage", "存储",
    "query", "table", "index", "cache", "redis", "mongodb"
])


class MidCheckpoint:
    """
    Mid-checkpoint: assumption fracture detection.

    Monitors mid-task signals for assumption fractures:
      - Type A: Keyword explicit trigger (< 100ms keyword matching)
      - Type B: Reasoning backup (contradiction detection)

    When triggered within Express flow, temporarily raises
    TaskClassifier's irr_score threshold (adaptive tightening).
    """

    def __init__(self, storage: Optional[object] = None):
        """
        Initialize MidCheckpoint.

        Args:
            storage: Optional EvolutionStorage instance for signal collection.
                    If provided, signals will be persisted to ~/.hermes/evolution/signals/
        """
        self.storage = storage

    def check(
        self,
        message: str,
        initial_hypothesis: Optional[str] = None,
        detected_contradiction: Optional[str] = None,
        in_express_flow: bool = False,
    ) -> Dict:
        """
        Check if mid-task fracture signal detected.

        Args:
            message: The current message/task text to analyze
            initial_hypothesis: The hypothesis/assumption at task start
            detected_contradiction: Evidence of contradiction (for Type B)
            in_express_flow: Whether currently in Express flow (for adaptive tightening)

        Returns: {
            'triggered': bool,
            'signal_type': 'keyword' | 'reasoning' | None,
            'matched_keywords': [list of matched keywords],
            'layer_judgment': 'platform' | 'application' | 'data' | None,
            'fracture_report': str | None,
            'adaptive_tightened': bool,
            'confidence': float,  # 0.0 to 1.0
        }
        """
        # Fast keyword matching first (< 100ms target)
        matched_keywords = self._keyword_match(message)

        # Determine signal type and if triggered
        if matched_keywords:
            signal_type = "keyword"
            triggered = True
        elif detected_contradiction and initial_hypothesis:
            # Type B: reasoning backup
            if self._detect_reasoning_gap(message, initial_hypothesis):
                signal_type = "reasoning"
                triggered = True
                matched_keywords = []
            else:
                signal_type = None
                triggered = False
        else:
            signal_type = None
            triggered = False

        # Assess layer if triggered
        layer_judgment = self._assess_layer(message, {}) if triggered else None

        # Calculate confidence
        confidence = self._calculate_confidence(matched_keywords, triggered)

        # Adaptive tightening in Express flow
        adaptive_tightened = triggered and in_express_flow

        # Generate fracture report if triggered
        fracture_report = None
        if triggered:
            fracture_report = self._generate_fracture_report(
                message=message,
                matched_keywords=matched_keywords,
                layer_judgment=layer_judgment,
                initial_hypothesis=initial_hypothesis,
            )

            # Collect signal if storage available
            if self.storage is not None:
                self._collect_signal(message, matched_keywords)

        return {
            "triggered": triggered,
            "signal_type": signal_type,
            "matched_keywords": matched_keywords,
            "layer_judgment": layer_judgment,
            "fracture_report": fracture_report,
            "adaptive_tightened": adaptive_tightened,
            "confidence": confidence,
        }

    def _keyword_match(self, message: str) -> List[str]:
        """
        Returns matched keywords from Type A list.

        Case-insensitive, exact substring match.
        Returns all matched keywords (not just first).
        """
        message_lower = message.lower()
        matched = []

        for keyword in TYPE_A_KEYWORDS:
            if keyword.lower() in message_lower:
                matched.append(keyword)

        return matched

    def _detect_reasoning_gap(self, message: str, initial_hypothesis: str) -> bool:
        """
        Check Type B conditions.

        Detects when:
        - Contradiction between initial hypothesis and new evidence
        - Need to find root cause at another technology layer
        - Fix direction significantly deviates from original plan
        """
        if not initial_hypothesis:
            return False

        message_lower = message.lower()
        hypothesis_lower = initial_hypothesis.lower()

        # Check for layer shift indicators
        layer_shift_keywords = [
            "platform layer", "application layer", "data layer",
            "平台层", "应用层", "数据层",
            "instead", "应该", "actually", "实际上"
        ]

        has_layer_shift = any(kw in message_lower for kw in layer_shift_keywords)

        # Check for contradiction indicators
        contradiction_keywords = [
            "wrong", "incorrect", "不对", "错误",
            "contradict", "相反", "但是", "然而",
            "unexpected", "意外", "不是这样"
        ]

        has_contradiction = any(kw in message_lower for kw in contradiction_keywords)

        # Check if hypothesis terms don't match message terms
        hypothesis_terms = set(hypothesis_lower.split())
        message_terms = set(message_lower.split())

        # Significant deviation: large vocabulary mismatch
        term_overlap = len(hypothesis_terms & message_terms)
        has_significant_deviation = (
            len(hypothesis_terms) > 3 and term_overlap < len(hypothesis_terms) * 0.3
        )

        return (has_layer_shift and has_contradiction) or has_significant_deviation

    def _generate_fracture_report(
        self,
        message: str,
        matched_keywords: List[str],
        layer_judgment: Optional[str],
        initial_hypothesis: Optional[str],
    ) -> str:
        """
        Generate the fracture report output.
        """
        # Format matched keywords for display
        keywords_str = " / ".join(matched_keywords) if matched_keywords else "无"

        # Layer judgment string
        layer_str = layer_judgment if layer_judgment else "待定"

        # Build report
        report_lines = [
            "## 假设断裂报告",
            f"原始假设：{initial_hypothesis if initial_hypothesis else '未记录'}",
            f"断裂信号：{keywords_str}",
            f"层判断：{layer_str}",
        ]

        # Add suggestion based on layer
        if layer_judgment == "platform":
            report_lines.append("建议：检查平台层配置（CDN、边缘节点、部署设置）")
        elif layer_judgment == "application":
            report_lines.append("建议：检查应用层逻辑（路由、处理器、业务流程）")
        elif layer_judgment == "data":
            report_lines.append("建议：检查数据层状态（数据库连接、查询逻辑、缓存）")
        else:
            report_lines.append("建议：重新审视假设与实际结果的矛盾点")

        return "\n".join(report_lines)

    def _assess_layer(self, message: str, context: Dict) -> Optional[str]:
        """
        Assess which layer the problem likely belongs to.

        Based on keywords/content:
        - Platform: "平台层" + platform terms (vercel, aws, nginx, cdn, edge)
        - Application: "应用层" + app terms (app.py, routes, handlers)
        - Data: "数据层" + data terms (database, query, db, sql, storage)
        - None: no specific layer detected
        """
        message_lower = message.lower()

        # Check platform layer
        platform_score = 0
        if "平台层" in message_lower or "基础设施" in message_lower:
            platform_score += 2
        for kw in PLATFORM_KEYWORDS:
            if kw.lower() in message_lower:
                platform_score += 1

        # Check application layer
        app_score = 0
        if "应用层" in message_lower:
            app_score += 2
        for kw in APPLICATION_KEYWORDS:
            if kw.lower() in message_lower:
                app_score += 1

        # Check data layer
        data_score = 0
        if "数据层" in message_lower:
            data_score += 2
        for kw in DATA_KEYWORDS:
            if kw.lower() in message_lower:
                data_score += 1

        # Return highest scoring layer (if any score > 0)
        scores = [
            ("platform", platform_score),
            ("application", app_score),
            ("data", data_score),
        ]

        # Only return a layer if it has a meaningful score
        max_score = max(s[1] for s in scores)
        if max_score == 0:
            return None

        # Return the highest scoring layer
        for layer, score in scores:
            if score == max_score:
                return layer

        return None

    def _calculate_confidence(self, matched_keywords: List[str], triggered: bool) -> float:
        """
        Calculate confidence score (0.0 to 1.0).

        More matched keywords = higher confidence.
        """
        if not triggered:
            return 0.0

        # Base confidence with keyword count
        num_keywords = len(matched_keywords)

        if num_keywords == 0:
            return 0.3  # Low confidence for non-keyword triggers
        elif num_keywords == 1:
            return 0.5
        elif num_keywords == 2:
            return 0.7
        else:
            return min(0.9, 0.7 + (num_keywords - 2) * 0.1)

    def _collect_signal(self, message: str, matched_keywords: List[str]) -> None:
        """
        Collect signal to storage if available.

        Appends to ~/.hermes/evolution/signals/
        """
        if self.storage is None:
            return

        try:
            signal_type = "mid-checkpoint-trigger"
            content = f"Message: {message[:100]}, Keywords: {matched_keywords}"

            if hasattr(self.storage, "append_signal"):
                self.storage.append_signal(
                    signal_type=signal_type,
                    session_id="mid-checkpoint",
                    content=content,
                    source="self-detected",
                    confidence=0.8,
                )
        except Exception:
            # Storage errors should not break checkpoint functionality
            pass