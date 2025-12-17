# Issue: トラック一括削除機能の追加

## 概要
ユーザーがプレイリスト内の全トラックを一度に削除できる機能を追加する。現状、トラック数が多い場合に一つずつ削除するのは手間であるため。

## 現状
- 一括削除の手段がなく、手動で1つずつ削除する必要がある。

## 期待される動作
- トラックリスト上部に「Clear All」ボタンを配置する。
- ボタン押下時に確認ダイアログを表示する。
- 承認後、ローカルのトラックリストおよびSupabase上の関連データを全て削除する。
- プレイリストの合計時間をリセットする。

## 実装内容
- **UI**: index.html に `#clear-all-btn` を追加。
- **Logic**: js/app.js に `deleteAllTracks` 関数を追加。
  - `state.tracks` のクリア
  - `state.totalTime` のリセット
  - Supabase `tracks` テーブルからの `playlist_id` 一致レコード削除
  - Supabase `playlists` テーブルの `total_duration` 更新

## 結果
- 「Clear All」ボタンを実装し、正常に全件削除が行えることを確認済み。
