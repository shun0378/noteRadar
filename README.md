# noteRadar
太鼓の達人のノーツレーダーです。

https://shun0378.github.io/noteRadar/

# 使い方
「ファイルを選択」をクリックし、tjaファイルを選択する。
右上のプルダウンメニューで難易度を選択する(Edit,Oni,Hard,Easy)。双打譜面は対象外。

# 各パラメータ概要
## density(平均密度)
平均密度です。
ノーツの間隔を平均化したとき、1秒間に何打たたくかを数値化したものです。
(コンボ数-1)/演奏時間で表します。

単位：コンボ/秒数

## strokes(連打数)
ノーツが連なる個数の最大値です。黄色連打や風船連打ではありません。
12分音符とそれより狭い間隔の場合に連打としてカウントします。
HSがかかっている場合は見た目の間隔でカウントします。

単位：コンボ

## scrollSpeed(スクロール速度)
スクロール速度の速さです。
ノーツが出現してから判定枠に到着する速さです。
各ノーツで同じスクロール速度のものをカウントし、最も多いものを表示します。

単位：bpm

## gimmick(ギミック率)
スクロール変化が起こっている場所がどれほど多いかの割合です。
スクロール変化が起こっている小節と全小節の比で計算します。

単位：%

## rhythm(リズム難率)
リズムが難しい場所がどれほど多いかの割合です。
1つの小節で4連符と3連符が混在している場合のほか、
5連符や7連符などのようなめずらしいリズムがある小節をリズム難と判定し、全小節との比で計算します。

単位：%

## crowd(密集度)
1画面に表示されるノーツの個数の最大値です。
各小節のノーツ数をカウントし、HS倍率で割ることで集計しています。
小節が4/4拍子でない場合は同じ長さになるように適宜倍率を加えます。
最大値にすると似たような値ばかりになってしまうためです。

単位：コンボ/小節
