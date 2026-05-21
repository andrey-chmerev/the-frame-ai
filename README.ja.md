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
| 繰り返しのルーティンタスク | 完全な開発サイクルに対応した34の既製コマンド |
| 依存関係のある複雑な機能 | 独立したタスクのための並列サブエージェント |
| ソロ作業の構造不足 | Roadmap、STATE.md、MAP.md — 現在地と次のステップを常に把握 |

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
`/frame:build` がTDDでタスクを順次実行します（1〜3件ずつ）。多くの独立したタスクには — `/frame:wave` が並列バッチで実行します。行き詰まったら — `/frame:unstuck`。バグを発見したら — `/frame:debug`。

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

### 改善：ダッシュボードの読み込みを高速化する

```
/frame:daily

/frame:performance
# → ベースラインを取得：バンドルサイズ、読み込み時間、Lighthouseスコア
#   数値を記録 — 最後の比較に必要

/frame:research "dashboard performance"
# → Claudeがダッシュボードコードを分析：重いコンポーネント、
#   冗長なリクエスト、キャッシュまたは遅延読み込みできるもの

/frame:plan "dashboard optimization"
# → 影響見積もり付きのタスクリスト：
#   1. 重いチャートを遅延読み込み
#   2. APIリクエストをキャッシュ
#   3. マウント時の重複リクエストを削除

/frame:build
# → 順次実行、各タスクにテスト付き

/frame:performance
# → ベースラインと比較：実際の改善を確認

/frame:ship
```

## 内容

FRAMEが提供するもの：

- **6フェーズワークフロー**：調査 → 計画 → 構築 → レビュー → リリース → 振り返り
- **34コマンド**：クイックタスクから完全な機能開発サイクルまで
- **5つのAIエージェント**：リサーチャー、プランナー、ビルダー、レビュアー、悪魔の代弁者
- **セーフティフック**：破壊的操作をブロック、品質ゲートを強制
- **Git安全機能**：チェックポイント、ロールバック、ワークツリー、一時停止/再開

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
  commands/          # 34のFRAMEコマンド
  agents/            # 5つのAIエージェント
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
  reports/           # レポート（日次、deps、品質、スプリント）
```

## ライセンス

MIT
