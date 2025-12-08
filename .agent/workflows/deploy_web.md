---
description: WEBへのデプロイ（公開）手順および推奨フロー
---

# Webデプロイメント ワークフロー

「74min」のような静的サイト（HTML/CSS/JS）を公開するための、最も効率的でモダンな方法を2つ提案します。

## オプション 1: 手軽さ最優先 (Netlify Drop)
コマンドラインを使わず、ドラッグ＆ドロップだけで数秒で公開できます。

1.  ブラウザで [Netlify Drop](https://app.netlify.com/drop) にアクセスします。
2.  PC上の `cobalt-constellation` フォルダを、ブラウザの枠内にドラッグ＆ドロップします。
3.  数秒でランダムなURL（例: `modest-wing-xxxx.netlify.app`）が発行され、公開完了です。

---

## オプション 2: 推奨・継続的開発 (Vercel + GitHub)
プロフェッショナルな標準フローです。コードを更新してGitHubにプッシュするたびに、自動で本番環境が更新されます。

### 手順 1: ローカルでの準備 (このファイルで自動化可能)
1.  Gitリポジトリの初期化 (`git init`)
2.  全ファイルのコミット
3.  `.gitignore` の作成（不要なファイルを除外）

### 手順 2: GitHubへプッシュ
1.  [GitHub](https://github.com/new) で新しいリポジトリを作成（例: `74min-proto`）。
2.  画面に表示されるコマンドを使って、ローカルのコードをプッシュします。
    ```bash
    git remote add origin https://github.com/YOUR_USER/74min-proto.git
    git push -u origin main
    ```

### 手順 3: Vercelで連携
1.  [Vercel](https://vercel.com/new) にログイン。
2.  "Import Git Repository" から、先ほど作った `74min-proto` を選択。
3.  設定変更なしで "Deploy" をクリック。
    - **Framework Preset**: Other (または自動検出)
    - **Build Command**: 空欄 (今回の構成ではビルド不要)
    - **Output Directory**: 空欄 (ルートディレクトリが公開されるため)

// turbo
### 実行ステップ: Git初期化
以下のステップは、ローカル環境でGitリポジトリをセットアップするために使用できます。
```bash
git init
echo "node_modules/" > .gitignore
echo ".DS_Store" >> .gitignore
git add .
git commit -m "Initial commit of 74min prototype"
```
