"""Scoring rules for the four dimensions."""
import re
from typing import Tuple


# ---------------------------------------------------------------------------
# step_score: how many discrete steps does the task imply?
# ---------------------------------------------------------------------------
STEP_SEQUENCE_MARKERS = [
    "然后", "之后", "接着", "再", "最后",
]
STEP_MULTI_MARKERS = [
    "和", "一起", "以及", "并且",
]


def score_step(task: str) -> int:
    """
    0 = single step (帮我做X)
    1 = 2-3 steps  (帮我做X然后做Y)
    2 = 4+ steps  (先X，再Y，再Z，最后W)
    """
    text = task.lower()

    # Split by punctuation into potential steps
    parts = re.split(r"[，,。\n]+", text)
    verb_parts = [p.strip() for p in parts if p.strip() and len(p.strip()) > 2]
    num_parts = len(verb_parts)

    # Sequential markers within the text
    seq_markers = sum(1 for m in ["然后", "之后", "接着", "再", "最后", "先"] if m in text)

    # Pattern: 先X，再Y，再Z，最后W (or similar multi-phase sequences)
    # If we have "先...再...再...最后" pattern, that implies 4+ steps
    has_multi_phase = bool(re.search(r"先.*再.*再.*最后", text))

    if seq_markers >= 3 or num_parts >= 4 or has_multi_phase:
        return 2
    if seq_markers >= 1 or num_parts >= 2:
        return 1
    return 0


# ---------------------------------------------------------------------------
# irr_score: irreversibility / risk level of operations
# ---------------------------------------------------------------------------
IRR_READ_EN = frozenset([
    "ls", "dir", "list", "cat", "head", "tail", "find", "grep", "rg",
    "search", "look", "view", "show", "display", "get", "fetch", "read",
    "status", "stat", "tree", "pwd", "cd", "navigate", "check", "inspect",
    "git status", "git log", "git diff",
])

IRR_READ_ZH = frozenset([
    "查看", "浏览", "读取", "读取", "检查", "查看", "看看", "搜索", "查找",
])

IRR_WRITE_EN = frozenset([
    "create", "write", "edit", "update", "add", "append", "insert",
    "cp", "copy", "mv", "move", "rename", "touch", "mkdir",
    "commit", "push", "pull", "merge",
    "save", "export", "import",
])

IRR_WRITE_ZH = frozenset([
    "创建", "新建", "写入", "编辑", "修改", "更新", "添加", "新增",
    "复制", "拷贝", "移动", "重命名", "提交", "推送", "拉取", "合并",
    "保存", "导出", "导入",
])

IRR_DELETE_EN = frozenset([
    "rm", "delete", "del", "remove", "trash", "unlink",
    "drop", "clear", "reset", "wipe",
    "force", "force push", "force-pull", "--force", "--overwrite",
])

IRR_DELETE_ZH = frozenset([
    "删除", "删掉", "移除", "清除", "清理", "强制", "覆盖", "推送到远程",
    "强制推送",
])


def score_irr(task: str) -> int:
    """
    0 = read-only operations
    1 = write / configure operations
    2 = delete / overwrite / force-push operations
    """
    text = task.lower()

    # Check for delete/force first (highest risk)
    delete_all = IRR_DELETE_EN | IRR_DELETE_ZH
    if any(kw in text for kw in delete_all):
        return 2

    # Then check for write operations
    write_all = IRR_WRITE_EN | IRR_WRITE_ZH
    if any(kw in text for kw in write_all):
        return 1

    # Then check for read operations
    read_all = IRR_READ_EN | IRR_READ_ZH
    if any(kw in text for kw in read_all):
        return 0

    # Default to read if no keywords matched
    return 0


# ---------------------------------------------------------------------------
# layer_score: how many technology layers are involved?
# ---------------------------------------------------------------------------
LAYER_PLATFORM = frozenset([
    "云", "aws", "azure", "gcp", "deploy", "部署",
    "kubernetes", "k8s", "docker", "container",
    "vercel", "netlify", "heroku", "serverless",
    "ci/cd", "pipeline", "github actions", "生产环境",
    "系统", "平台",
])

LAYER_APPLICATION = frozenset([
    "api", "http", "rest", "graphql", "grpc",
    "server", "service", "app", "应用",
    "frontend", "前端", "backend", "后端",
    "client", "sdk",
])

LAYER_DATA = frozenset([
    "database", "db", "数据库", "sql", "mongodb",
    "redis", "cache", "存储", "storage",
    "file", "file system", "文件系统", "s3",
])


def score_layer(task: str) -> int:
    """
    0 = single layer (local code only)
    1 = two layers (code + external service)
    2 = three+ layers (platform + app + data)
    """
    text = task.lower()

    layers = 0
    if any(kw in text for kw in LAYER_PLATFORM):
        layers += 1
    if any(kw in text for kw in LAYER_APPLICATION):
        layers += 1
    if any(kw in text for kw in LAYER_DATA):
        layers += 1

    if layers >= 3:
        return 2
    if layers >= 1:
        return 1
    return 0


# ---------------------------------------------------------------------------
# explore_score: how clear is the target?
# ---------------------------------------------------------------------------
EXPLORE_VAGUE_PATTERNS = [
    "更好", "更快", "改进", "更优",  # "更好/更快" without specific target is vague
    "探索", "试试", "研究", "了解一下",
    "可能", "或许", "也许",
    "让系统", "让这个东西", "让那件事",  # vague causitive
]


def score_explore(task: str, context: dict = None) -> int:
    """
    0 = clear target with known path / file / function
    1 = direction clear but path needs exploration
    2 = goal itself is vague
    """
    text = task.lower()

    # Check for vague goals first
    for pattern in EXPLORE_VAGUE_PATTERNS:
        if pattern in text:
            return 2

    # Check for clear explicit targets (file paths, function names)
    clear_patterns = [
        r"打开\s+\S+\.\S+",      # 打开 xxx.py
        r"修改\s+\S+\.\S+",      # 修改 xxx.py
        r"编辑\s+\S+\.\S+",      # 编辑 xxx.py
        r"修复\s+\S+\.\S+",      # 修复 xxx.py
        r"函数\s+\S+",           # 函数 xxx
        r"路径\s+\S+",           # 路径 xxx
    ]
    for pattern in clear_patterns:
        if re.search(pattern, text):
            return 0

    # Also check for simple imperative with specific target
    # e.g. "帮我做X" where X is a specific thing
    if re.match(r"^帮我\s+\S+", text.strip()):
        return 0

    # Context can provide clarity
    if context:
        if context.get("target") or context.get("path") or context.get("file"):
            return 0
        if context.get("operation") == "read":
            return 0

    # Direction clear but needs exploration
    return 1


# ---------------------------------------------------------------------------
# Combined scorer
# ---------------------------------------------------------------------------
def score_all(task: str, context: dict = None) -> Tuple[int, dict, str]:
    """
    Returns (total_score, breakdown_dict, reasoning_str).
    """
    step = score_step(task)
    irr = score_irr(task)
    layer = score_layer(task)
    explore = score_explore(task, context)

    total = step + irr + layer + explore

    breakdown = {
        "step": step,
        "irr": irr,
        "layer": layer,
        "explore": explore,
    }

    step_label = "single" if step == 0 else "2-3" if step == 1 else "4+"
    irr_label = "read" if irr == 0 else "write" if irr == 1 else "delete"
    explore_label = "clear" if explore == 0 else "direction" if explore == 1 else "vague"

    reasoning = (
        f"step={step}({step_label}), irr={irr}({irr_label}), "
        f"layer={layer}, explore={explore}({explore_label}), total={total}"
    )

    return total, breakdown, reasoning
