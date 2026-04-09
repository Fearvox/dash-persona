"""Test Adversarial Reviewer (adv-001)"""

import json
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
    import os
    base = os.environ.get("HERMES_BASE")
    if base:
        return Path(base)
    return Path.home() / ".hermes"


def test_adversarial_reviewer_import():
    """Verify AdversarialReviewer is importable."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    assert AdversarialReviewer is not None


def test_checklist_import():
    """Verify checklist module is importable."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    assert ReviewChecklist is not None


def test_review_phase_requires_summary():
    """Verify review_phase raises if SUMMARY.md missing."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    # Create phase dir without SUMMARY.md
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    
    with pytest.raises(ValueError, match="No SUMMARY.md found"):
        reviewer.review_phase(str(phase_dir))


def test_review_phase_nonexistent_dir():
    """Verify review_phase raises if phase_dir doesn't exist."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    with pytest.raises(FileNotFoundError):
        reviewer.review_phase(str(base / "nonexistent-phase"))


def test_check_completeness_finds_missing_requirements():
    """Verify completeness check detects missing requirement items."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    
    checklist = ReviewChecklist()
    
    summary = """
    # Phase 1 Summary
    
    Completed the following:
    - Feature A implemented
    - Feature B implemented
    """
    
    requirements = """
    # Requirements
    
    - [REQ-1] Feature A must be implemented
    - [REQ-2] Feature B must be implemented  
    - [REQ-3] Feature C must be implemented
    """
    
    findings = checklist.check_completeness(summary, requirements)
    
    # Should find REQ-3 missing
    assert len(findings) == 1
    assert "REQ-3" in findings[0]


def test_check_completeness_passes_when_all_covered():
    """Verify completeness check passes when all requirements covered."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    
    checklist = ReviewChecklist()
    
    summary = """
    # Phase 1 Summary
    
    Completed:
    - Feature A implemented
    - Feature B implemented
    - Feature C implemented
    """
    
    requirements = """
    # Requirements
    
    - [REQ-1] Feature A must be implemented
    - [REQ-2] Feature B must be implemented  
    - [REQ-3] Feature C must be implemented
    """
    
    findings = checklist.check_completeness(summary, requirements)
    
    assert len(findings) == 0


def test_check_consistency_detects_mismatch():
    """Verify consistency check detects summary vs state mismatch."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    
    checklist = ReviewChecklist()
    
    summary = "Phase 2 completed. State: feature-x is LIVE."
    state = "feature-x is PENDING_DEPLOYMENT"
    
    findings = checklist.check_consistency(summary, roadmap=None, state=state)
    
    assert len(findings) >= 1
    # Should detect the LIVE vs PENDING_DEPLOYMENT mismatch
    assert any("LIVE" in f and "PENDING" in f for f in findings)


def test_check_consistency_with_roadmap():
    """Verify consistency check against roadmap."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    
    checklist = ReviewChecklist()
    
    summary = "Phase 1 completed with layer-confusion-001 pattern."
    roadmap = "Phase 1: Complete layer architecture setup"
    
    findings = checklist.check_consistency(summary, roadmap=roadmap, state=None)
    
    # Phase 1 summary should be consistent with Phase 1 roadmap
    assert len(findings) == 0


def test_review_phase_returns_proper_structure():
    """Verify review_phase returns expected result structure."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    # Create valid phase dir
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nCompleted feature A.")
    
    result = reviewer.review_phase(str(phase_dir))
    
    assert "phase" in result
    assert "summary" in result
    assert "findings" in result
    assert "critical" in result["findings"]
    assert "important" in result["findings"]
    assert "minor" in result["findings"]
    assert "needs_code_verification" in result
    assert "verdict" in result
    assert "confidence" in result


def test_verdict_approved_for_clean_review():
    """Verify verdict is APPROVED when no issues found."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    # Create clean phase dir with summary
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nAll requirements met. Clean implementation.")
    
    result = reviewer.review_phase(str(phase_dir))
    
    assert result["verdict"] == "approved"
    assert result["confidence"] >= 0.9


def test_verdict_needs_revision_for_critical_findings():
    """Verify verdict is NEEDS_REVISION when critical findings exist."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    # Create phase dir with requirements
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nCompleted feature A.")
    (phase_dir / "REQUIREMENTS.md").write_text("""
# Requirements
- [REQ-1] Feature A implemented
- [REQ-2] Feature B must be implemented
""")
    
    result = reviewer.review_phase(str(phase_dir), requirements_path=str(phase_dir / "REQUIREMENTS.md"))
    
    assert result["verdict"] == "needs_revision"
    assert len(result["findings"]["critical"]) >= 1


def test_generate_report_creates_markdown():
    """Verify report generation creates proper markdown."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nCompleted.")
    
    result = reviewer.review_phase(str(phase_dir))
    report = reviewer.generate_report(result)
    
    assert "# Adversarial Review" in report
    assert "Phase 1" in report
    assert "## Review Summary" in report
    assert "## Critical Findings" in report or "No critical" in report.lower()
    assert "## Verdict" in report
    assert "APPROVED" in report or "NEEDS_REVISION" in report or "REJECTED" in report


def test_needs_code_verification_flag():
    """Verify needs_code_verification flag is set when doc contradictions exist."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    # Create phase with requirements but summary missing some
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nPartial implementation.")
    (phase_dir / "REQUIREMENTS.md").write_text("""
# Requirements
- [REQ-1] Full implementation required
""")
    
    result = reviewer.review_phase(str(phase_dir), requirements_path=str(phase_dir / "REQUIREMENTS.md"))
    
    # When there's contradiction between docs, needs_code_verification should be true
    assert result["needs_code_verification"] is True


def test_review_with_storage_integration():
    """Verify review can anchor findings to evolution memory when storage provided."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    from evolution_memory.storage import EvolutionStorage
    
    base = get_hermes_base()
    storage = EvolutionStorage(base=base)
    reviewer = AdversarialReviewer(storage=storage)
    
    # Create phase with missing requirements
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nIncomplete.")
    (phase_dir / "REQUIREMENTS.md").write_text("""
# Requirements
- [REQ-1] Must complete full implementation
- [REQ-2] Must handle edge cases
""")
    
    result = reviewer.review_phase(str(phase_dir), requirements_path=str(phase_dir / "REQUIREMENTS.md"))
    
    # Should have findings and verdict
    assert len(result["findings"]["critical"]) >= 1
    assert result["verdict"] == "needs_revision"
    
    # Check if signals were anchored to storage
    signals = storage.get_signals(signal_type="ccb-review-finding")
    assert len(signals) >= 1


def test_checklist_detects_security_risk():
    """Verify checklist can detect security risks."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.checklist import ReviewChecklist
    
    checklist = ReviewChecklist()
    
    summary = """
    # Phase 1 Summary
    
    Implemented authentication:
    - Passwords stored in plain text
    - API keys hardcoded in source
    """
    
    findings = checklist.check_security_risks(summary)
    
    assert len(findings) >= 1
    assert any("security" in f.lower() or "password" in f.lower() or "api key" in f.lower() 
               for f in findings)


def test_review_with_multiple_issues():
    """Verify review properly categorizes multiple findings."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
    from adversarial_reviewer.reviewer import AdversarialReviewer
    
    base = get_hermes_base()
    reviewer = AdversarialReviewer(storage=None)
    
    phase_dir = base / "phase-1"
    phase_dir.mkdir(parents=True)
    (phase_dir / "SUMMARY.md").write_text("# Phase 1 Summary\n\nPartial work.")
    (phase_dir / "REQUIREMENTS.md").write_text("""
# Requirements
- [REQ-1] Feature A
- [REQ-2] Feature B  
- [REQ-3] Feature C
- [REQ-4] Feature D
""")
    
    result = reviewer.review_phase(str(phase_dir), requirements_path=str(phase_dir / "REQUIREMENTS.md"))
    
    # Should have multiple critical findings for missing requirements
    assert len(result["findings"]["critical"]) >= 3
    assert result["verdict"] == "needs_revision"
