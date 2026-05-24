# THE Frame

FRAME — 面向 AI 辅助独立开发的框架

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## 什么是 FRAME？

**FRAME（面向 AI 辅助独立开发的框架）** 是一个专为使用 Claude Code 独立构建产品的开发者设计的框架。它将混乱的 AI 辅助开发转变为可预测的流程——从想法到部署——具备记忆、结构和防错保护。

如果你正在独自使用 Claude Code 构建产品，并希望像团队一样工作——FRAME 就是为你准备的。

## FRAME 解决哪些问题？

| 问题 | FRAME 提供的解决方案 |
|------|-------------------|
| 会话之间丢失上下文 | 项目记忆和会话开始时自动状态转储 |
| 任务和优先级混乱 | 6 阶段工作流：研究 → 计划 → 构建 → 审查 → 发布 → 反思 |
| 害怕破坏重要内容 | 安全钩子在运行前阻止破坏性命令 |
| 重复性日常任务 | 35 个现成命令覆盖完整开发周期 |
| 具有依赖关系的复杂功能 | 并行子代理处理独立任务 |
| 独立工作缺乏结构 | Roadmap、STATE.md、MAP.md——始终知道你在哪里以及下一步是什么 |
| 发布时存在安全漏洞 | 安全代理审计 OWASP Top 10、密钥泄露、基础设施、AI 风险 |

## 如何使用 FRAME

```
研究 → 计划 → 构建 → 审查 → 发布 → 反思
```

每个会话是一个周期。从 `/frame:daily` 开始，以 `/frame:ship` 结束。

**研究** — 构建前先理解
运行 `/frame:research <主题>` — Claude 探索代码库、外部资源，并为下一步构建上下文。

**计划** — 分解为任务
`/frame:plan <功能>` 将研究转化为带有估算的具体任务列表。

**构建** — 实现
`/frame:build` 按顺序执行任务（每次 1–3 个），采用 TDD。对于许多独立任务——`/frame:wave` 以并行批次运行它们。卡住了——`/frame:unstuck`。发现 bug——`/frame:debug`。

**审查** — 部署前检查
`/frame:review` 运行自动化检查并提供清单：测试、类型、安全性、性能。

**发布** — 部署并记录
`/frame:ship` 提交，可选推送/PR，并更新项目记忆。

**反思** — 学习并改进
部署后运行 `/frame:retrospective` 更新指标并捕获未来会话的模式。

## 示例

### 新功能：添加 Google 身份验证

```
/frame:daily
# → 查看当前项目状态和计划内容

/frame:research "Google OAuth"
# → Claude 研究代码库：当前身份验证如何工作，
#   已使用哪些模式，需要添加什么

/frame:plan "Google OAuth"
# → 获取具体任务列表：
#   1. 配置 Google OAuth 凭据
#   2. 添加回调路由
#   3. 连接到会话
#   4. 在 UI 中添加按钮

/frame:checkpoint
# → 保存还原点——如果出错，可以回滚

/frame:wave
# → 任务 1–4 是独立的，Claude 并行运行它们

/frame:review
# → 自动化检查：测试、类型、安全性

/frame:ship
# → 提交，可选推送/PR，项目记忆已更新
```

### Bug：用户在密码重置后无法登录

```
/frame:daily
# → 恢复上下文，查看 bug 是否已在计划中或添加它

/frame:debug "login after reset"
# → Claude 系统性检查：日志、重置流程、会话、令牌
# → 你会得到一个带有代码中具体位置的假设

# 如果立即找到原因：
/frame:checkpoint                        # 修复前的还原点
/frame:fast "fix: invalidate old session after password reset"
# → Claude 进行有针对性的修复，编写回归测试

# 如果原因不清楚——深入挖掘：
/frame:forensics
# → 分析该区域变更的 git 历史，
#   找到破坏行为的提交

/frame:checkpoint
/frame:fast "fix: ..."                   # 修复找到的原因

/frame:review
# → 确认修复没有破坏其他登录场景

/frame:ship
```

### UI 验证：确认界面正常工作

```
/frame:build
# → Claude 实现任务，说"完成"

/frame:verify-ui
# → 通过 Playwright MCP 打开浏览器，截图
# → 与任务描述对比
# → PASS：界面符合预期
# → FAIL：精确描述哪里有问题以及在哪里查看

# 如果有问题：
/frame:fast "fix: 按钮在移动端不显示"
/frame:verify-ui
# → 修复后重新检查
```

该命令只**验证** — 不自动修复。如果发现问题，会精确描述：哪个元素、什么行为、预期是什么。

**自动检查**：在 `/frame:build`、`/frame:fast`、`/frame:wave` 和 `/frame:debug` 中 — 如果任务涉及 UI 文件（`.tsx`、`.vue`、`.css`、`component`、`page`）— 浏览器检查会在 quality gates 后自动运行。

**需要 Playwright MCP** — 在 `npx the-frame init` 或 `npx the-frame update` 时，如果对前端项目问题回答"y"，会自动添加。

### 安全：发布前审计

```
/frame:daily
# → 简报显示："Security: ⚠️ never run" — 是时候解决了

/frame:security
# → 全项目扫描，覆盖所有类别：
#   - 密钥：AWS 密钥、GitHub 令牌、Stripe 密钥、私钥、git 中的 .env
#   - OWASP Top 10：SQL 注入、XSS、CSRF、路径遍历、SSRF、命令注入
#   - 基础设施：Dockerfile（root 用户、:latest）、调试端点
#   - AI/LLM：提示注入、不安全的输出处理、系统提示泄露
#   - 依赖项：通过 npm audit 检查已知 CVE

# → 报告保存至 .planning/reports/security/security-{date}.md
# → STATE.md 更新 Security Status

# 如果发现 CRITICAL 或 HIGH 问题：
# ⛔ Ship 已阻止。运行 /frame:security-fix 修复严重发现。

/frame:security-fix
# → 读取最新报告并按优先级修复发现：
#   先修复 CRITICAL，再修复 HIGH
#   - 从 git 跟踪中移除 .env（git rm --cached）
#   - 向 next.config.js / Express 添加缺失的 security headers
#   - 为 Route Handlers 添加 CSRF 保护
#   - 对有漏洞的依赖运行 npm audit fix
#   - 修复 Dockerfile：添加 USER 指令，替换 :latest
#   - 对已在历史记录中的密钥：说明如何轮换 + 重写历史
# → 应用后验证每个修复
# → 更新 STATE.md：所有 CRITICAL 解决后解除 ship 阻止

# 针对性修复：
/frame:security-fix critical     # 仅修复 CRITICAL
/frame:security-fix high         # 仅修复 HIGH
/frame:security-fix SEC-1        # 按 ID 修复特定发现

/frame:security
# → 重新运行审计确认一切正常

# 如果一切正常：
# ✓ 没有严重问题。可以安全继续 /frame:ship。

/frame:ship
# → 安全检查通过，提交并推送

# 当你知道要找什么时进行针对性扫描：
/frame:security secrets          # 仅扫描密钥（约 30 秒）
/frame:security src/api/         # 扫描特定目录
```

```
/frame:daily

/frame:performance
# → 获取基准：bundle 大小、加载时间、Lighthouse 分数
#   记住这些数字——最后需要用于比较

/frame:research "dashboard performance"
# → Claude 分析仪表板代码：重型组件，
#   冗余请求，什么可以缓存或懒加载

/frame:plan "dashboard optimization"
# → 带有影响估算的任务列表：
#   1. 懒加载重型图表
#   2. 缓存 API 请求
#   3. 删除挂载时的重复请求

/frame:build
# → 顺序执行，每个任务都有测试

/frame:performance
# → 与基准比较：查看实际改进

/frame:ship
```

## 内部包含什么

FRAME 提供：

- **6 阶段工作流**：研究 → 计划 → 构建 → 审查 → 发布 → 反思
- **35 个命令**：从快速任务到完整功能开发周期
- **6 个 AI 代理**：研究员、规划师、构建者、审查员、魔鬼代言人、安全审计员
- **安全钩子**：阻止破坏性操作，强制执行质量门控
- **Git 安全**：检查点、回滚、工作树、暂停/恢复
- **安全审计**：OWASP Top 10、密钥检测、基础设施检查、AI/LLM 风险

## 前提条件

- Node.js >= 18
- Git（项目必须是 git 仓库）

## 快速开始

```bash
# 如果需要，初始化 git 仓库
git init && git commit --allow-empty -m "init"

# 安装 FRAME
npx the-frame-ai init

# 在此项目中打开 Claude Code 并运行：
/frame:init    # 扫描代码库，填充 MAP.md
/frame:daily   # 每天的入口点
```

## 命令

### 核心——从这里开始

这 7 个命令覆盖了 90% 的独立开发工作：

| 命令 | 使用时机 |
|------|---------|
| `/frame:daily` | **从这里开始**，任何休息后——完成了什么，下一步是什么 |
| `/frame:research <主题>` | 在规划新功能之前 |
| `/frame:plan <功能>` | 将研究转化为可操作的任务列表 |
| `/frame:build` | 使用 TDD 实现 1–3 个任务（顺序） |
| `/frame:wave` | 实现 4+ 个独立任务（并行子代理） |
| `/frame:review` | 部署前——自动化检查 + 清单 |
| `/frame:ship` | 提交，可选推送/PR，更新记忆 |

### 按阶段的所有命令

<details>
<summary>研究</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:research <主题>` | 在规划新功能之前 |
| `/frame:explain <文件>` | 为什么这段代码看起来是这样的？ |
| `/frame:why <主题>` | 搜索决策历史 |
| `/frame:arch <模块>` | 将模块架构记录到 `docs/arch/{模块}.md` |
</details>

<details>
<summary>计划</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:plan <功能>` | 将研究转化为可操作的任务列表 |
| `/frame:add-task` | 在不中断工作的情况下向计划添加任务 |
</details>

<details>
<summary>构建</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:build` | 使用 TDD 实现计划（1–3 个任务，顺序） |
| `/frame:wave` | 以并行批次实现 4+ 个独立任务 |
| `/frame:fast <任务>` | 30 分钟内的快速任务 |
| `/frame:debug <问题>` | 系统性 bug 调查 |
| `/frame:forensics` | 深入研究为什么某些东西坏了 |
| `/frame:refactor` | 使用 TDD 安全网进行重构 |
| `/frame:migrate` | 带有回滚计划的 DB/API/依赖迁移 |
</details>

<details>
<summary>审查</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:review` | 部署前——自动化检查 + 清单 |
| `/frame:security` | 深度安全审计：密钥、OWASP、基础设施、AI/LLM 风险 |
| `/frame:security-fix` | 修复最新安全报告中的发现（先 CRITICAL，再 HIGH） |
| `/frame:health` | 完整项目健康检查 |
| `/frame:check-deps` | 安全审计 + 过时包 |
| `/frame:performance` | Bundle 大小和 Lighthouse 审计 |
</details>

<details>
<summary>发布</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:ship` | 提交，可选推送/PR，更新记忆 |
| `/frame:checkpoint` | 在风险变更前保存 git 标签 |
| `/frame:rollback` | 回滚到检查点 |
</details>

<details>
<summary>反思</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:retrospective` | 部署后——更新记忆和指标 |
| `/frame:sprint-check` | 每周进度与路线图对比 |
| `/frame:cleanup-memory` | 修剪和归档过时记忆 |
</details>

<details>
<summary>日常 & 工具</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:daily` | 一天开始——完成了什么，下一步是什么 |
| `/frame:status` | 完整状态转储（git、记忆、阻塞项） |
| `/frame:note` | 捕获模式、决策或反模式 |
| `/frame:unstuck` | 卡住了？获取 3 个具体的解锁选项 |
| `/frame:context` | 显示当前工作上下文 |
| `/frame:init` | 首次运行——扫描代码库，填充 MAP.md |
| `/frame:doctor` | 验证 FRAME 安装 |
| `/frame:pause` / `/frame:resume` | 保存和恢复任务中状态 |
</details>

<details>
<summary>高级</summary>

| 命令 | 使用时机 |
|------|---------|
| `/frame:worktree` | 用于并行实验的隔离 git 工作树 |
| `/frame:headless` | 自主 CI 模式（无交互） |
| `/frame:estimate <任务>` | 开始前的范围和时间估算 |
</details>

## 钩子

FRAME 在 `.claude/hooks/` 中安装 4 个钩子。它们自动运行。

| 钩子 | 触发器 | 功能 | 禁用方法 |
|------|--------|------|---------|
| `safety-net.sh` | Bash 之前 | 阻止 `rm -rf` 和 `DROP TABLE/DATABASE` | 从 `.claude/settings.local.json` 中删除 |
| `git-safety.sh` | Bash 之前 | 阻止强制推送、`reset --hard`，警告 `git add -A` | 从 `.claude/settings.local.json` 中删除 |
| `quality-gate.sh` | 文件写入后 | 对更改的文件运行类型检查 + lint | 从 `.claude/settings.local.json` 中删除 |
| `session-init.sh` | 会话开始 | 显示当前阶段/任务；离开 > 24h 时完整上下文转储 | 从 `.claude/settings.local.json` 中删除 |

## 配置

FRAME 通过 `.frame/config.json` 配置。关键设置：

```json
{
  "quality": {
    "commands": {
      "typecheck": "npx tsc --noEmit",
      "test": "npx vitest run",
      "lint": "npx eslint .",
      "build": "npm run build"
    }
  }
}
```

## CLI

```bash
npx the-frame-ai init [target-dir]     # 安装 FRAME
npx the-frame-ai update [target-dir]   # 更新命令、代理、钩子
npx the-frame-ai doctor [target-dir]   # 检查安装健康状况
npx the-frame-ai version               # 显示 CLI 版本
```

`update` 只更新命令、代理和钩子。项目文件（STATE.md、MAP.md、memory/ 等）永远不会被覆盖。

## 安装后的项目结构

```
.claude/
  commands/          # 35 个 FRAME 命令
  agents/            # 6 个 AI 代理
  hooks/             # 4 个安全钩子
.frame/
  config.json        # FRAME 配置
.planning/
  STATE.md           # 当前位置
  MAP.md             # 项目地图
  ROADMAP.md         # 路线图
  memory/            # 项目记忆
  specs/             # 功能规格
  reviews/           # 审查结果
  reports/           # 报告（日常、依赖、质量、冲刺、安全）
```

## 许可证

MIT
