---
description: 74minプロジェクトにおけるAIエージェントの標準動作フロー (強化版・ブランチ運用徹底)
---

# AIエージェント標準ワークフロー (AI Agent Standard Flow)

> [!CAUTION]
> **AIエージェントへの絶対命令 (再強化)**:
> 1. **Issue First**: GitHub Issue および `docs/issues/` ドキュメントがない状態でのコード修正は**厳禁**です。
> 2. **Feature Branch Only**: `main` ブランチへの直接コミットは**禁止**です。必ず `feat/` や `fix/` ブランチを切って作業し、完了後にマージしてください。
> 3. **Dual Recording**: GitHub とローカルの両方への記録は必須です。
> 4. **Always Japanese**: 全ての会話、コミットメッセージ、Issue、ドキュメント生成は**常に日本語**で行ってください。英語での応答やファイル生成は原則禁止です。

## 1. 準備フェーズ (Preparation)
- [ ] **Issueのデュアル作成**: 
    - 作業開始前に GitHub CLI (`gh`) を使用して GitHub 上に Issue を作成し、番号（#XX）を取得する。
    - 同時に `docs/issues/issue_xxx.md` を作成し、Git にコミットする。
- [ ] **ブランチの作成**: 
    - `git checkout -b feat/issue-#XX-description` のように、Issue番号を含んだブランチを作成する。

## 2. 実装フェーズ (Implementation)
- [ ] **実装プランの作成**: 
    - `implementation_plan.md` を作成。日本語で記述し、ユーザーの承認を得るまではコードの実装を開始しない。
- [ ] **設計判断の逐次記録**: 
    - 重要な決定（ラベル名、DB構成、技術選定など）を行った瞬間、即座に GitHub Issue のコメントにその理由を投稿する。
- [ ] **Issue番号付きコミット**: 
    - すべてのコミットメッセージに `#Issue番号` を含める。

## 3. 完了フェーズ (Completion) - 【完了報告前の必須チェック】
- [ ] **マージとクリーンアップ**:
    - 実装完了後、`main` ブランチへマージし、作業ブランチを削除する。
    - **【Alpha版附則】**: 現在はα版のため、ブランチ作成・コミット後、速やかに `main` へマージする運用で問題ありません（PRの長期間保持は不要）。
- [ ] **最終セルフ監査 (必須コマンド実行)**:
    - 報告の直前に以下のコマンドを実行し、不整合がないか目視で確認すること。
    - `git branch` (mainにいるか確認)
    - `gh issue list --state open` (GitHub上のIssueの存在確認)
    - `ls docs/issues/` (ローカルファイルの存在確認)
    - `git log -n 5` (コミットメッセージにIssue番号が含まれているか確認)
- [ ] **デュアル報告とデプロイURL提示**:
    - ユーザーへの最終報告には、必ず **GitHub Issueへのリンク** と **ローカルファイルへのリンク** の両方を含めること。
    - また、**本番環境のデプロイURL (https://74min.vercel.app)** を明記し、ユーザーが即座に確認できるようにすること。

// turbo-all
