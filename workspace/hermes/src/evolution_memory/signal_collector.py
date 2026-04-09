"""Signal Collector - High-level interface for collecting evolution signals."""

from pathlib import Path
from typing import Optional, List

from .storage import EvolutionStorage
from .schemas import SignalEntry


class SignalCollector:
    """High-level interface for collecting and retrieving signals.
    
    Wraps EvolutionStorage to provide a simpler API for signal
    collection during agent execution.
    """
    
    def __init__(self, base: Optional[Path] = None):
        """Initialize collector with storage backend.
        
        Args:
            base: Base directory for hermes storage.
                  Defaults to ~/.hermes if not provided.
        """
        self.storage = EvolutionStorage(base=base)
    
    def collect(
        self,
        signal_type: str,
        session_id: str,
        content: str,
        source: str,
        confidence: float = 0.5,
        related_memory: Optional[str] = None,
    ) -> SignalEntry:
        """Collect a new signal.
        
        Args:
            signal_type: Type of signal detected
            session_id: Session identifier for tracking
            content: Description of the signal
            source: Source of detection (user-correction, codex-review, self-detected)
            confidence: Confidence level (0.0 to 1.0)
            related_memory: Optional pattern_id if linked to existing memory
            
        Returns:
            The created SignalEntry
        """
        return self.storage.append_signal(
            signal_type=signal_type,
            session_id=session_id,
            content=content,
            source=source,
            confidence=confidence,
            related_memory=related_memory,
        )
    
    def get_signals(
        self,
        signal_type: Optional[str] = None,
        min_confidence: float = 0.0,
    ) -> List[dict]:
        """Retrieve collected signals.
        
        Args:
            signal_type: Optional filter by signal type
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of matching SignalEntry records
        """
        signals = self.storage.get_signals(signal_type=signal_type)
        
        if min_confidence > 0:
            signals = [s for s in signals if s.get("confidence", 0) >= min_confidence]
        
        return signals
    
    def record_error_memory(
        self,
        pattern_id: str,
        error_type: str,
        domain: str,
        signal: str,
        root_cause: str,
        correct_path: str,
        confidence: float = 1.0,
        source: str = "unknown",
    ) -> None:
        """Convenience method to record an error memory pattern.
        
        Args:
            pattern_id: Unique pattern identifier
            error_type: Error type category
            domain: Domain/context
            signal: Original signal description
            root_cause: Root cause explanation
            correct_path: Correct diagnostic or resolution path
            confidence: Confidence level
            source: Source of the memory
        """
        self.storage.append_error_memory(
            pattern_id=pattern_id,
            type=error_type,
            domain=domain,
            signal=signal,
            root_cause=root_cause,
            correct_path=correct_path,
            confidence=confidence,
            source=source,
        )
    
    def record_task_summary(
        self,
        summary_id: str,
        task: str,
        deliverables: list,
        hypothesis_status: dict,
        repeatable: bool = False,
    ) -> None:
        """Convenience method to record a task summary.
        
        Args:
            summary_id: Unique summary identifier
            task: Task description
            deliverables: List of delivered items
            hypothesis_status: Dict mapping hypothesis to verification status
            repeatable: Whether task can be repeated successfully
        """
        self.storage.append_task_summary(
            summary_id=summary_id,
            task=task,
            deliverables=deliverables,
            hypothesis_status=hypothesis_status,
            repeatable=repeatable,
        )