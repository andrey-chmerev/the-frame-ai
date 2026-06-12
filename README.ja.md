# THE Frame

FRAME — AI支援ソロ開発のためのフレームワーク

[🇺🇸 English](README.md) | [🇨🇳 中文](README.zh.md) | [🇮🇳 हिंदी](README.hi.md) | [🇯🇵 日本語](README.ja.md) | [🇩🇪 Deutsch](README.de.md) | [🇪🇸 Español](README.es.md) | [🇷🇺 Русский](README.ru.md)

## FRAMEとは？

**FRAME（Framework for AI-Assisted Solo Development）** は、Claude Codeでプロダクトを構築するソロ開発者のためのフレームワークです。混沌としたAI支援開発を、メモリ・構造・ミス防止機能を備えた予測可能なプロセスへと変えます — アイデアからデプロイまで。

Claude Codeで一人でプロダクトを作っていて、チームのように働きたいなら — FRAMEはあなたのためにあります。

## FRAMEが解決する問題

| 問題 | FRAMEが提供するもの |
|------|-------------------|
| セッション間でコンテキストを失う | プロジェクトメモリとセッション開始時の自動状態ダンプ |
| タスクと優先順位の混乱 | 6フェーズワークフロー：調査 → 計画 → 構築 → レビュー → リリース → 振り返り |
| 重要なものを壊す恐れ | セーフティフックが破壊的コマンドを実行前にブロック |
| 繰り返しのルーティンタスク | 完全な開発サイクルに対応した35の既製コマンド |
| 依存関係のある複雑な機能 | 独立したタスクのための並列サブエージェント |
| ソロ作業の構造不足 | Roadmap、STATE.md、MAP.md — 現在地と次のステップを常に把握 |
| デプロイ時のセキュリティ脆弱性 | セキュリティエージェントがOWASP Top 10、シークレット、インフラ、AIリスクを監査 |

## FRAMEの使い方

```
調査 → 計画 → 構築 → レビュー → リリース → 振り返り
```

各セッションは1サイクルです。`/frame:daily` で始め、`/frame:ship` で終わります。

**調査** — 作る前に理解する
`/frame:research <トピック>` を実行 — Claudeがコードベースと外部ソースを探索し、次のステップのためのコンテキストを構築します。

**計画** — タスクに分解する
`/frame:plan <機能>` が調査を見積もり付きの具体的なタスクリストに変換します。

**構築** — 実装する
`/frame:build` がTDDでタスクを順次実行します（1〜3件ずつ）。多くの独立したタスクには — `/frame:wave` が並列バッチで実行します。品質がスピードより重要な場合 — `/frame:wave-team` が各タスク後にレビューチーム（Security、Performance、Tests、Conventions）を追加します。行き詰まったら — `/frame:unstuck`。バグを発見したら — `/frame:debug`。

**レビュー** — デプロイ前に確認する
`/frame:review` が自動チェックを実行し、チェックリストを提供します：テスト、型、セキュリティ、パフォーマンス。

**リリース** — デプロイして記録する
`/frame:ship` がコミット、オプションのプッシュ/PR、プロジェクトメモリの更新を行います。

**振り返り** — 学んで改善する
デプロイ後に `/frame:retrospective` でメトリクスを更新し、将来のセッションのためのパターンを記録します。

## 使用例

### 新機能：Google認証を追加する

```
/frame:daily
# → 現在のプロジェクト状態と計画内容を確認

/frame:research "Google OAuth"
# → Claudeがコードベースを調査：現在のauthの仕組み、
#   すでに使われているパターン、追加が必要なもの

/frame:plan "Google OAuth"
# → 具体的なタスクリストを取得：
#   1. Google OAuthクレデンシャルを設定
#   2. コールバックルートを追加
#   3. セッションに接続
#   4. UIにボタンを追加

/frame:checkpoint
# → 復元ポイントを保存 — 何か問題が起きたらロールバック可能

/frame:wave
# → タスク1〜4は独立しているため、Claudeが並列で実行

/frame:review
# → 自動チェック：テスト、型、セキュリティ

/frame:ship
# → コミット、オプションのプッシュ/PR、プロジェクトメモリ更新
```

### バグ：パスワードリセット後にユーザーがログインできない

```
/frame:daily
# → コンテキストを復元し、バグが既に計画にあるか確認または追加

/frame:debug "login after reset"
# → Claudeが体系的に確認：ログ、リセットフロー、セッション、トークン
# → コード内の具体的な場所を示す仮説を取得

# 原因がすぐに判明した場合：
/frame:checkpoint                        # 修正前の復元ポイント
/frame:fast "fix: invalidate old session after password reset"
# → Claudeがピンポイントの修正を行い、リグレッションテストを書く

# 原因が不明な場合 — 深く掘り下げる：
/frame:forensics
# → この領域の変更のgit履歴を分析し、
#   動作を壊したコミットを特定

/frame:checkpoint
/frame:fast "fix: ..."                   # 特定した原因を修正

/frame:review
# → 修正が他のログインシナリオを壊していないことを確認

/frame:ship
```

### UI検証：インターフェースが動作することを確認する

```
/frame:build
# → Claudeがタスクを実装し、「完了」と言う

/frame:verify-ui
# → Playwright MCPを通じてブラウザを開き、スクリーンショットを撮る
# → タスクの説明と比較する
# → PASS：インターフェースが期待通り
# → FAIL：何が問題でどこを見ればいいか正確に説明

# 何か問題がある場合：
/frame:fast "fix: モバイルでボタンが表示されない"
/frame:verify-ui
# → 修正後に再確認
```

このコマンドは**確認のみ** — 自動修正はしません。問題が見つかった場合、正確に説明します：どの要素、どの動作、何が期待されていたか。

**自動チェック**：`/frame:build`、`/frame:fast`、`/frame:wave`、`/frame:debug` で — タスクがUIファイル（`.tsx`、`.vue`、`.css`、`component`、`page`）に触れる場合 — ブラウザチェックがquality gatesの後に自動的に実行されます。

**Playwright MCPが必要** — `npx the-frame-ai init` または `npx the-frame-ai update` 時にフロントエンドプロジェクトの質問に"y"と答えると自動的に追加されます。

### セキュリティ：リリース前の監査

```
/frame:daily
# → ブリーフィングに表示："Security: ⚠️ never run" — 対処する時です

/frame:security
# → 全カテゴリにわたるプロジェクト全体のスキャン：
#   - シークレット：AWSキー、GitHubトークン、Stripeキー、秘密鍵、gitの.env
#   - OWASP Top 10：SQLインジェクション、XSS、CSRF、パストラバーサル、SSRF、コマンドインジェクション
#   - インフラ：Dockerfile（rootユーザー、:latest）、デバッグエンドポイント
#   - AI/LLM：プロンプトインジェクション、安全でない出力処理、システムプロンプト漏洩
#   - 依存関係：npm auditによる既知のCVE

# → レポートは .planning/reports/security/security-{date}.md に保存
# → STATE.md が Security Status で更新

# CRITICAL または HIGH な発見がある場合：
# ⛔ Ship がブロックされました。/frame:security-fix を実行して修正してください。

/frame:security-fix
# → 最新レポートを読み込み、優先度順に発見を修正：
#   CRITICAL を先に、次に HIGH
#   - .env を git トラッキングから削除（git rm --cached）
#   - next.config.js / Express に不足している security headers を追加
#   - Route Handlers に CSRF 保護を追加
#   - 脆弱な依存関係に npm audit fix を実行
#   - Dockerfile を修正：USER ディレクティブを追加、:latest を置換
#   - 既に履歴にあるシークレット：ローテーションと履歴書き換えの手順を説明
# → 各修正を適用後に検証
# → STATE.md を更新：全 CRITICAL 解決後に ship をアンブロック

# ターゲット修正：
/frame:security-fix critical     # CRITICAL のみ修正
/frame:security-fix high         # HIGH のみ修正
/frame:security-fix SEC-1        # ID で特定の発見を修正

/frame:security
# → 全てクリーンであることを確認するために監査を再実行

# クリーンな場合：
# ✓ 重大な問題なし。/frame:ship で安全に進められます。

/frame:ship
# → セキュリティチェック通過、コミットとプッシュ

# 何を探すか分かっている場合のターゲットスキャン：
/frame:security secrets          # シークレットのみ（約30秒）
/frame:security src/api/         # 特定ディレクトリをスキャン
```

```
/frame:daily

/frame:perf-audit
# → スタックを検出（Next.js + PostgreSQL + Redis など）
# → そのスタック固有の現在の既知問題を調査
# → 深層スキャン：N+1クエリ、メモリリーク、ブロッキング操作、
#   キャッシュヘッダーの欠如、再レンダリングの原因、バンドルサイズ
# → レポートを .planning/reports/performance/PERF_REPORT.md に保存
#   Critical/High/Medium/Low の優先度と工数見積もり付き

# 出力例：
# Critical: 2 | High: 4 | Medium: 3 | Low: 1
# [PERF-1] /api/users の N+1クエリ — リクエストごとに47回の余分なDBクエリ (S)
# [PERF-2] Dashboard の setInterval にクリーンアップなし — メモリリーク (XS)

/frame:perf-fix
# → PERF_REPORT.md を読み、Critical から開始
# → 各問題について表示：
#   --- BEFORE ---
#   const users = await db.findMany()
#   --- AFTER ---
#   const users = await db.findMany({ select: { id, name, email } })
# → 確認：Apply this fix? [y/n/skip]
# → 適用、typecheck + テスト実行、失敗時はリバート

# 特定の修正：
/frame:perf-fix PERF-1      # 1つの問題を修正
/frame:perf-fix high        # すべての High を修正
/frame:perf-fix all         # Critical + High を修正

/frame:perf-audit
# → 改善を確認するために再実行
```

## 内容

FRAMEが提供するもの：

- **6フェーズワークフロー**：調査 → 計画 → 構築 → レビュー → リリース → 振り返り
- **37コマンド**：クイックタスクから完全な機能開発サイクルまで
- **7つのAIエージェント**：リサーチャー、プランナー、ビルダー、レビュアー、悪魔の代弁者、セキュリティ、パフォーマンス監査
- **セーフティフック**：破壊的操作をブロック、品質ゲートを強制
- **Git安全機能**：チェックポイント、ロールバック、ワークツリー、一時停止/再開
- **セキュリティ監査**：OWASP Top 10、シークレット検出、インフラチェック、AI/LLMリスク

## 前提条件

- Node.js >= 18
- Git（プロジェクトはgitリポジトリである必要があります）

## クイックスタート

```bash
# 必要に応じてgitリポジトリを初期化
git init && git commit --allow-empty -m "init"

# FRAMEをインストール
npx the-frame-ai init

# このプロジェクトでClaude Codeを開いて実行：
/frame:init    # コードベースをスキャンし、MAP.mdを埋める
/frame:daily   # 毎日のエントリーポイント
```

## コマンド

### コア — ここから始める

この7つのコマンドがソロ開発作業の90%をカバーします：

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:daily` | 休憩後は**ここから始める** — 何が完了し、次は何か |
| `/frame:research <トピック>` | 新機能の計画前 |
| `/frame:plan <機能>` | 調査を実行可能なタスクリストに変換 |
| `/frame:build` | TDDで1〜3タスクを実装（順次） |
| `/frame:wave` | 4つ以上の独立したタスクを実装（並列サブエージェント） |
| `/frame:wave-team` | waveと同様だが、各タスク後にレビューチームを追加 |
| `/frame:review` | デプロイ前 — 自動チェック + チェックリスト |
| `/frame:ship` | コミット、オプションのプッシュ/PR、メモリ更新 |

### フェーズ別全コマンド

<details>
<summary>調査</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:research <トピック>` | 新機能の計画前 |
| `/frame:explain <ファイル>` | このコードがこうなっている理由は？ |
| `/frame:why <トピック>` | 意思決定の履歴を検索 |
| `/frame:arch <モジュール>` | モジュールのアーキテクチャを `docs/arch/{モジュール}.md` に記録 |
</details>

<details>
<summary>計画</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:plan <機能>` | 調査を実行可能なタスクリストに変換 |
| `/frame:add-task` | 作業を中断せずに計画にタスクを追加 |
</details>

<details>
<summary>構築</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:build` | TDDで計画を実装（1〜3タスク、順次） |
| `/frame:wave` | 4つ以上の独立したタスクを並列バッチで実装 |
| `/frame:wave-team` | waveと同様だが、各タスク後にレビューチームを追加 |
| `/frame:fast <タスク>` | 30分以内のクイックタスク |
| `/frame:debug <問題>` | 体系的なバグ調査 |
| `/frame:forensics` | 何かが壊れた原因の深掘り |
| `/frame:refactor` | TDDセーフティネットでリファクタリング |
| `/frame:migrate` | ロールバック計画付きのDB/API/deps移行 |
</details>

<details>
<summary>レビュー</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:review` | デプロイ前 — 自動チェック + チェックリスト |
| `/frame:security` | 深度セキュリティ監査：シークレット、OWASP、インフラ、AI/LLMリスク |
| `/frame:security-fix` | 最新セキュリティレポートの発見を修正（CRITICAL 優先、次に HIGH） |
| `/frame:perf-audit` | 深層パフォーマンス監査：スタック検出、現在の問題を調査、PERF_REPORT.md を作成 |
| `/frame:perf-fix` | PERF_REPORT.md の問題を修正 — Before/After を表示、修正ごとに確認 |
| `/frame:health` | プロジェクト全体のヘルスチェック |
| `/frame:check-deps` | セキュリティ監査 + 古いパッケージ |
| `/frame:performance` | バンドルサイズとLighthouse監査 |
</details>

<details>
<summary>リリース</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:ship` | コミット、オプションのプッシュ/PR、メモリ更新 |
| `/frame:checkpoint` | リスクのある変更前にgitタグを保存 |
| `/frame:rollback` | チェックポイントにロールバック |
</details>

<details>
<summary>振り返り</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:retrospective` | デプロイ後 — メモリとメトリクスを更新 |
| `/frame:sprint-check` | ロードマップに対する週次進捗 |
| `/frame:cleanup-memory` | 古いメモリのトリムとアーカイブ |
</details>

<details>
<summary>日常 & ユーティリティ</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:daily` | 1日の始まり — 何が完了し、次は何か |
| `/frame:status` | 完全な状態ダンプ（git、メモリ、ブロッカー） |
| `/frame:note` | パターン、決定、またはアンチパターンを記録 |
| `/frame:unstuck` | 行き詰まった？ブロックを解除する3つの具体的な選択肢を取得 |
| `/frame:context` | 現在の作業コンテキストを表示 |
| `/frame:init` | 初回実行 — コードベースをスキャン、MAP.mdを埋める |
| `/frame:doctor` | FRAMEのインストールを確認 |
| `/frame:pause` / `/frame:resume` | タスク途中の状態を保存・復元 |
</details>

<details>
<summary>上級</summary>

| コマンド | 使用タイミング |
|---------|-------------|
| `/frame:worktree` | 並列実験のための隔離されたgitワークツリー |
| `/frame:headless` | 自律CIモード（インタラクションなし） |
| `/frame:estimate <タスク>` | 開始前のスコープと時間見積もり |
</details>

## フック

FRAMEは `.claude/hooks/` に4つのフックをインストールします。自動的に実行されます。

| フック | トリガー | 機能 | 無効化方法 |
|-------|---------|------|----------|
| `safety-net.sh` | Bash実行前 | `rm -rf` と `DROP TABLE/DATABASE` をブロック | `.claude/settings.local.json` から削除 |
| `git-safety.sh` | Bash実行前 | フォースプッシュ、`reset --hard` をブロック、`git add -A` に警告 | `.claude/settings.local.json` から削除 |
| `quality-gate.sh` | ファイル書き込み後 | 変更されたファイルにtypecheck + lintを実行 | `.claude/settings.local.json` から削除 |
| `session-init.sh` | セッション開始 | 現在のフェーズ/タスクを表示；24時間以上離れていた場合は完全なコンテキストダンプ | `.claude/settings.local.json` から削除 |

## 設定

FRAMEは `.frame/config.json` で設定します。主要な設定：

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
npx the-frame-ai init [target-dir]     # FRAMEをインストール
npx the-frame-ai update [target-dir]   # コマンド、エージェント、フックを更新
npx the-frame-ai doctor [target-dir]   # インストールの健全性を確認
npx the-frame-ai version               # CLIバージョンを表示
```

`update` はコマンド、エージェント、フックのみを更新します。プロジェクトファイル（STATE.md、MAP.md、memory/ など）は上書きされません。

## インストール後のプロジェクト構造

```
.claude/
  commands/          # 35のFRAMEコマンド
  agents/            # 6つのAIエージェント
  hooks/             # 4つのセーフティフック
.frame/
  config.json        # FRAME設定
.planning/
  STATE.md           # 現在の位置
  MAP.md             # プロジェクトマップ
  ROADMAP.md         # ロードマップ
  memory/            # プロジェクトメモリ
  specs/             # 機能仕様
  reviews/           # レビュー結果
  reports/           # レポート（日次、deps、品質、スプリント、セキュリティ）
```

## ライセンス

MIT
