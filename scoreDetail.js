// 定数
const VALID_NOTE_TYPES = /[1-4]/;
const ALL_NOTE_TYPES = /[0-9]/;
const SEPARATOR_NOTE = ',';
const EMPTY_NOTE_TYPE = 0;
const INVALID_NOTE_TYPES = /[056789]/;
const NOTE_INTERVAL_CALC_CONSTANT = 240;

/**
 * TJAのテキストをスコアデータに変換する関数。
 *
 * @param {string[]} cleanTja - 改行文字とコメントを除いたTJAファイル行の配列
 * @returns {Array<Array<Array<Map<string, string>>>>>} - 譜面の詳細データ
 */
const tjaToScoreDetails = (cleanTja) => {
    const scores = clippingTja(cleanTja);
    const defaultBpm = Number(searchCommandValue(cleanTja, 'BPM:')[0]);

    const initialNoteStatus = { bpm: defaultBpm, highSpeed: 1, measureWidth: 1 };

    return scores.map(score => {
        const scoreDetails = generateNoteStatus(score, { ...initialNoteStatus });
        const measures = splitMeasures(scoreDetails);
        const measuresWithIntervals = generateInterval(measures);
        return removeInvalidNote(measuresWithIntervals);
    });
};

/**
 * TJAの#STARTと#ENDの間のセグメントを抽出する。
 *
 * @param {string[]} cleanTja - 改行文字とコメントを排したTJAファイル行の配列
 * @returns {string[][]} - 各チャート部分のセグメント配列
 */
const clippingTja = (cleanTja) => {
    const startIndices = getAllIndices(cleanTja, /^#START$/);
    const endIndices = processArrays(startIndices, getAllIndices(cleanTja, /^#END$/));

    return startIndices.map((startIndex, i) => cleanTja.slice(startIndex + 1, endIndices[i]));
};

/**
 * 譜面行に応じた処理を実行し、ノーツの詳細情報を生成。
 *
 * @param {string[]} score - 1つの難易度に対応する譜面行
 * @param {Object} noteStatus - 現在のノーツのステータス情報
 * @returns {Array<Map<string, string>>} - ノーツの詳細情報
 */
const generateNoteStatus = (score, noteStatus) =>
    score.flatMap(line =>
        line.includes('#')
            ? processCommand(line, noteStatus) || []
            : processNotes(line, noteStatus)
    );

/**
 * コマンド行を処理し、noteStatusを更新。
 *
 * @param {string} commandLine - コマンド行
 * @param {Object} noteStatus - 現在のノーツのステータス情報
 */
const processCommand = (commandLine, noteStatus) => {
    const commandProcessors = {
        BPMCHANGE: (value) => noteStatus.bpm = validateNumber(value, 'Invalid BPMCHANGE value'),
        MEASURE: (value) => noteStatus.measureWidth = parseMeasure(value),
        SCROLL: (value) => noteStatus.highSpeed = validateNumber(value, 'Invalid SCROLL value'),
    };

    const command = Object.keys(commandProcessors).find(cmd => commandLine.includes(cmd));
    if (command) {
        const value = getCommandValue(commandLine, `#${command} `);
        commandProcessors[command]?.(value);
    }
};

/**
 * ノーツ行を処理して詳細情報を生成。
 *
 * @param {string} notesLine - 譜面の1行
 * @param {Object} noteStatus - 現在のノーツのステータス情報
 * @returns {Array<Map<string, string>>} - ノーツ詳細情報
 */
const processNotes = (notesLine, noteStatus) =>
    Array.from(notesLine).map(note => ({
        bpm: noteStatus.bpm,
        interval: null,
        highSpeed: noteStatus.highSpeed,
        measureWidth: noteStatus.measureWidth,
        noteType: note === SEPARATOR_NOTE ? note : parseInt(note),
    }));

/**
 * 各小節ごとにノーツを分割。
 *
 * @param {Array<Map<string, string>>} scoreDetails - 譜面のノーツ詳細
 * @returns {Array<Array<Map<string, string>>>} - 小節ごとに分割されたノーツ
 */
const splitMeasures = (scoreDetails) =>
    scoreDetails.reduce((measures, note) => {
        if (note.noteType === SEPARATOR_NOTE) {
            if (measures[measures.length - 1].length === 0) {
                measures[measures.length - 1].push(
                    {
                        bpm: note.bpm,
                        interval: null,
                        highSpeed: note.highSpeed,
                        measureWidth: note.measureWidth,
                        noteType: EMPTY_NOTE_TYPE,
                    }
                )
            }
            measures.push([]);
        } else {
            measures[measures.length - 1].push(note);
        }
        return measures;
    }, [[]]);


/**
 * 小節ごとのノーツ配列にインターバルを設定する関数。
 *
 * @param {Array<Array<Map<string, string>>>} measures - ノーツ情報が格納された配列
 * @returns {Array<Array<Map<string, string>>>} - インターバルが正しく設定された配列
 */
const generateInterval = (measures) => {
    let lastNoteIndex = null; // 最後に処理されたノートのインデックス
    let intervalAccumulator = 0; // 累積インターバル時間

    measures.forEach((measure, measureIndex) => {
        if (measure.length > 0) {
            measure.forEach((note, noteIndex) => {
                const { noteType, bpm, measureWidth } = note;
                const beatCount = measure.length; // 小節内のノート数

                if (VALID_NOTE_TYPES.test(noteType)) {
                    if (lastNoteIndex !== null) {
                        const [lastMeasureIndex, lastNoteIndexWithinMeasure] = lastNoteIndex;
                        const lastNote = measures[lastMeasureIndex][lastNoteIndexWithinMeasure];
                        lastNote.interval = Number(intervalAccumulator.toFixed(15));
                    }
                    lastNoteIndex = [measureIndex, noteIndex];
                    intervalAccumulator = (240 / bpm / beatCount) * measureWidth;
                } else {
                    intervalAccumulator += (240 / bpm / beatCount) * measureWidth;
                }
            });
        }
    });

    if (lastNoteIndex !== null) {
        const [lastMeasureIndex, lastNoteIndexWithinMeasure] = lastNoteIndex;
        measures[lastMeasureIndex][lastNoteIndexWithinMeasure].interval = 0;
    }

    return measures;
};



/**
 * intervalを計算。
 *
 * @param {number} bpm - ノーツのBPM
 * @param {number} beat - 小節の分割数
 * @param {number} measureWidth - 小節の長さ
 * @returns {number} - 計算されたインターバル
 */
const calculateInterval = (bpm, beat, measureWidth) =>
    (NOTE_INTERVAL_CALC_CONSTANT / bpm / beat) * measureWidth;

/**
 * ノーツのtypeが0のものを削除。
 *
 * @param {Array<Array<Map<string, string>>>} measures - ノーツの小節配列
 * @returns {Array<Array<Map<string, string>>>} - 削除後のノーツ小節配列
 */
const removeInvalidNote = (measures) =>
    measures.map(measure => measure.filter(note => VALID_NOTE_TYPES.test(note.noteType)));

/**
 * 値が数値かを検証。
 *
 * @param {string} value - 検証する値
 * @param {string} errorMessage - エラーメッセージ
 * @returns {number} - 検証済みの数値
 */
const validateNumber = (value, errorMessage) => {
    const number = parseFloat(value);
    if (isNaN(number)) throw new Error(errorMessage);
    return number;
};


/**
 * 配列aと配列bの同要素を比較し、aの値がbの値より大きい場合はbの該当要素を削除する関数
 * 
 * 処理手順:
 *  0. aとbそれぞれのインデックス(i, j)を0で初期化する。
 *  1. a[i]とb[j]を比較する。
 *     - a[i] < b[j] または a[i] === b[j] の場合、何もせずに両方のインデックスを1増やす。
 *     - a[i] > b[j] の場合、b[j]を削除し、配列bを詰める。インデックスは増やさない。
 *  2. この処理をaの長さ分だけ繰り返す。
 * 
 * @param {number[]} a - 比較の基準となる配列（例: [17, 116, 403, 501, 599]）
 * @param {number[]} b - 処理対象の配列（例: [107, 206, 303, 395, 493, 591, 689]）
 * @returns {number[]} - 処理後の配列b（例: [107, 206, 493, 591, 689]）
 */
const processArrays = (a, b) => {
    let i = 0, j = 0;
    // aの長さ分ループ。bは削除により長さが短くなる可能性があるので、jも条件に含める。
    while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) {
            // aの要素がbの要素以下の場合、両方のインデックスを増やす
            i++;
            j++;
        } else {
            // aの要素がbの要素より大きい場合、b[j]を削除して配列を詰める
            b.splice(j, 1);
            // インデックスはそのまま（削除により次の要素がj番目に来るため）
        }
    }
    return b;
};

/**
 * 4/4のような拍子を表す文字列を計算式として計算する関数
 * @param {string} measureString - 4/4のような拍子を表す文字列 
 * @returns 引数の文字列を計算した結果
 */
const parseMeasure = (measureString) => {
    const [numerator, denominator] = measureString.split('/').map(Number);
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        throw new Error(`Invalid measure value: ${measureString}`);
    }
    return numerator / denominator;
};

/**
*  コマンドが設定されている文字列を取得し、コマンド内で設定された値を取得する
* @param {string} line - 検索行
* @param {string} command - ヘッダーと#から始まる命令
* @returns {String} - コマンド内で設定された値
*/
const getCommandValue = (line, command) =>
    modifyString(line, command, 'remove');

/**
 * 与えられた正規表現にマッチする配列中の要素のすべてのインデックスを検索する関数。
 * 配列の文字列一致の行数検索はすべてこの関数を用いる。
 * 
 * @param {string[]} array - 検索対象の配列．
 * @param {RegExp|string} regex - 正規表現，あるいはマッチする文字列．
 * @returns {number[]} - 一致したインデックスの配列。
 */
const getAllIndices = (array, regex) => array
    .map((element, index) => (element.search(regex) > -1 ? index : -1))
    .filter(index => index !== -1);