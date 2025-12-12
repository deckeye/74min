---
description: Supabaseプロジェクトのセットアップと74minへの統合手順
---

# Supabase セットアップ & 統合ワークフロー

## ステップ 1: Supabaseプロジェクトの作成
1. [Supabase](https://supabase.com) にアクセスし、GitHubアカウントでログイン。
2. "New Project" をクリック。
3. プロジェクト情報を入力:
   - **Name**: `74min-backend`
   - **Database Password**: 強力なパスワードを生成（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)` を推奨
4. "Create new project" をクリック（約2分で完了）。

## ステップ 2: データベーススキーマの作成
Supabaseダッシュボードの "SQL Editor" で以下を実行:

```sql
-- Users table (Supabase Authと連携)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlists table
CREATE TABLE playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_duration INTEGER DEFAULT 0, -- seconds
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracks table
CREATE TABLE tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  service TEXT, -- 'YT', 'SC', 'AM', etc
  external_url TEXT,
  position INTEGER, -- Order in playlist
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policies (公開プレイリストは誰でも読める、編集は所有者のみ)
CREATE POLICY "Public playlists are viewable by everyone"
  ON playlists FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Tracks are viewable if playlist is public"
  ON tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = tracks.playlist_id
      AND playlists.is_public = true
    )
  );
```

## ステップ 3: クライアント統合
1. Supabase JavaScriptライブラリをCDN経由で読み込み（`index.html`）。
2. Supabase接続情報を取得（ダッシュボード > Settings > API）。
3. `js/supabase-client.js` を作成し、初期化コードを記述。

## ステップ 4: 認証の実装
Supabase Authを使用してGoogleログインなどを実装可能。

詳細は実装フェーズで追加します。
