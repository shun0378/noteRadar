//定数
const FIXED_DIGIT = 10
/**
 * デフォルトパラメータを生成
 * @param {Object} scoreDetails - スコア詳細データ
 * @returns {Object} - デフォルトパラメータ
 */
const createDefaultParameter = scoreDetail => ({
    density: calculateDensity(scoreDetail),
    strokes: calculateStrokes(scoreDetail),
    scrollSpeed: calculateScrollSpeed(scoreDetail),
    gimmick: calculateGimmick(scoreDetail) * 100,
    rhythm: calculateRhythm(scoreDetail) * 100,
    crowd: calculateCrowd(scoreDetail),
});

/**
 * 平均密度を求める
 * @param {Array} validNotesStatus - ノーツのステータスの2次元配列
 * @returns {number} 平均密度
 */
const calculateDensity = validNotesStatus =>
    Number(((countElementsIn2DArray(validNotesStatus) - 1) / sumPropertyValues2DArray(validNotesStatus, 'interval')).toFixed(FIXED_DIGIT));

/**
 * スクロール速度を求める
 * @param {Array} validNotesStatus - ノーツのステータスの2次元配列
 * @returns {number} スクロール速度
 */
const calculateScrollSpeed = validNotesStatus =>
    getMostFrequentRoundedValue(
        [
            ...flatten2DArray(
                multiply2DArrays(
                    extractKeyTo2DArray(
                        validNotesStatus, 'bpm'
                    ),
                    extractKeyTo2DArray(
                        validNotesStatus, 'highSpeed'
                    )
                )
            ).filter(value => value !== 0)
        ].sort((a, b) => a - b)).mostFrequent

/**
 * 密集度を計算
 * @param {Array} parameter - ノーツデータの2次元配列
 * @returns {number} 密集度
 */
const calculateCrowd = parameter => {
    const notesCount = separatelyCountElementsIn2DArray(parameter).filter(item => item !== 0);
    const targetMeasure = parameter.filter(item => item.length !== 0);
    const crowd = calculateTopPercentageValue(
        notesCount.map((crowd, i) => {
            const measure = targetMeasure[i][0];
            return measure.measureWidth > 0.25
                ? crowd / (sumPropertyValues1DArray(targetMeasure[i], 'highSpeed') / targetMeasure[i].length) / measure.measureWidth
                : 0;
        }),
        100
    )
    if (crowd === null) throw new Error("crowd is null");
    return Number(crowd.toFixed(FIXED_DIGIT));
};

/**
 * 小節内密度を計算
 * @param {Array} validNotesStatus - ノーツのステータスの2次元配列
 * @returns {Array<number>} 小節ごとの密度配列
 */
const calculateLocalDensities = validNotesStatus => {
    const measureNotesCounts = separatelyCountElementsIn2DArray(validNotesStatus);
    const measureTimes = separatelySumPropertyValues2DArray(validNotesStatus, 'interval');

    return measureNotesCounts
        .map((count, i) => count / measureTimes[i])
        .filter(value => value > 0);
};

/**
 * 最大連符数を計算
 * @param {Array} arr - ノーツデータの2次元配列
 * @returns {number} 最大連符数
 */
const calculateStrokes = arr => {
    let max = 0;
    let count = 0;

    arr.forEach(subArray => {
        subArray.forEach(item => {
            if ((240 / item.bpm / item.interval / item.highSpeed).toFixed(FIXED_DIGIT) >= 12) {
                count++;
            } else {
                max = Math.max(max, count);
                count = 0;
            }
        });
    });

    return Math.max(max, count) + 1;
};

/**
 * リズム難易度を計算
 * @param {Array} arr - ノーツデータの2次元配列
 * @returns {number} リズム難易度
 */
const calculateRhythm = arr => {
    const trueCount = arr.reduce((count, subArray) => {
        const intervalTypes = calculateIntervalTypes(subArray);
        return count + (isIrregularRhythms(intervalTypes) ? 1 : 0);
    }, 0);

    return trueCount / arr.length;
};

/**
 * リズムが変則的か判定
 * @param {Array<number>} intervalTypes - リズムタイプの配列
 * @returns {boolean} 変則的か否か
 */
const isIrregularRhythms = intervalTypes => {
    if (intervalTypes.length === 0) return false;

    const dotted = 1.5;
    const ranges = Array.from({ length: 5 }, (_, j) => j);

    const isQuadrupletNote = note =>
        ranges.some(j => {
            const baseNote = 2 * Math.pow(2, j);
            const dottedNote = baseNote / dotted;
            const rounded = val => Math.round(val * 1000) / 1000;
            return rounded(note) === rounded(baseNote) || rounded(note) === rounded(dottedNote);
        });

    const isTripletNote = note =>
        ranges.some(j => {
            const baseNote = 3 * Math.pow(2, j);
            return Math.round(note * 1000) / 1000 === Math.round(baseNote * 1000) / 1000;
        });

    const isAnotherRhythm = intervalTypes.some(note => {
        return note >= 5.3 && !isQuadrupletNote(note) && !isTripletNote(note);
    });

    return isAnotherRhythm || (intervalTypes.some(isQuadrupletNote) && intervalTypes.some(isTripletNote));
};

/**
 * 新しい値を配列に一意に追加
 * @param {Array<number>} arr - 数値配列
 * @param {number} newValue - 追加する値
 * @returns {Array<number>} 更新された配列
 */
const addUniqueElement = (arr, newValue) => {
    const roundedValue = Math.round(newValue * 1000) / 1000;
    return roundedValue === 0 || arr.includes(roundedValue) ? arr : [...arr, roundedValue];
};

/**
 * interval の n 分音符を計算
 * @param {Array} subArray - 小節データ
 * @returns {Array<number>} interval 種類配列
 */
const calculateIntervalTypes = subArray =>
    subArray.reduce((intervalTypes, item) => {
        const adjustBpm = bpm => (bpm > 300 ? adjustBpm(bpm / 2) : bpm);
        const effectiveBpm = adjustBpm(item.bpm);
        const intervalValue = item.interval !== 0 ? (240 / effectiveBpm / item.interval).toFixed(FIXED_DIGIT) : 0;
        return addUniqueElement(intervalTypes, intervalValue);
    }, []);

/**
 * ギミック率を計算
 * @param {Array} validNotesStatus - ノーツのステータスの2次元配列
 * @returns {number} ギミック率
 */
const calculateGimmick = validNotesStatus => {
    let preScroll = null;
    let gimmickCount = -1;

    validNotesStatus.forEach(measure => {
        let isGimmick = false;

        measure.forEach(note => {
            const nowScroll = (note.bpm * note.highSpeed).toFixed(FIXED_DIGIT);
            if (Math.abs(nowScroll - preScroll) >= 5) {
                isGimmick = true;
            }
            preScroll = nowScroll;
        });

        if (isGimmick) {
            gimmickCount++;
        }
    });

    return gimmickCount / validNotesStatus.length;
};



//
// 汎用ヘルパー関数
// 

/**
 * 2次元配列内の全要素数をカウントする関数
 *
 * @param {Array<Array<any>>} arr - 2次元配列
 * @returns {number} 2次元配列内の全要素数
 */
const countElementsIn2DArray = arr =>
    arr.reduce((total, subArray) => total + subArray.length, 0);

/**
 * オブジェクトの配列内で、指定したプロパティの値の合計を計算する関数
 *
 * @param {Array<Object>} arr - オブジェクトの配列
 * @param {string} prop - 合計するプロパティのキー
 * @returns {number} プロパティの値の合計（存在しない場合は0として扱う）
 */
const sumPropertyValues1DArray = (arr, prop) =>
    arr.reduce((sum, obj) => sum + (obj[prop] || 0), 0);

/**
 * 2次元配列内の全オブジェクトについて、指定したプロパティの値の合計を計算する関数
 *
 * @param {Array<Array<Object>>} arr - 2次元配列（オブジェクトの配列の配列）
 * @param {string} prop - 合計するプロパティのキー
 * @returns {number} 2次元配列内のプロパティ値の合計
 */
const sumPropertyValues2DArray = (arr, prop) =>
    arr.reduce((total, subArray) => total + sumPropertyValues1DArray(subArray, prop), 0);

/**
 * 数値の配列から、上位 n パーセントの値を取得する関数
 *
 * @param {number[]} values - 数値の配列
 * @param {number} n - 上位何パーセントか (0～100)
 * @returns {number|null} 上位 n パーセントに相当する値。配列が空の場合は null を返す
 * @throws {Error} n が 0～100 の範囲外の場合にエラーをスローする
 */
const calculateTopPercentageValue = (values, n) => {
    if (values.length === 0) return null;
    if (n < 0 || n > 100) throw new Error("Percentage must be between 0 and 100");

    const sortedValues = [...values].sort((a, b) => a - b);
    const index = Math.ceil((sortedValues.length * n) / 100) - 1;
    return sortedValues[Math.max(index, 0)];
};

/**
 * 2次元配列を1次元に平坦化する関数
 *
 * @param {Array<Array<any>>} arr2D - 2次元配列
 * @returns {Array<any>} 平坦化された1次元配列
 */
const flatten2DArray = arr2D => arr2D.flat();

/**
 * オブジェクトの配列から、指定したキーの値のみを抽出して1次元配列にする関数
 *
 * @param {Array<Object>} data - オブジェクトの配列
 * @param {string} key - 抽出するキー
 * @returns {Array<any>} 抽出された値の1次元配列
 */
const extractKeyTo1DArray = (data, key) => data.map(obj => obj[key]);

/**
 * 2次元配列内の各サブ配列から、指定したキーの値のみを抽出して2次元配列にする関数
 *
 * @param {Array<Array<Object>>} data - 2次元配列（オブジェクトの配列の配列）
 * @param {string} key - 抽出するキー
 * @returns {Array<Array<any>>} 各サブ配列から抽出された値の2次元配列
 */
const extractKeyTo2DArray = (data, key) => data.map(innerArray => extractKeyTo1DArray(innerArray, key));

/**
 * 2次元配列内の各サブ配列の要素数を個別にカウントする関数
 *
 * @param {Array<Array<any>>} arr2D - 2次元配列
 * @returns {number[]} 各サブ配列の要素数の配列
 */
const separatelyCountElementsIn2DArray = arr2D => arr2D.map(row => row.length);

/**
 * 2次元配列内の各サブ配列について、指定したプロパティの値の合計を計算する関数
 *
 * @param {Array<Array<Object>>} arr2D - 2次元配列（オブジェクトの配列の配列）
 * @param {string} prop - 合計するプロパティのキー
 * @returns {number[]} 各サブ配列ごとのプロパティ値の合計の配列
 */
const separatelySumPropertyValues2DArray = (arr2D, prop) => arr2D.map(arr => sumPropertyValues1DArray(arr, prop));

/**
 * 2つの配列の各要素を掛け合わせ、その結果を配列として返す関数
 *
 * @param {number[]} a - 数値の配列
 * @param {number[]} b - 数値の配列（aと同じ長さであること）
 * @returns {number[]} 各要素同士を掛け合わせた結果の配列
 */
const multiplyArrays = (a, b) => a.map((x, i) => x * b[i]);

/**
 * 2つの2次元配列の各対応要素を掛け合わせ、その結果を2次元配列として返す関数
 *
 * @param {Array<Array<number>>} a - 2次元配列（数値の配列の配列）
 * @param {Array<Array<number>>} b - 2次元配列（aと同じ形状であること）
 * @returns {Array<Array<number>>} 各対応要素同士を掛け合わせた結果の2次元配列
 */
const multiply2DArrays = (a, b) => a.map((row, i) => row.map((x, j) => x * b[i][j]));

/**
 * 実数配列の各要素を四捨五入し、各値の出現回数を返す関数
 * @param {number[]} arr - 実数の配列
 * @returns {Object} - 四捨五入した値をキー、その出現回数を値とするオブジェクト
 */
const countRoundedValues = (arr) => {
    return arr.reduce((acc, num) => {
        const rounded = Math.round(num * 1000) / 1000;
        acc[rounded] = (acc[rounded] || 0) + 1;
        return acc;
    }, {});
};

/**
 * 実数配列の各要素を四捨五入した結果、最も頻出する値とその出現回数を返す関数
 * @param {number[]} arr - 実数の配列
 * @returns {{mostFrequent: number, count: number}} - 最頻値とその個数を持つオブジェクト
 */
const getMostFrequentRoundedValue = (arr) => {
    const counts = countRoundedValues(arr);
    let maxCount = -Infinity;
    let mostFrequent = null;
    for (const key in counts) {
        if (counts[key] > maxCount) {
            maxCount = counts[key];
            mostFrequent = Number(key);
        }
    }
    return { mostFrequent, count: maxCount };
};
