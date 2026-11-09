# MORPHOSPACE 共有サムネイルのXServer内保存

## 構成

- 正規リポジトリ: furuinu/morphospace の main
- 本体: https://morphospace.masalakitchen.jp/
- 共有API: https://morphospace.masalakitchen.jp/share/index.php
- 共有画像: https://morphospace.masalakitchen.jp/share/index.php?image=<ID>
- 共有リンク: https://morphospace.masalakitchen.jp/share/index.php?id=<ID>
- 画像とDNAの実ファイル保存先: /home/hakatamasala/morphospace-share-data/ （public_html外）
  - images/<ID>.jpg : JPEG画像
  - records/<ID>.json : DNA、個体名、生態説明、保存日時
  - pending/ : 15分有効の登録チケット
  - rates/ : アップロード制限

登録済み画像は自動削除しない。既存の外部共有サービスにある画像の自動移行は行わない。
JPEG200KB/枚、登録上限5000枚。容量管理やバックアップはサーバー管理者が行う。

## 一度だけ必要なXServer設置

正規GitHubへのコミットだけでは、サーバーに既に設置されたcronスクリプト自体は更新されない。

1. XServerのファイルマネージャーで既存の /home/hakatamasala/morphospace-deploy/xserver-pull.sh の実際の設置先を確認する。
2. 正規リポジトリの最新 deploy/xserver-pull.sh に上書きする。別の場所に置いただけでは既存cronに反映されない。
3. 既存のcronを一度実行する。更新版は成功したPagesコミットから index.html、about-i18n.js、share/index.php を自動配置する。
4. PHPのファイル書き込み権限を確認する。書き込めないときはMORPHOSPACE_SHARE_STORAGE環境変数で公開ディレクトリ外の保存先を指定する。
5. https://morphospace.masalakitchen.jp/share/index.php?api=health が ready:true と返すことを確認する。
6. 本サイトでshareしてURLが /share/index.php?id=... となり、SNSプレビューと3D復元が正しく動くか確認する。

XServer本体からshareしたサムネイルだけが本サーバー内に保存される。
GitHub Pagesの静的版からshareした場合は従来の外部共有サービスを継続する。
本サーバーへの登録に失敗した場合、通常のDNAリンクを共有できるが、共有画像が本サーバーに保存されたとは表示しない。

## 画像保存と公開の安全対策

- JPEGのみ。最大200KB、画像サイズ2048px以下、SHA-256で照合
- 登録チケット15分有効、SHA-256 Proof-of-Work、二重登録防止
- 同じIPからの発行上限は30件/時、100件/日
- 同一オリジン制限と専用アップロードヘッダー
- 公開ディレクトリの外に画像とDNAを置き、PHPで配信
- ユーザー入力をパスに使わず、ランダムIDで保存
- 共有ページはHTMLエスケープ・CSPで保護
- 古い未使用チケットのみ清掃、公開画像は自動削除しない

## 検証

PHP構文確認: php -l share/index.php
動作テスト: node --test tests/share-server.test.cjs
GitHub ActionsでもWebGL、既存テスト、PHP構文確認を実行する。

本番サーバーでのPHP実行・書き込み可否と実際のSNSプレビューは、
XServerのcronを一度更新・実行してから確認する。
