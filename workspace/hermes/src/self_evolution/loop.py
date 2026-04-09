"""Self-Evolution Loop — ACTIVATE → MONITOR → DETECT → CLASSIFY → ESCALATE → ANCHOR → ITERATE"""

from datetime import datetime, timezone
from typing import Optional, Callable


class SelfEvolutionLoop:
    """
    Main self-evolution harness orchestrating the full loop.

    Flow:
        ACTIVATE → MONITOR → DETECT → CLASSIFY → ESCALATE → ANCHOR → ITERATE
    """

    def __init__(
        self,
        classifier,        # TaskClassifier
        pre_checkpoint,   # PreCheckpoint
        mid_checkpoint,   # MidCheckpoint  
        post_checkpoint,  # PostCheckpoint
        storage,          # EvolutionStorage
        arbitrator=None,   # CodexArbitrator (optional)
    ):
        self.classifier = classifier
        self.pre_checkpoint = pre_checkpoint
        self.mid_checkpoint = mid_checkpoint
        self.post_checkpoint = post_checkpoint
        self.storage = storage
        self.arbitrator = arbitrator

        # State
        self._current_hypothesis = None
        self._initial_assumptions = []
        self._iteration_count = 0

    def activate(self, task_description: str, context: dict = None) -> dict:
        """
        ACTIVATE phase: trigger self-evolution loop.
        
        Checks if there are matching memories from past sessions (ITERATE).
        If so, presents suggestions in Pre-checkpoint.
        """
        result = {
            'phase': 'ACTIVATE',
            'task': task_description,
            'matched_memories': [],
            'suggestions': [],
        }

        # ITERATE: check Hippocampus for matching patterns
        matched = self._iterate(task_description, context)
        result['matched_memories'] = matched

        if matched:
            # Extract suggestions from matched memories
            result['suggestions'] = [m.get('correct_path', '') for m in matched if m.get('correct_path')]

        return result

    def run(self, task_description: str, context: dict = None,
            initial_hypothesis: str = None) -> dict:
        """
        Run the full self-evolution loop.

        Returns: {
            'flow': 'express' | 'standard',
            'pre_checkpoint': dict,
            'mid_checkpoint': dict | None,
            'post_checkpoint': dict,
            'evolution_record': dict,
        }
        """
        self._current_hypothesis = initial_hypothesis
        self._iteration_count += 1

        # Step 1: ACTIVATE
        activate_result = self.activate(task_description, context)

        # Step 2: Classify task
        classify_result = self.classifier.classify(task_description, context)

        # Step 3: Pre-checkpoint
        pre_result = self.pre_checkpoint.run(task_description, context)

        # Step 4: MONITOR — collect signals (if storage available)
        self._monitor(task_description, context, classify_result)

        # Step 5: Post-checkpoint (after task execution, called separately)
        post_result = None

        return {
            'flow': classify_result['flow'],
            'pre_checkpoint': pre_result,
            'matched_memories': activate_result['matched_memories'],
            'suggestions': activate_result['suggestions'],
            'classify_breakdown': classify_result['breakdown'],
            'hypothesis': self._current_hypothesis,
            'iteration': self._iteration_count,
        }

    def check_mid(self, message: str, context: dict = None) -> dict:
        """
        MONITOR/DETECT: check mid-task for assumption fractures.
        Returns mid_checkpoint result if triggered.
        """
        if self.mid_checkpoint is None:
            return {'triggered': False}

        result = self.mid_checkpoint.check(
            message=message,
            initial_hypothesis=self._current_hypothesis,
            detected_contradiction=None,
        )

        # If triggered and arbitrator available, run async ESCALATE
        if result.get('triggered') and self.arbitrator:
            confidence = result.get('confidence', 0.0)
            if confidence < 0.7:
                self._escalate_async(result, context)

        # If mid triggered, record signal
        if result.get('triggered') and self.storage:
            self.storage.append_signal(
                signal_type='mid-checkpoint-trigger',
                session_id=self._session_id(),
                content=f"Message: {message[:100]}, Keywords: {result.get('matched_keywords', [])}",
                source='self-detected',
                confidence=result.get('confidence', 0.5),
            )

        return result

    def complete(self, task_description: str, deliverables: list,
                 hypotheses: dict, context: dict = None) -> dict:
        """
        Complete task and run Post-checkpoint (ANCHOR phase).
        """
        # Run post-checkpoint
        post_result = self.post_checkpoint.run(
            task=task_description,
            deliverables=deliverables,
            hypotheses=hypotheses,
            context=context,
        )

        # ANCHOR: record critical findings to memory if any hypotheses were rejected
        self._anchor(hypotheses, task_description, context)

        return post_result

    # ── Internal ──────────────────────────────────────────────────────────────

    def _iterate(self, task_description: str, context: dict = None) -> list:
        """ITERATE: check for matching patterns in evolution memory."""
        if self.storage is None:
            return []

        # Simple domain extraction from task description
        domain = self._extract_domain(task_description)

        # Query memories for matching domain or pattern
        memories = self.storage.query_memories(domain=domain, min_confidence=0.8)
        if not memories:
            # Try pattern_id match on common error types
            for error_type in ['layer-confusion', 'alignment-failure', 'diagnostic-path']:
                memories = self.storage.query_memories(pattern_id=error_type, min_confidence=0.8)
                if memories:
                    break

        return memories

    def _monitor(self, task_description: str, context: dict, classify_result: dict):
        """MONITOR: record task start signals."""
        if self.storage is None:
            return

        self.storage.append_signal(
            signal_type='task-start',
            session_id=self._session_id(),
            content=f"Task: {task_description[:80]}, flow: {classify_result['flow']}",
            source='self-detected',
            confidence=1.0,
        )

    def _escalate_async(self, mid_result: dict, context: dict = None):
        """ESCALATE: trigger async Codex arbitration."""
        if self.arbitrator is None:
            return

        question = f"Mid-checkpoint triggered: {mid_result.get('matched_keywords', [])}"
        ctx = {
            'task': context.get('task', '') if context else '',
            'detected_issue': str(mid_result.get('matched_keywords', [])),
            'confidence': mid_result.get('confidence', 0.5),
            'layer_judgment': mid_result.get('layer_judgment', 'unknown'),
            'initial_hypothesis': self._current_hypothesis or '',
        }

        self.arbitrator.arbitrate_async(question, ctx)

    def _anchor(self, hypotheses: dict, task: str, context: dict = None):
        """ANCHOR: record error patterns to evolution memory."""
        if self.storage is None:
            return

        for hypothesis, status in hypotheses.items():
            if status == 'rejected':
                # Record as error memory
                pattern_id = f"rejected-{self._session_id()[:8]}"
                self.storage.append_error_memory(
                    pattern_id=pattern_id,
                    type='hypothesis-rejection',
                    domain=self._extract_domain(task),
                    signal=task,
                    root_cause=f"假设被推翻: {hypothesis}",
                    correct_path="需重新验证假设方向",
                    confidence=0.8,
                    source='post-checkpoint',
                )

    def _extract_domain(self, text: str) -> str:
        """Extract domain hint from task text."""
        # Simple keyword-based domain detection
        text_lower = text.lower()
        if any(k in text_lower for k in ['deploy', 'vercel', 'aws', 'cloud', 'server']):
            return 'deployment'
        if any(k in text_lower for k in ['auth', 'login', 'password', 'token']):
            return 'authentication'
        if any(k in text_lower for k in ['api', 'http', 'request', 'response']):
            return 'api'
        if any(k in text_lower for k in ['database', 'sql', 'query', 'db']):
            return 'database'
        return 'general'

    def _session_id(self) -> str:
        """Generate session ID."""
        return datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')