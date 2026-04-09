"""JSONL Schemas for Evolution Memory Storage."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, List


@dataclass
class ErrorMemory:
    """Error pattern memory record.
    
    Represents a discovered error pattern with its root cause
    and correct diagnostic path.
    """
    pattern_id: str
    type: str
    domain: str
    signal: str
    root_cause: str
    correct_path: str
    ccb_phase: Optional[str] = None
    confidence: float = 1.0
    source: str = "unknown"
    created: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    repeat_count: int = 1
    
    def to_dict(self) -> dict:
        return {
            "pattern_id": self.pattern_id,
            "type": self.type,
            "domain": self.domain,
            "signal": self.signal,
            "root_cause": self.root_cause,
            "correct_path": self.correct_path,
            "ccb_phase": self.ccb_phase,
            "confidence": self.confidence,
            "source": self.source,
            "created": self.created.isoformat(),
            "repeat_count": self.repeat_count,
        }
    
    @classmethod
    def from_dict(cls, d: dict) -> "ErrorMemory":
        created = d.get("created")
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        return cls(
            pattern_id=d["pattern_id"],
            type=d["type"],
            domain=d["domain"],
            signal=d["signal"],
            root_cause=d["root_cause"],
            correct_path=d["correct_path"],
            ccb_phase=d.get("ccb_phase"),
            confidence=d.get("confidence", 1.0),
            source=d.get("source", "unknown"),
            created=created or datetime.now(timezone.utc),
            repeat_count=d.get("repeat_count", 1),
        )


@dataclass
class TaskSummary:
    """Task completion summary with hypothesis tracking.
    
    Records what was delivered and the verification status
    of any hypotheses explored during the task.
    """
    summary_id: str
    type: str = "task-summary"
    task: str = ""
    deliverables: List[str] = field(default_factory=list)
    hypothesis_status: Dict[str, str] = field(default_factory=dict)
    created: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    repeatable: bool = False
    
    def to_dict(self) -> dict:
        return {
            "summary_id": self.summary_id,
            "type": self.type,
            "task": self.task,
            "deliverables": self.deliverables,
            "hypothesis_status": self.hypothesis_status,
            "created": self.created.isoformat(),
            "repeatable": self.repeatable,
        }
    
    @classmethod
    def from_dict(cls, d: dict) -> "TaskSummary":
        created = d.get("created")
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        return cls(
            summary_id=d["summary_id"],
            type=d.get("type", "task-summary"),
            task=d.get("task", ""),
            deliverables=d.get("deliverables", []),
            hypothesis_status=d.get("hypothesis_status", {}),
            created=created or datetime.now(timezone.utc),
            repeatable=d.get("repeatable", False),
        )


@dataclass
class SignalEntry:
    """Signal entry for tracking detected issues.
    
    Signals represent detected problems or anomalies that may
    lead to new error memory records after root cause analysis.
    """
    signal_type: str  # alignment-failure | diagnostic-path-failure | reasoning-gap | ccb-review-finding
    session_id: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    content: str = ""
    source: str = "unknown"  # user-correction | codex-review | self-detected
    confidence: float = 0.5
    related_memory: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "signal_type": self.signal_type,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "content": self.content,
            "source": self.source,
            "confidence": self.confidence,
            "related_memory": self.related_memory,
        }
    
    @classmethod
    def from_dict(cls, d: dict) -> "SignalEntry":
        timestamp = d.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        return cls(
            signal_type=d["signal_type"],
            session_id=d["session_id"],
            timestamp=timestamp or datetime.now(timezone.utc),
            content=d.get("content", ""),
            source=d.get("source", "unknown"),
            confidence=d.get("confidence", 0.5),
            related_memory=d.get("related_memory"),
        )