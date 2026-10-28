# MORPHOSPACE 音声スタイル拡張 — 音楽・生物音響資料に基づく仕様

> **実験アーカイブ（2026-10-28）**：本番はオリジナルの生体発声のみに戻した。以下は将来の検討用に残す実験仕様であり、**現行UI・本番機能の説明ではない**。実装は `experimental/voice-styles.js` に隔離し、`index.html` から読み込まない。将来外部JSとして復活させる場合は、サーバーのファイル配信手順と初期化・切替コードを別途整備する。

更新: 2026-10-28 / 最終実験版: v15.19.5（本番無効化: v15.20.0） / 対象: `furuinu/morphospace` の `main`

## 目的と基本原則

形状・動き・発光・表皮の時間変化を音のイベント・高さ・強さ・音色に結び付ける既存の発声を維持しつつ、音楽文法の異なる5種類を選ぶ。実在の宗教音楽、海洋生物の鳴き声を再現したものとしては扱わない。既存の声部合成グラフを再利用し、外部音源・著作物のサンプルは追加しない。

各モードは、同一個体の seed / DNA と視覚運動から決定論的に生成する。すべての音声を既存のリミッタ、音量制御、録画時の MediaStreamDestination 経路に通す。

## 音声設定 UI

鑑賞設定 > 活動音 > 発声スタイル（`#viewerVoiceStyle`）。選択肢は次の5種。

| ID | 表示 | 音声モデル |
| --- | --- | --- |
| `original` | オリジナル — 生体発声 | 既存の声・発光・体表波動の合成（無変更で保持） |
| `gregorian` | グレゴリアン — 深い聖歌 | 低域、単旋律の斉唱、可変音価、旋法、長い残響 |
| `cetacean` | 鯨歌 — イルカとクジラ | 低域の長い歌と可聴域へ移した高いFMホイッスルの呼応 |
| `hymn` | ヒム — 讃美歌風の合唱 | 低→高の4声部、協和的な和音進行、揃った音節と息継ぎ |
| `sutra` | 読経 — 低い声明風の斉唱 | 狭い音域、ほぼ同じ音高、反復音節、句のまとまり |

初期値は `original`。変更はライブ再生中にも反映。選択は `localStorage['morphospace-voice-style-v1']` に保持し、アクセス不可時はページ内でのみ維持。活動音ON/OFF、既存音量スライダーを全モードに共通適用する。音量を急変させず AudioParam の補間で移行する。

## 研究上の区別と音響パラメータ

### 1. Gregorian — Gregorian chant と現代的な「低声合唱」の峻別

グレゴリオ聖歌／プレインチャントの核心は**単旋律**、斉唱、モード、定量拍節に依存しないフレーズ。四声和声の教会合唱とは区別する。

- 実装: 個体固有の低い主旋律を複数の声部が共有。各声部は数セントの差で厚みを出すが、三和音の独立進行は付けない。
- 種別に応じた2つの旋法的音集合 `[0,2,3,5,7,9,10]` と `[0,1,3,5,7,8,10]`。これは史実の8教会旋法の完全モデルではない。
- 1句は約10–13秒、単位の長さを不均等にして休符を残す。基本音高はおおむね C3 周辺。残響比率を高め、輪郭を柔らかくする。
- 注意: 声の残響は教会的空間の**演出**であり、実測インパルス応答を用いた教会再現ではない。

典拠:
- Hill Museum & Manuscript Library, *Plainchant*（Grove Music Online・Oxford Dictionary of Music を参照）https://hmmlschool.org/lexicon/146022/

### 2. Cetacean — イルカとクジラを混同しない

研究ではバンドウイルカの signature whistle が個体固有の**周波数変調輪郭**を持ち、ザトウクジラの歌は unit → phrase → theme の階層的な反復構造を持つ。両者は同一の「水中リバーブ付き声」では表現できない。

- クジラ由来の側: 約95–151 Hz の中心音からゆっくり上下する長音（実際のザトウクジラの原音そのものではない）、8–11秒程度の呼吸する単位。低声／応答声に独立したフレーズ位相。
- イルカ由来の側: 繰り返すFM輪郭。1音ごとに毎フレーム乱数を引かず、seedと位相で固定した特徴的カーブを再生。発生器は正弦波寄りに切り替える。
- 可聴化: イルカの高周波・超音波成分は iPhone スピーカーや通常サンプルレートで正しく提示できないため、670–2600 Hz の聴取しやすい帯域へ**芸術的に移調**。種の聴覚・実在の識別信号を再現したとは表示しない。
- 発光の強度が応答声の音量に作用し、身体のうねりが長音の音高・強度の変化に作用。
- 共鳴とエコーは残響経路で演出するが、危険な高周波・クリックトレインによる聴覚刺激は追加しない。

典拠:
- Janik & Sayigh (2013), *Communication in bottlenose dolphins: 50 years of signature whistle research*, DOI 10.1007/s00359-013-0817-7 https://pubmed.ncbi.nlm.nih.gov/23649908/
- *The Sarasota Dolphin Whistle Database* (2022), DOI 10.3389/fmars.2022.923046 https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.923046/full
- NOAA, *Unraveling Mysteries of Humpback Whale Song* https://sanctuaries.noaa.gov/news/sep22/mysteries-of-humpback-whale-song.html
- NOAA, *Vocalizations Associated with Reproduction* https://dosits.org/animals/use-of-sound/marine-mammal-communication/vocalizations-associated-with-reproduction/

### 3. Hymn — 讃美歌の調性と声部進行

- 4パートの斉時的な和声音形: bass / tenor / alto / soprano に近似。2つの追加発光声は無音化し、むやみに6声化しない。
- 和音進行の中心は I–IV–V–I の親和的な三和音。長三度または短三度、完全五度を用い、音程の衝突を回避する。
- 約4.5秒単位の和音移行、2つの音節を同期させる。発光は強調に使い、無関係なピン音にしない。
- 声部進行は滑らかさ優先。ただし厳密な教会四声体の禁則を完全に検査するアルゴリズムではない。

典拠:
- Open Music Theory, *Chords in SATB style* https://viva.pressbooks.pub/openmusictheory/chapter/chords-in-satb-style/
- Berklee, *Voice Leading Paradigms for Harmony in Music Composition* https://online.berklee.edu/takenote/voice-leading-paradigms-for-harmony-in-music-composition/

### 4. Sutra — 読経と声明の区別

- 伝統的な**声明（shōmyō）**は装飾的で複雑な旋律を持つ例がある。今回の主たる参照は、比較的一定のテンポで単一音高に寄る**読経（dokkyō）**。
- 1音節の間隔は約0.66–0.88秒。12音節の単位で句を構成し、間に息の切れ目を置く。
- 基音は C3より低い男声域付近、中心音から -2〜+1 半音程度の抑制された変化。同一音高を小さくずらして複数の低い声を重ねる。
- 実在の経文、宗派固有の節回し、木魚の音色は合成しない。「読経風」の音響文法に留める。

典拠:
- Slottow, *The Americanization of Zen Chanting*, Chapter 3, *Performance Practice* https://www.cambridge.org/core/books/abs/americanization-of-zen-chanting/performance-practice/C16598CA8C9F8DAF492415142A0F897E

## v15.19.5 — 聴感音量の均一化と「ブザーではない声」

### 修正の背景（2026-10-28 の聴感報告）

- 原音より追加プリセットの主観的音量・音圧が高い。同じ音量スライダーでも聴こえる大きさに差が出る。
- Gregorian / sutra では、フォルマントを通さない sawtooth の **直結パス**（`exciter → directTone → voice.out`）と高域のバイパスが、低音の連続した「ブーー」という音を増幅していた。
- `state.master` の固定ゲインが原音とほぼ同じ（旧値 original .95 / Gregorian .94 / hymn .88 / sutra .91 / cetacean .77）で、追加の直結ソースによる電力増加を補償していなかった。コンプレッサーは音量統一装置ではない。

### 音声合成の根拠と修正

人の有声音は喉頭を起点とするグロッタル音源と、声道による **F1/F2/F3フォルマント** の組み合わせでモデル化できる。Klatt (1980) が提案する F0 / F1-F3 / B1-B3 / 有声振幅 / 気息音を、MORPHOSPACE の既存 Web Audio グラフに写像した。研究で述べる声門音源のスペクトル傾斜は、単純な低音鋸歯状波を音声出力へ直結することの問題点を説明する。

実装上の変更は次のとおり。

1. Gregorian / sutra は `directTone` と `directOvertone` を **0** にする。既存の声門に相当する励振器から、ローパスと3段の並列母音フォルマントを通った音だけを中心にする。
2. 母音 F1/F2/F3 は発声中に音節ごとに変化し、低周波の一定音より「あ・お・う」などの響きと呼吸による区切りを重視する。
3. 既存の filtered-noise consonant source を微量に混ぜ、息の抜けを模倣する。ランダムなノイズノードや追加発振器を更新周期に生成しない。
4. 4声以内のゆるいユニゾンと小さな微分音揺れにし、6声が同じ低音を加算し続けない。読経も実在の経文は発話しない。
5. 旧オリジナルは元の出力・音色を復元する。切替には `setTargetAtTime` による補間を用いる。
6. 各追加スタイルは、オリジナルの音量ゲイン .95 より**大幅に小さい初期ゲイン**から出力する。初期設定は Gregorian .81 / cetacean .09 / hymn .23 / sutra .88。これらはブラウザ上で計測した出力RMSを見て再調整した値であり、全個体・全機器について厳密に等しいLUFSを保証するものではない。
7. ブラウザ実行時の AnalyserNode で5種類の波形 RMS / 帯域別エネルギーをオリジナルと比較する。比較窓の長さや発声休止により誤差が生じるため、最終判定は**聴感、長時間測定、iPhoneの実機**を合わせて行う。

**関連一次資料・技術資料**

- Dennis H. Klatt (1980), *Software for a Cascade/Parallel Formant Synthesizer*, JASA. https://sail.usc.edu/~lgoldste/Ling582/Week%2012/klatt1980.pdf — F0, F1–F3, 帯域幅、voicing/aspiration の独立制御。
- Pisanski et al., *Acoustic and auditory phonetics: the adaptive design of speech sound systems*（PMC掲載のレビュー） https://pmc.ncbi.nlm.nih.gov/articles/PMC2606790/ — 声帯の音源と声道共鳴および放射によるスペクトル合成。
- d'Alessandro et al., *Cantor Digitalis: chironomic parametric synthesis of singing* (2017) https://link.springer.com/article/10.1186/s13636-016-0098-5 — 歌声の声門音源・スペクトル傾斜・パラメトリック合成の参考。
- ITU-R BS.1770-5 https://www.itu.int/rec/R-REC-BS.1770/en ／ AES, *Loudness Basics* https://aes.org/resources/audio-topics/loudness-project/loudness-basics/ — RMSだけでなく周波数重み付けと時間区間のゲーティングが主観的音量に必要。**現実装の簡易RMS試験はBS.1770準拠のLUFSメーターではない**。
- W3C, *Web Audio API 1.1* https://www.w3.org/TR/webaudio/ — BiquadFilterNode / DynamicsCompressorNode / AudioParam補間。

### 独自ドメイン

XServer cronは `index.html` だけ同期するため、編集用 `voice-styles.js` と `surface-reaction.js` の実体を **同じ `index.html` のインラインscriptにも完全一致で埋め込む**。CIはこの同一性を検証する。外部スクリプトを追加する場合は同期経路を先に更新する。

## 共通のエンジニアリング制約

- 新しいリアルタイム `OscillatorNode` を音声フレームごとに生成しない。イルカ声で追加する direct gain は各発光声あたり一つだけ。5種への切り替えで発音器を何度も再生成しない。
- 音量・周波数・フィルタ値は有限・上限制限付きにし、`AudioParam.setTargetAtTime()` で緩やかに補間する。スタイル切替の際は既存のアナライザー／コンプレッサ／安全シェーパーを通す。
- 既存の `AudioContext` のタップ起動、画面復帰時の `resume()`、音声の録画トラックとの接続を維持する。iPhone Safariでは自動再生がユーザー操作なしに制限される。
- 背景の heartbeat はオリジナルで従来通り、聖歌・讃美歌・読経では控えめに、鯨歌では無効化する。音響表現の主役を守るため。
- 外部録音サンプルを含めず、作品として他者の著作物や宗教的文言を利用しない。

技術典拠:
- W3C, *Web Audio API 1.1*, §7.3 AudioParam Transitions / §7.4 Audio Glitching https://www.w3.org/TR/webaudio-1.1/
- MDN, *Web Audio API best practices* https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices

## 受け入れ条件・検証

1. 鑑賞設定から5種選択できる。再生中にスタイルを変えても停止・再読込が不要。
2. 初回は original、2回目以降は保存したモードが選択され、保存不可環境では original へ戻る。
3. 各モードの音高・残響・音節数・同期が明瞭に区別され、個体差が出る。
4. グレゴリアンに常時四声の三和音を付けない。讃美歌は4声の同時進行。読経は低域・狭音域。鯨歌は二層の呼応。
5. 各周波数、ゲイン、フィルタ値が有限値である。イルカ側の基本周波数は670–2600 Hz（元の超音波そのものを発生させない）。
6. 原音への復帰時、4つのイルカ用発振器の波形が正弦波から従来の波形に戻り、直結ゲインは0になる。
7. 既存の動画保存に現在の発声スタイルの音が入る。録音を有効化していないときは従来通り無音で書き出せる。
8. Playwright WebGLスモークと `node --test tests/*.test.cjs` が通る。実機 iPhone Safariで音・UX・録画を別途聴感確認する（自動テストだけでは音楽品質の合格を断定しない）。

## 実装対応

- `index.html` — 音声選択 UI、設定保存、発声器の制御経路、既存の録画経路、heartbeat レベル
- `voice-styles.js` — モード別音楽文法、音響パラメータ、元モードへの復帰
- `tests/voice-styles.test.cjs` — 音声出力パラメータの範囲、各モードの差、切替時のノード再利用と復帰
- `.github/workflows/deploy-pages.yml` — 音声モジュール変更をPagesデプロイトリガーに加える
