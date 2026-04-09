"""Review checklist logic for CCB phase adversarial review."""

import re
from typing import List, Optional, Tuple


class ReviewChecklist:
    """Implements review checklist for CCB phase adversarial review.
    
    Performs completeness, consistency, correctness, and security checks
    against requirements, roadmap, and state documents.
    """
    
    def __init__(self):
        """Initialize the review checklist."""
        pass
    
    def check_completeness(self, summary: str, requirements: str) -> List[str]:
        """Check if all requirements are covered in the summary.
        
        Args:
            summary: The phase summary text
            requirements: The requirements text containing [REQ-N] items
            
        Returns:
            List of findings describing missing requirements
        """
        findings = []
        
        if not requirements:
            return findings
        
        # Extract requirement IDs and their text from requirements
        required_items = self._parse_requirements(requirements)
        
        if not required_items:
            return findings
        
        # Check each required item against the summary
        for req_id, req_text in required_items.items():
            # Extract key feature names (first significant words)
            # e.g., "Feature A must be implemented" -> ["Feature A", "implemented"]
            words = req_text.split()
            key_terms = []
            for i, word in enumerate(words):
                # Capture the feature identifier (e.g., "Feature A") 
                if word.lower() in ('feature', 'component', 'module', 'function', 'service'):
                    if i + 1 < len(words):
                        key_terms.append(f"{word} {words[i+1]}".lower())
                # Also capture significant nouns
                elif len(word) > 3 and word[0].isupper():
                    key_terms.append(word.lower())
            
            # Check if key terms appear in summary
            summary_lower = summary.lower()
            matched_terms = sum(1 for term in key_terms if term in summary_lower)
            
            # If less than half of key terms found, mark as missing
            if matched_terms < len(key_terms) / 2 and key_terms:
                # Also check if the REQ ID itself is mentioned
                if req_id not in summary:
                    findings.append(
                        f"[{req_id}]: Requirement not addressed in summary - {req_text[:60]}..."
                    )
        
        return findings
    
    def check_consistency(self, summary: str, roadmap: Optional[str] = None, 
                         state: Optional[str] = None) -> List[str]:
        """Check consistency between summary, roadmap, and state.
        
        Args:
            summary: The phase summary text
            roadmap: Optional roadmap text
            state: Optional state text
            
        Returns:
            List of inconsistency findings
        """
        findings = []
        
        # Check consistency with state
        if state:
            findings.extend(self._check_state_consistency(summary, state))
        
        # Check consistency with roadmap
        if roadmap:
            findings.extend(self._check_roadmap_consistency(summary, roadmap))
        
        return findings
    
    def _check_state_consistency(self, summary: str, state: str) -> List[str]:
        """Check summary against state document for inconsistencies."""
        findings = []
        
        summary_lower = summary.lower()
        state_lower = state.lower()
        
        # Extract status keywords
        status_keywords = {
            'live': ['live', 'deployed', 'production', 'live'],
            'pending': ['pending', 'planned', 'todo', 'to-do', 'backlog'],
            'in_progress': ['in progress', 'in-progress', 'wip', 'ongoing'],
            'completed': ['completed', 'done', 'finished', 'complete'],
            'failed': ['failed', 'error', 'broken', 'rejected'],
        }
        
        # Look for state indicators in summary
        summary_states = []
        for state_name, keywords in status_keywords.items():
            for kw in keywords:
                if kw in summary_lower:
                    summary_states.append(state_name)
                    break
        
        # Look for state indicators in state document
        doc_states = []
        for state_name, keywords in status_keywords.items():
            for kw in keywords:
                if kw in state_lower:
                    doc_states.append(state_name)
                    break
        
        # Check for direct contradictions
        if summary_states and doc_states:
            # If summary says LIVE but state says PENDING, that's a conflict
            if 'live' in summary_states and 'pending' in doc_states:
                findings.append(
                    "State conflict: Summary indicates 'LIVE' but state document shows 'PENDING'"
                )
            if 'live' in summary_states and 'in_progress' in doc_states:
                findings.append(
                    "State conflict: Summary indicates 'LIVE' but state shows 'IN_PROGRESS'"
                )
            if 'completed' in summary_states and 'pending' in doc_states:
                findings.append(
                    "State conflict: Summary indicates 'COMPLETED' but state shows 'PENDING'"
                )
        
        return findings
    
    def _check_roadmap_consistency(self, summary: str, roadmap: str) -> List[str]:
        """Check summary against roadmap for phase/sequence issues."""
        findings = []
        
        # Extract phase numbers from summary and roadmap
        summary_phase = re.search(r'phase\s*(\d+)', summary, re.IGNORECASE)
        roadmap_phase = re.search(r'phase\s*(\d+)', roadmap, re.IGNORECASE)
        
        if summary_phase and roadmap_phase:
            if summary_phase.group(1) != roadmap_phase.group(1):
                findings.append(
                    f"Phase mismatch: Summary Phase {summary_phase.group(1)} "
                    f"but Roadmap Phase {roadmap_phase.group(1)}"
                )
        
        return findings
    
    def check_correctness(self, summary: str, requirements: str) -> List[str]:
        """Check technical claims for accuracy.
        
        Args:
            summary: The phase summary text
            requirements: The requirements text
            
        Returns:
            List of correctness findings
        """
        findings = []
        
        # Check for common technical inaccuracies
        
        # If summary claims all requirements met, verify against actual requirements
        if re.search(r'all\s+requirements?\s+(met|complete|fulfilled|done)', summary, re.IGNORECASE):
            if requirements:
                req_ids = re.findall(r'\[(REQ-\d+)\]', requirements)
                for req_id in req_ids:
                    if req_id not in summary:
                        findings.append(
                            f"[{req_id}]: Claimed 'all requirements met' but this requirement not found"
                        )
        
        return findings
    
    def check_security_risks(self, summary: str) -> List[str]:
        """Check for potential security issues in the implementation.
        
        Args:
            summary: The phase summary text
            
        Returns:
            List of security risk findings
        """
        findings = []
        
        summary_lower = summary.lower()
        
        # Security anti-patterns to detect
        security_issues = [
            (r'password.*(plain|text|clear)', 
             "Password stored in plain text - use proper hashing"),
            (r'api[_-]?key.*(hardcoded|source|code)',
             "API key hardcoded in source - use environment variables"),
            (r'secret.*(hardcoded|source|code)',
             "Secret hardcoded in source - use secure secret management"),
            (r'sql\s*(query|statement).*(concat|string\s*\+)',
             "Potential SQL injection - use parameterized queries"),
            (r'innerHTML.*\+',
             "Potential XSS vulnerability with innerHTML concatenation"),
            (r'eval\s*\(',
             "Use of eval() poses security risk"),
            (r'cors\s*=\s*["\']?\*["\']?',
             "CORS set to wildcard - consider restricting origins"),
        ]
        
        for pattern, message in security_issues:
            if re.search(pattern, summary_lower):
                findings.append(f"Security: {message}")
        
        return findings
    
    def check_missing_gaps(self, summary: str, requirements: str) -> List[str]:
        """Check for gaps in requirements coverage.
        
        Args:
            summary: The phase summary text
            requirements: The requirements text
            
        Returns:
            List of gap findings
        """
        findings = []
        
        if not requirements:
            return findings
        
        # Parse requirements into structured format
        req_sections = self._parse_requirements(requirements)
        
        for req_id, req_text in req_sections.items():
            # Check if the requirement has been addressed
            req_clean = re.sub(r'\[.*?\]\s*', '', req_text).lower()
            req_keywords = [w for w in req_clean.split() if len(w) > 4]
            
            if len(req_keywords) >= 2:
                # Check if most keywords appear in summary
                matches = sum(1 for kw in req_keywords if kw in summary.lower())
                if matches < len(req_keywords) * 0.5:  # Less than 50% keyword match
                    findings.append(
                        f"[{req_id}]: Potential gap - requirement may not be fully addressed"
                    )
        
        return findings
    
    def _parse_requirements(self, requirements: str) -> dict:
        """Parse requirements text into structured dict."""
        result = {}
        lines = requirements.split('\n')
        current_id = None
        current_text = []
        
        for line in lines:
            # Match patterns like: - [REQ-1] Feature A must be implemented
            # or: [REQ-1] Feature A must be implemented
            req_match = re.match(r'\s*-?\s*\[(REQ-\d+)\]\s*(.+)', line)
            if req_match:
                if current_id:
                    result[current_id] = ' '.join(current_text)
                current_id = req_match.group(1)
                current_text = [req_match.group(2)]
            elif current_id and line.strip():
                current_text.append(line.strip())
        
        if current_id:
            result[current_id] = ' '.join(current_text)
        
        return result
    
    def categorize_finding(self, finding: str) -> str:
        """Categorize a finding as critical, important, or minor.
        
        Args:
            finding: The finding text
            
        Returns:
            Category: 'critical', 'important', or 'minor'
        """
        critical_keywords = [
            'security', 'password', 'secret', 'api key', 'sql injection',
            'xss', 'cors', 'auth', 'permission', 'access control',
            'missing requirement', 'requirement not addressed',
            'state conflict', 'live vs', 'rejected'
        ]
        
        important_keywords = [
            'inconsistency', 'mismatch', 'gap', 'partial', 'incomplete',
            'phase mismatch', 'should fix', 'recommended'
        ]
        
        finding_lower = finding.lower()
        
        for kw in critical_keywords:
            if kw in finding_lower:
                return 'critical'
        
        for kw in important_keywords:
            if kw in finding_lower:
                return 'important'
        
        return 'minor'
