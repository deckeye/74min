---
description: WEBへのデプロイ（公開）手順および推奨フロー
---

# Webデプロイメント ワークフロー

「74min」のための推奨デプロイフローです。

## Q: Dockerなどの環境構築は必要ですか？
**A: いいえ、不要です。**
今回の「74min」は、サーバーサイドの処理（PythonやRubyなど）を持たない「静的サイト（Static Site）」として構築しました。
そのため、Dockerコンテナや複雑なサーバー管理は一切不要です。HTML/CSS/JSファイルを配信するだけで機能するため、**Vercel** や **Netlify** などのホスティングサービスが最も適しています。

---

## 推奨ワークフロー: Antigravity + GitHub + Vercel
Antigravity（私）を活用した、最も効率的な開発サイクルは以下のとおりです。

### 1. 開発 & 修正 (with Antigravity)
- ユーザー：「曲の追加ボタンを大きくして」
- Antigravity：コードを修正し、プレビューで確認。
- Antigravity：修正内容をローカルのGitにコミット。
  ```bash
  git add .
  git commit -m "ボタンのデザイン修正"
  ```

### 2. GitHubへプッシュ Code
- ユーザー（またはAntigravity）：以下のコマンドでGitHubへ送信。
  ```bash
  git push origin main
  ```

### 3. 自動デプロイ (Vercel)
- GitHubへの変更を検知して、Vercelが自動的に新しいバージョンを公開します。
- 数十秒後には、`https://74min-app.vercel.app` のようなURLで世界中に反映されます。

---

## 導入手順（初回のみ）

### 手順 1: GitHubリポジトリの準備
1.  [GitHub](https://github.com/new) で新しいリポジトリを作成（例: `74min-proto`）。
2.  表示されるURLをコピー。
3.  ターミナルで以下を実行し、現在のコードをアップロードします。
    ```bash
    git remote add origin https://github.com/YOUR_USER/74min-proto.git
    git push -u origin main
    ```

### 手順 2: Vercelで連携
1.  [Vercel](https://vercel.com/new) にログイン。
2.  "Import Git Repository" から `74min-proto` を選択。
3.  設定はすべてデフォルトのままで "Deploy" をクリック。

これだけで、以後は「修正 → プッシュ」だけで自動更新される環境が整います。
