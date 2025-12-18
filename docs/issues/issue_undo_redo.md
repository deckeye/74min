# Issue: Undo/Redo 機能の実装

## 概要
ユーザー操作（トラックの追加、削除、一括削除）の取り消し（Undo）およびやり直し（Redo）機能を実装する。

## 課題
- 操作ミスによるトラック紛失を防止したい。
- Supabase 連携時に物理削除を行うと、Undo で復元した際に ID が変わってしまい、データの整合性が保てない。

## 解決策
1.  **Command Pattern の採用**: 操作を `Command` オブジェクトとしてカプセル化し、Undo Stack / Redo Stack で管理する。
2.  **論理削除 (Soft Delete) の導入**: `is_deleted` フラグを使用し、物理削除を避けることで ID を維持。
3.  **マルチショートカット**: `Ctrl + Z` (Undo), `Ctrl + Y` / `Ctrl + Shift + Z` (Redo) をサポート。

## デザイン決定・合意事項
- **Redo ショートカット**: macOS や最新のクリエイティブツールの標準である `Ctrl + Shift + Z` と、Windows の伝統である `Ctrl + Y` の両方をサポートすることで、幅広いユーザーの直感に合わせる。
- **ID 維持の方針**: ID が変わることによるフロントエンドとバックエンドの同期コストを抑えるため、物理削除ではなく `is_deleted` カラムによる管理を行う。

## 実装履歴
- [x] CommandManager 基盤の実装
- [x] Add/Delete/ClearAll 操作の Command 化
- [x] 論理削除ロジックの統合
- [x] キーボードショートカットの判定修正 (Case-sensitivity 対応)

## 関連コミット
- `74e507c`: feat: Implement Undo/Redo functionality with Command Pattern and Soft Delete support
- `44200ba`: fix: Correct Ctrl+Shift+Z shortcut by handling case-sensitivity of e.key

## 備考
Supabase 側で `ALTER TABLE tracks ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;` の実行が必要。
