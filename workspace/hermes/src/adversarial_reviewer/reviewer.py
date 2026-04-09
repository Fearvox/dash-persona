"""Adversarial Reviewer - Review CCB phases for issues Opus/Codex missed."""

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any

from .checklist import ReviewChecklist


class AdversarialReviewer:
    """Adversarial reviewer for CCB phase reviews.
    
    Automatically reviews CCB phases to identify issues that Opus/Codex
    might have missed. Performs completeness, consistency, correctness,
    and security checks.
    """
    
    def __init__(self, storage: Optional[Any] = None):
        """Initialize the adversarial reviewer.
        
        Args:
            storage: Optional EvolutionStorage instance for anchoring findings
        """
        self.storage = storage
        self.checklist = ReviewChecklist()
    
    def review_phase(self, phase_dir: str, requirements_path: Optional[str] = None) -> Dict:
        """Review a CCB phase.
        
        Args:
            phase_dir: Path to phase directory (contains SUMMARY.md etc.)
            requirements_path: Optional path to REQUIREMENTS.md
            
        Returns: {
            'phase': str,
            'summary': str,
            'findings': {
                'critical': [list],
                'important': [list],
                'minor': [list]
            },
            'needs_code_verification': bool,
            'msa_results': dict | None,
            'verdict': 'approved' | 'needs_revision' | 'rejected',
            'confidence': float,
            'codex_arbiration': str | None,
        }
        """
        phase_path = Path(phase_dir)
        
        # Check phase directory exists
        if not phase_path.exists():
            raise FileNotFoundError(f"Phase directory does not exist: {phase_dir}")
        
        if not phase_path.is_dir():
            raise FileNotFoundError(f"Phase path is not a directory: {phase_dir}")
        
        # Check for SUMMARY.md
        summary_file = phase_path / "SUMMARY.md"
        if not summary_file.exists():
            raise ValueError(f"No SUMMARY.md found in {phase_dir}")
        
        # Load summary
        summary_content = summary_file.read_text()
        
        # Extract phase name from directory
        phase_name = phase_path.name
        
        # Load requirements if provided
        requirements_content = ""
        if requirements_path:
            req_path = Path(requirements_path)
            if req_path.exists():
                requirements_content = req_path.read_text()
        
        # Run completeness check
        completeness_findings = []
        if requirements_content:
            completeness_findings = self.checklist.check_completeness(
                summary_content, requirements_content
            )
        
        # Load optional roadmap and state
        roadmap_content = None
        state_content = None
        
        roadmap_file = phase_path.parent / "ROADMAP.md"
        if roadmap_file.exists():
            roadmap_content = roadmap_file.read_text()
        
        state_file = phase_path.parent / "STATE.md"
        if state_file.exists():
            state_content = state_file.read_text()
        
        # Run consistency check
        consistency_findings = self.checklist.check_consistency(
            summary_content, roadmap_content, state_content
        )
        
        # Run correctness check
        correctness_findings = self.checklist.check_correctness(
            summary_content, requirements_content
        )
        
        # Run security check
        security_findings = self.checklist.check_security_risks(summary_content)
        
        # Run gap check
        gap_findings = []
        if requirements_content:
            gap_findings = self.checklist.check_missing_gaps(
                summary_content, requirements_content
            )
        
        # Combine all findings
        all_findings = (
            completeness_findings + 
            consistency_findings + 
            correctness_findings +
            security_findings +
            gap_findings
        )
        
        # Categorize findings
        categorized = self._categorize_findings(all_findings)
        
        # Determine if code verification needed
        needs_code_verification = self._needs_code_verification(
            summary_content, requirements_content, completeness_findings
        )
        
        # Calculate confidence and determine verdict
        confidence, verdict = self._determine_verdict(
            categorized, needs_code_verification
        )
        
        # Run Codex arbitration if needed
        codex_arbitration = None
        if verdict in ("needs_revision", "rejected") or confidence < 0.7:
            codex_arbitration = self._run_codex_review(categorized)
        
        # Build result
        result = {
            "phase": phase_name,
            "summary": summary_content[:200] + "..." if len(summary_content) > 200 else summary_content,
            "findings": categorized,
            "needs_code_verification": needs_code_verification,
            "msa_results": None,  # MSA integration point
            "verdict": verdict,
            "confidence": confidence,
            "codex_arbitration": codex_arbitration,
        }
        
        # Anchor to evolution memory if storage available
        if self.storage and categorized["critical"]:
            self._anchor_to_memory(phase_name, categorized["critical"])
        
        return result
    
    def _categorize_findings(self, findings: List[str]) -> Dict[str, List[str]]:
        """Categorize findings into critical, important, minor."""
        categorized = {
            "critical": [],
            "important": [],
            "minor": []
        }
        
        for finding in findings:
            category = self.checklist.categorize_finding(finding)
            categorized[category].append(finding)
        
        return categorized
    
    def _needs_code_verification(self, summary: str, requirements: str,
                                  completeness_findings: List[str]) -> bool:
        """Determine if code verification is needed.
        
        Args:
            summary: Phase summary
            requirements: Requirements text
            completeness_findings: Findings from completeness check
            
        Returns:
            True if code verification should be triggered
        """
        # If there are contradictions between docs, need verification
        if completeness_findings and requirements:
            return True
        
        # If security issues found, need verification
        security_findings = self.checklist.check_security_risks(summary)
        if security_findings:
            return True
        
        # If correctness issues found, need verification
        correctness_findings = self.checklist.check_correctness(summary, requirements)
        if correctness_findings:
            return True
        
        return False
    
    def _determine_verdict(self, findings: Dict[str, List[str]], 
                          needs_verification: bool) -> tuple:
        """Determine verdict and confidence.
        
        Args:
            findings: Categorized findings
            needs_verification: Whether code verification is needed
            
        Returns:
            Tuple of (confidence, verdict)
        """
        critical_count = len(findings["critical"])
        important_count = len(findings["important"])
        minor_count = len(findings["minor"])
        
        # Base confidence
        confidence = 0.95
        
        # Reduce confidence based on findings
        if critical_count > 0:
            confidence -= 0.3 * min(critical_count, 3)
        if important_count > 0:
            confidence -= 0.1 * min(important_count, 5)
        if minor_count > 0:
            confidence -= 0.02 * min(minor_count, 10)
        
        # If needs code verification, lower confidence
        if needs_verification:
            confidence -= 0.15
        
        # Clamp confidence
        confidence = max(0.1, min(0.99, confidence))
        
        # Determine verdict
        if critical_count > 0:
            if critical_count >= 5:
                verdict = "rejected"
            else:
                verdict = "needs_revision"
        elif important_count >= 3:
            verdict = "needs_revision"
        elif needs_verification:
            verdict = "needs_revision"
        else:
            verdict = "approved"
        
        return confidence, verdict
    
    def _run_codex_review(self, findings: Dict[str, List[str]]) -> str:
        """Run Codex arbitration for critical findings.
        
        This is a placeholder for actual Codex integration.
        In production, this would invoke Codex to arbitrate disputed findings.
        
        Args:
            findings: Categorized findings
            
        Returns:
            Codex arbitration text
        """
        # Placeholder implementation
        arbitration = []
        arbitration.append("## Codex Arbitration\n")
        arbitration.append("\nThe following issues require external arbitration:\n")
        
        if findings["critical"]:
            arbitration.append("\n### Critical Findings\n")
            for i, finding in enumerate(findings["critical"], 1):
                arbitration.append(f"{i}. {finding}\n")
        
        if findings["important"]:
            arbitration.append("\n### Important Findings\n")
            for i, finding in enumerate(findings["important"], 1):
                arbitration.append(f"{i}. {finding}\n")
        
        arbitration.append("\n**Recommendation**: Review the above findings and ")
        arbitration.append("address them before proceeding to the next phase.\n")
        
        return "".join(arbitration)
    
    def _anchor_to_memory(self, phase: str, critical_findings: List[str]) -> None:
        """Anchor critical findings to evolution memory.
        
        Args:
            phase: Phase name
            critical_findings: List of critical findings
        """
        if not self.storage:
            return
        
        for finding in critical_findings:
            # Extract pattern info from finding
            pattern_id = f"ccb-review-{phase}-{len(critical_findings)}"
            
            self.storage.append_signal(
                signal_type="ccb-review-finding",
                session_id=phase,
                content=finding,
                source="adversarial-reviewer",
                confidence=0.9,
            )
    
    def generate_report(self, result: Dict) -> str:
        """Generate ADVERSARIAL-REVIEW.md content.
        
        Args:
            result: Review result from review_phase
            
        Returns:
            Markdown report content
        """
        lines = []
        lines.append(f"# Adversarial Review — {result['phase'].replace('-', ' ').title()}\n")
        lines.append("## Review Summary\n")
        
        # Generate summary paragraph
        critical = len(result['findings']['critical'])
        important = len(result['findings']['important'])
        minor = len(result['findings']['minor'])
        
        if critical == 0 and important == 0 and minor == 0:
            lines.append("Clean review with no significant issues found. ")
            lines.append("All requirements appear to be addressed correctly.\n")
        else:
            summary_parts = []
            if critical > 0:
                summary_parts.append(f"{critical} critical issue(s)")
            if important > 0:
                summary_parts.append(f"{important} important issue(s)")
            if minor > 0:
                summary_parts.append(f"{minor} minor observation(s)")
            lines.append(f"Review identified {', '.join(summary_parts)} that should be addressed.\n")
        
        lines.append("## Critical Findings (Must Fix)\n")
        if result['findings']['critical']:
            for i, finding in enumerate(result['findings']['critical'], 1):
                lines.append(f"- [F{i}]: {finding}\n")
        else:
            lines.append("No critical issues found.\n")
        
        lines.append("## Important Findings (Should Fix)\n")
        if result['findings']['important']:
            for i, finding in enumerate(result['findings']['important'], 1):
                lines.append(f"- [I{i}]: {finding}\n")
        else:
            lines.append("No important issues found.\n")
        
        lines.append("## Minor Observations\n")
        if result['findings']['minor']:
            for i, finding in enumerate(result['findings']['minor'], 1):
                lines.append(f"- [M{i}]: {finding}\n")
        else:
            lines.append("No minor observations.\n")
        
        # Codex arbitration section
        if result.get('codex_arbitration'):
            lines.append("\n" + result['codex_arbitration'] + "\n")
        
        # Verdict section
        lines.append("## Verdict\n")
        verdict = result['verdict']
        verdict_display = verdict.upper().replace('_', ' ')
        lines.append(f"**{verdict_display}**\n")
        
        if verdict == 'approved':
            lines.append("Phase can proceed to next stage.\n")
        elif verdict == 'needs_revision':
            lines.append("Phase requires revision before proceeding.\n")
        else:
            lines.append("Phase is rejected. Critical issues must be resolved.\n")
        
        # Footer
        lines.append("---\n")
        lines.append("Reviewed by: Hermes\n")
        
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        lines.append(f"Date: {date_str}\n")
        lines.append(f"Confidence: {int(result['confidence'] * 100)}%\n")
        
        if result.get('needs_code_verification'):
            lines.append("\n*Note: Code verification recommended before final approval.*\n")
        
        return "".join(lines)
