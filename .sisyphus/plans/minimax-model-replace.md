# Plan: 把 OpenCode 所有模型替换为 minimax-m2.7

## TL;DR
**Summary**: 把 OpenCode 的主会话模型从 `opus[1m]` 换成 `minimax-m2.7`，GSD 子代理模式改为 `inherit` 继承主模型。
**Deliverables**: 3个配置文件修改
**Effort**: Quick
**Parallel**: NO
**Critical Path**: settings.json → .planning/config.json

## Context
用户要求把 OpenCode 所有模型统一替换为 minimax-m2.7 Minmax.io 的 coding plan provider。

## Work Objectives
### Core Objective
把 minimax-m2.7 设为 OpenCode 的默认模型，所有 GSD 子代理继承该模型。

### Must Have
- `~/.claude/settings.json` 第44行：`"model": "opus[1m]"` → `"model": "minimax-m2.7"`
- `.planning/config.json`：`"model_profile": "balanced"` → `"model_profile": "inherit"`

### Must NOT Have
- 不修改其他任何配置
- 不改动 agent SDK / plugin 配置

## Verification Strategy
- 验证 settings.json 中 model 字段为 minimax-m2.7
- 验证 config.json 中 model_profile 为 inherit

## TODOs

- [x] 1. 修改主会话模型

  **What to do**: 把 `~/.claude/settings.json` 第44行的 `"model": "opus[1m]"` 改为 `"model": "minimax-m2.7"`

  **Must NOT do**: 不要改其他字段

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 简单文件替换
  - Skills: [] - 不需要特殊 skill
  - Omitted: [] 

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - File: `~/.claude/settings.json:44`

  **Acceptance Criteria**:
  - [x] `grep '"model"' ~/.claude/settings.json` 返回 `minimax-m2.7` ✅ verified 2026-04-09

  **QA Scenarios**:
  ```
  Scenario: 验证模型已更改
    Tool: Bash
    Steps: grep '"model"' ~/.claude/settings.json
    Expected: "model": "minimax-m2.7"
  ```

  **Commit**: NO

- [x] 2. 修改 GSD 子代理模型继承策略

  **What to do**: 把 `.planning/config.json` 的 `"model_profile": "balanced"` 改为 `"model_profile": "inherit"`，让所有 GSD 子代理继承主会话模型

  **Must NOT do**: 不要改动 resolve_model_ids 和其他字段

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 简单 JSON 字段替换
  - Skills: [] 
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - File: `~/.openclaw/workspace/dash-persona/.planning/config.json`

  **Acceptance Criteria**:
  - [x] `grep 'model_profile' ~/.openclaw/workspace/dash-persona/.planning/config.json` 返回 `inherit` ✅ verified 2026-04-09

  **QA Scenarios**:
  ```
  Scenario: 验证 model_profile 已更改为 inherit
    Tool: Bash
    Steps: grep 'model_profile' ~/.openclaw/workspace/dash-persona/.planning/config.json
    Expected: "model_profile": "inherit"
  ```

  **Commit**: NO

- [x] 3. 修改 openclaw.json agent 子系统默认模型

  **What to do**: 把 `~/.openclaw/openclaw.json` 的 `agents.defaults.model.primary` 从 `anthropic/claude-sonnet-4-6` 改为 `minimax-coding-plan/MiniMax-M2.7`

  **Must NOT do**: 不要改动文件中其他 `primary` 字段（各子 agent 有自己的模型配置）

  **References**:
  - File: `~/.openclaw/openclaw.json:329-331`

  **Acceptance Criteria**:
  - [x] 验证值为 `minimax-coding-plan/MiniMax-M2.7` ✅ verified 2026-04-09

  **Commit**: NO
