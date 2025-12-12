-- 開発用：匿名ユーザーでもプレイリストとトラックを作成できるようにする
-- 本番環境では認証を実装してから、厳密なポリシーに戻してください

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can insert their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;

-- 開発用の緩いポリシーを追加（誰でも挿入・更新可能）
CREATE POLICY "Anyone can insert playlists (DEV ONLY)"
  ON playlists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update playlists (DEV ONLY)"
  ON playlists FOR UPDATE
  USING (true);

-- トラックテーブルにも同様のポリシーを追加
CREATE POLICY "Anyone can insert tracks (DEV ONLY)"
  ON tracks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tracks (DEV ONLY)"
  ON tracks FOR UPDATE
  USING (true);
