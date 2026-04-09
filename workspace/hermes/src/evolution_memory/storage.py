"""Evolution Memory Storage - JSONL-based persistence layer."""

import json
import os
from pathlib import Path
from typing import Optional, List

from .schemas import ErrorMemory, TaskSummary, SignalEntry


class EvolutionStorage:
    """Manages JSONL-based evolution memory storage.
    
    Provides auto-mkdir for ~/.hermes/evolution/ structure
    and append-only JSONL file operations.
    """
    
    SIGNALS_DIR = "signals"
    MEMORIES_DIR = "memories"
    SUMMARIES_DIR = "summaries"
    
    SIGNALS_FILE = "signals.jsonl"
    MEMORIES_FILE = "error_memories.jsonl"
    SUMMARIES_FILE = "task_summaries.jsonl"
    
    def __init__(self, base: Optional[Path] = None):
        """Initialize storage with base directory.
        
        Args:
            base: Base directory for hermes storage. 
                  Defaults to ~/.hermes if not provided.
        """
        if base is None:
            base = Path.home() / ".hermes"
        self.base = base
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Create required directory structure if missing."""
        evolution_dir = self.base / "evolution"
        evolution_dir.mkdir(parents=True, exist_ok=True)
        (evolution_dir / self.SIGNALS_DIR).mkdir(exist_ok=True)
        (evolution_dir / self.MEMORIES_DIR).mkdir(exist_ok=True)
        (evolution_dir / self.SUMMARIES_DIR).mkdir(exist_ok=True)
    
    def _signals_dir(self) -> Path:
        return self.base / "evolution" / self.SIGNALS_DIR
    
    def _memories_dir(self) -> Path:
        return self.base / "evolution" / self.MEMORIES_DIR
    
    def _summaries_dir(self) -> Path:
        return self.base / "evolution" / self.SUMMARIES_DIR
    
    def append_signal(
        self,
        signal_type: str,
        session_id: str,
        content: str,
        source: str,
        confidence: float = 0.5,
        related_memory: Optional[str] = None,
    ) -> SignalEntry:
        """Append a new signal entry.
        
        Args:
            signal_type: Type of signal (alignment-failure, diagnostic-path-failure, etc.)
            session_id: Session identifier for tracking
            content: Signal description
            source: Signal source (user-correction, codex-review, self-detected)
            confidence: Confidence level (0.0 to 1.0)
            related_memory: Optional pattern_id if linked to existing memory
            
        Returns:
            The created SignalEntry
        """
        from datetime import datetime, timezone
        
        entry = SignalEntry(
            signal_type=signal_type,
            session_id=session_id,
            timestamp=datetime.now(timezone.utc),
            content=content,
            source=source,
            confidence=confidence,
            related_memory=related_memory,
        )
        
        # Store by signal_type subdirectory for organization
        # e.g., signals/alignment-failure.jsonl
        signals_file = self._signals_dir() / f"{signal_type}.jsonl"
        try:
            with open(signals_file, "a") as f:
                f.write(json.dumps(entry.to_dict()) + "\n")
                f.flush()
                os.fsync(f.fileno())
        except OSError as e:
            raise IOError(f"Failed to write signal to {signals_file}: {e}") from e

        return entry
    
    def append_error_memory(
        self,
        pattern_id: str,
        type: str,
        domain: str,
        signal: str,
        root_cause: str,
        correct_path: str,
        ccb_phase: Optional[str] = None,
        confidence: float = 1.0,
        source: str = "unknown",
        repeat_count: int = 1,
    ) -> ErrorMemory:
        """Append a new error memory record.
        
        Args:
            pattern_id: Unique pattern identifier (e.g., "layer-confusion-001")
            type: Error type category
            domain: Domain/context (e.g., "vercel-deployment")
            signal: Original signal that triggered this memory
            root_cause: Root cause explanation
            correct_path: Correct diagnostic or resolution path
            ccb_phase: Optional CCB phase reference
            confidence: Confidence level (0.0 to 1.0)
            source: Source of this memory record
            repeat_count: Number of times this pattern was observed
            
        Returns:
            The created ErrorMemory
        """
        from datetime import datetime, timezone
        
        memory = ErrorMemory(
            pattern_id=pattern_id,
            type=type,
            domain=domain,
            signal=signal,
            root_cause=root_cause,
            correct_path=correct_path,
            ccb_phase=ccb_phase,
            confidence=confidence,
            source=source,
            created=datetime.now(timezone.utc),
            repeat_count=repeat_count,
        )
        
        memories_file = self._memories_dir() / self.MEMORIES_FILE
        try:
            with open(memories_file, "a") as f:
                f.write(json.dumps(memory.to_dict()) + "\n")
                f.flush()
                os.fsync(f.fileno())
        except OSError as e:
            raise IOError(f"Failed to write memory to {memories_file}: {e}") from e

        return memory
    
    def append_task_summary(
        self,
        summary_id: str,
        task: str,
        deliverables: List[str],
        hypothesis_status: dict,
        repeatable: bool = False,
    ) -> TaskSummary:
        """Append a new task summary record.
        
        Args:
            summary_id: Unique summary identifier (e.g., "task-001")
            task: Task description
            deliverables: List of delivered items
            hypothesis_status: Dict mapping hypothesis to verification status
            repeatable: Whether this task can be repeated successfully
            
        Returns:
            The created TaskSummary
        """
        from datetime import datetime, timezone
        
        summary = TaskSummary(
            summary_id=summary_id,
            type="task-summary",
            task=task,
            deliverables=deliverables,
            hypothesis_status=hypothesis_status,
            created=datetime.now(timezone.utc),
            repeatable=repeatable,
        )
        
        summaries_file = self._summaries_dir() / self.SUMMARIES_FILE
        try:
            with open(summaries_file, "a") as f:
                f.write(json.dumps(summary.to_dict()) + "\n")
                f.flush()
                os.fsync(f.fileno())
        except OSError as e:
            raise IOError(f"Failed to write summary to {summaries_file}: {e}") from e

        return summary
    
    def query_memories(
        self,
        pattern_id: Optional[str] = None,
        domain: Optional[str] = None,
        min_confidence: float = 0.0,
    ) -> List[dict]:
        """Query error memories with optional filters.
        
        Args:
            pattern_id: Filter by pattern ID (exact match)
            domain: Filter by domain (exact match)
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of matching ErrorMemory records as dicts
        """
        memories_file = self._memories_dir() / self.MEMORIES_FILE
        results = []
        
        if not memories_file.exists():
            return results
        
        with open(memories_file) as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    import logging
                    logging.warning(f"Skipping corrupted line in {memories_file}: {line[:50]!r}")
                    continue

                # Apply filters
                if pattern_id is not None and record.get("pattern_id") != pattern_id:
                    continue
                if domain is not None and record.get("domain") != domain:
                    continue
                if record.get("confidence", 0) < min_confidence:
                    continue
                
                results.append(record)
        
        return results
    
    def get_signals(self, signal_type: Optional[str] = None) -> List[dict]:
        """Retrieve signal entries, optionally filtered by type.
        
        Args:
            signal_type: If provided, only return signals of this type
            
        Returns:
            List of SignalEntry records as dicts
        """
        results = []
        
        if signal_type:
            signal_file = self._signals_dir() / f"{signal_type}.jsonl"
            if signal_file.exists():
                with open(signal_file) as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            results.append(json.loads(line))
                        except json.JSONDecodeError:
                            import logging
                            logging.warning(f"Skipping corrupted line in {signal_file}: {line[:50]!r}")
                            continue
        else:
            # Load all signal files
            for signal_file in self._signals_dir().glob("*.jsonl"):
                with open(signal_file) as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            results.append(json.loads(line))
                        except json.JSONDecodeError:
                            import logging
                            logging.warning(f"Skipping corrupted line in {signal_file}: {line[:50]!r}")
                            continue
        
        return results
    
    def get_summaries(self) -> List[dict]:
        """Retrieve all task summaries.
        
        Returns:
            List of TaskSummary records as dicts
        """
        summaries_file = self._summaries_dir() / self.SUMMARIES_FILE
        results = []
        
        if not summaries_file.exists():
            return results
        
        with open(summaries_file) as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    results.append(json.loads(line))
                except json.JSONDecodeError:
                    import logging
                    logging.warning(f"Skipping corrupted line in {summaries_file}: {line[:50]!r}")
                    continue

        return results