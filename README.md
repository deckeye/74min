# 74min - Social Playlist Service 💿

74min（ナナヨン）へようこそ。
本サービスは、かつてのCD-R（最大録音時間74分）へのオマージュを込めた、プレイリスト作成・共有プラットフォームです。

![Concept](https://github.com/deckeye/74min/assets/concept.png)

## プロジェクト概要
- **コンセプト**: 74分の制限の中で「自分だけのベスト盤」を作る
- **デザイン**: Y2K / Glassmorphism / Cyberpunk
- **機能**:
  - ドラッグ＆ドロップでの直感的な編集
  - 各ストリーミングサービス（YouTube, Spotify等）の横断
  - Supabaseによるリアルタイム共有

## スタートガイド
本プロジェクトは外部ビルドツール（Webpack/Vite等）を必要としません。

1. **起動**: `index.html` をブラウザで開くだけ
2. **開発**: VS Code Live Server推奨

## ドキュメント
プロジェクトの詳細情報は `docs/` ディレクトリにあります。

- 📂 **[docs/context/](docs/context/)**: プロジェクトの経緯、計画書、過去ログ
- 📂 **[docs/database/](docs/database/)**: データベース設計、RLSポリシー
- 📄 **[Setup Guide](docs/context/migration_guide.md)**: 環境移行と構築手順

## ディレクトリ構成
```
74min/
├── .agent/       # AI Agent Workflows
├── css/          # Styles (Glassmorphism, Animations)
├── docs/         # Documentation
├── js/           # App Logic & Components
├── index.html    # Entry Point
└── README.md     # This file
```

## ライセンス
All rights reserved by Deckeye.
