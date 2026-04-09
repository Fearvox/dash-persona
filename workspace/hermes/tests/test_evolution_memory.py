"""Test Evolution Memory Storage (mem-001)"""

import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

# Use a temp dir for isolation
HERMES_BASE = None

@pytest.fixture(autouse=True)
def setup_temp_hermes(monkeypatch, tmp_path):
    """Set up temp hermes base for each test."""
    global HERMES_BASE
    HERMES_BASE = tmp_path / ".hermes"
    HERMES_BASE.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("HERMES_BASE", str(tmp_path))
    yield
    # cleanup
    shutil.rmtree(tmp_path, ignore_errors=True)


def get_hermes_base():
    from pathlib import Path
    base = os.environ.get("HERMES_BASE")
    if base:
        return Path(base)
    return Path.home() / ".hermes"


def test_schemas_exist():
    """Verify schema definitions are importable."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.schemas import ErrorMemory, TaskSummary, SignalEntry
    assert ErrorMemory is not None
    assert TaskSummary is not None
    assert SignalEntry is not None


def test_signal_collector_import():
    """Verify signal collector is importable."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.signal_collector import SignalCollector
    assert SignalCollector is not None


def test_storage_import():
    """Verify storage module is importable."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    assert EvolutionStorage is not None


def test_error_memory_schema_fields():
    """Verify ErrorMemory has all required fields."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.schemas import ErrorMemory
    
    mem = ErrorMemory(
        pattern_id="test-pattern-001",
        type="test-type",
        domain="test-domain",
        signal="test signal",
        root_cause="test root cause",
        correct_path="test correct path",
        ccb_phase=None,
        confidence=0.95,
        source="test-source",
        created=datetime.now(timezone.utc),
        repeat_count=1
    )
    assert mem.pattern_id == "test-pattern-001"
    assert mem.confidence == 0.95
    assert mem.repeat_count == 1


def test_task_summary_schema_fields():
    """Verify TaskSummary has all required fields."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.schemas import TaskSummary
    
    ts = TaskSummary(
        summary_id="task-001",
        type="task-summary",
        task="Test task",
        deliverables=["deliverable1", "deliverable2"],
        hypothesis_status={"h1": "verified", "h2": "rejected"},
        created=datetime.now(timezone.utc),
        repeatable=True
    )
    assert ts.summary_id == "task-001"
    assert len(ts.deliverables) == 2


def test_signal_entry_schema_fields():
    """Verify SignalEntry has all required fields."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.schemas import SignalEntry
    
    se = SignalEntry(
        signal_type="alignment-failure",
        session_id="20260409_000000",
        timestamp=datetime.now(timezone.utc),
        content="Test signal content",
        source="user-correction",
        confidence=0.85,
        related_memory=None
    )
    assert se.signal_type == "alignment-failure"
    assert se.related_memory is None


def test_storage_creates_directories():
    """Verify storage creates required directory structure."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    assert (base / "evolution").exists()
    assert (base / "evolution" / "signals").exists()
    assert (base / "evolution" / "memories").exists()
    assert (base / "evolution" / "summaries").exists()


def test_append_signal():
    """Verify append_signal writes to JSONL."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    storage.append_signal(
        signal_type="alignment-failure",
        session_id="20260409_000000",
        content="Test signal",
        source="user-correction",
        confidence=0.85
    )
    
    signal_file = base / "evolution" / "signals" / "alignment-failure.jsonl"
    assert signal_file.exists()
    with open(signal_file) as f:
        line = f.readline()
        record = json.loads(line)
        assert record["signal_type"] == "alignment-failure"
        assert record["session_id"] == "20260409_000000"


def test_append_error_memory():
    """Verify append_error_memory writes to JSONL."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    storage.append_error_memory(
        pattern_id="layer-confusion-001",
        type="layer-confusion",
        domain="vercel-deployment",
        signal="hotel-cashback-ops 404 on direct URL",
        root_cause="Vercel Edge Middleware interception vs Next.js application layer",
        correct_path="Identify layer via: curl -I (Edge) → check application logs (App)",
        ccb_phase=None,
        confidence=0.95,
        source="hotel-cashback-ops debug"
    )
    
    memory_file = base / "evolution" / "memories" / "error_memories.jsonl"
    assert memory_file.exists()
    with open(memory_file) as f:
        line = f.readline()
        record = json.loads(line)
        assert record["pattern_id"] == "layer-confusion-001"
        assert record["confidence"] == 0.95


def test_append_task_summary():
    """Verify append_task_summary writes to JSONL."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    storage.append_task_summary(
        summary_id="task-001",
        task="Test task",
        deliverables=["deliverable1", "deliverable2"],
        hypothesis_status={"h1": "verified", "h2": "rejected"},
        repeatable=True
    )
    
    summary_file = base / "evolution" / "summaries" / "task_summaries.jsonl"
    assert summary_file.exists()
    with open(summary_file) as f:
        line = f.readline()
        record = json.loads(line)
        assert record["summary_id"] == "task-001"
        assert len(record["deliverables"]) == 2


def test_query_memories_by_pattern_id():
    """Verify query_memories filters by pattern_id."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    # Add two records
    storage.append_error_memory(
        pattern_id="pattern-A",
        type="type-A",
        domain="domain-A",
        signal="signal-A",
        root_cause="cause-A",
        correct_path="path-A",
        confidence=0.9,
        source="source-A"
    )
    storage.append_error_memory(
        pattern_id="pattern-B",
        type="type-B",
        domain="domain-B",
        signal="signal-B",
        root_cause="cause-B",
        correct_path="path-B",
        confidence=0.8,
        source="source-B"
    )
    
    results = storage.query_memories(pattern_id="pattern-A")
    assert len(results) == 1
    assert results[0]["pattern_id"] == "pattern-A"


def test_query_memories_by_domain():
    """Verify query_memories filters by domain."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    storage.append_error_memory(
        pattern_id="pattern-X",
        type="type-X",
        domain="vercel-deployment",
        signal="signal-X",
        root_cause="cause-X",
        correct_path="path-X",
        confidence=0.9,
        source="source-X"
    )
    storage.append_error_memory(
        pattern_id="pattern-Y",
        type="type-Y",
        domain="local-dev",
        signal="signal-Y",
        root_cause="cause-Y",
        correct_path="path-Y",
        confidence=0.7,
        source="source-Y"
    )
    
    results = storage.query_memories(domain="vercel-deployment")
    assert len(results) == 1
    assert results[0]["pattern_id"] == "pattern-X"


def test_query_memories_by_min_confidence():
    """Verify query_memories filters by min_confidence."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    
    storage.append_error_memory(
        pattern_id="high-conf",
        type="type-1",
        domain="d1",
        signal="s1",
        root_cause="c1",
        correct_path="p1",
        confidence=0.95,
        source="src1"
    )
    storage.append_error_memory(
        pattern_id="low-conf",
        type="type-2",
        domain="d2",
        signal="s2",
        root_cause="c2",
        correct_path="p2",
        confidence=0.5,
        source="src2"
    )
    
    results = storage.query_memories(min_confidence=0.9)
    assert len(results) == 1
    assert results[0]["pattern_id"] == "high-conf"


def test_signal_collector_basic():
    """Verify SignalCollector can collect signals."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from evolution_memory.signal_collector import SignalCollector
    
    base = get_hermes_base()
    collector = SignalCollector(base=base)
    
    collector.collect(
        signal_type="diagnostic-path-failure",
        session_id="20260409_000001",
        content="Diagnostic path failed at step 3",
        source="self-detected",
        confidence=0.75
    )
    
    results = collector.get_signals(signal_type="diagnostic-path-failure")
    assert len(results) == 1
    assert results[0]["content"] == "Diagnostic path failed at step 3"