# Issue #1: Connect Serviceボタンが画面外に押し出される

## 問題の説明
プレイリスト編集パネルで「Connect Service (+)」ボタンを繰り返し押してトラックを追加すると、トラックリストが縦に伸び続け、最終的にボタンが画面外（パネルの下部の外）に押し出されて操作できなくなる。

## 再現手順
1. アプリケーションを起動する
2. 「Connect Service (+)」ボタンを10回以上連続でクリックする
3. トラックリストが `.editor-panel` の高さを超える
4. ボタンが画面外に消えて押せなくなる

## 期待される動作
- トラックリストは一定の高さに固定され、内容が多い場合はスクロール可能にする
- 「Connect Service (+)」ボタンは常にパネル内の下部に固定され、スクロールに関わらず表示される

## 技術的な原因
現在の `.track-list` CSSは `flex: 1` と `overflow-y: auto` が設定されているが、トラックが増えた時に親要素 (`.editor-panel`) の高さを超えて伸びてしまう。`.add-track-area` が `margin-top: auto` で配置されているため、トラックリストの拡張に押し出される。

## 修正方針
1. `.track-list` に明示的な `min-height: 0` を追加（flexboxのデフォルト挙動対策）
2. または `.editor-panel` の高さ制約を強化
3. 動作確認後、main branchへマージ

## ラベル
- `bug`
- `ui/ux`
- `priority: high`

---
作成者: Antigravity  
関連ブランチ: `fix/track-list-overflow`
