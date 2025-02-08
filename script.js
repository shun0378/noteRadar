document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');

    setupFileInputListener(fileInput, (tjaName, tjaData) => {
        const cleanTja = tjaData.split('\n')
            .map(item => modifyString(
                modifyString(item, '//', 'removeAfter'), '\r', 'remove'
            ));

        const courseNumbers = searchCommandValue(cleanTja, 'COURSE:');
        const courseNames = courseRename(courseNumbers);
        addOptionsToSelect('courseInput', courseNames.length > 0 ? courseNames : ['Oni']);

        const scoreDetails = tjaToScoreDetails(cleanTja);
        const scoreParameters = scoreDetails.map(scoreDetail => createDefaultParameter(scoreDetail));
        const parameters = scoreParameters.map(scoreParameter => calculateParameter(scoreParameter));

        const rates = parameters.map(parameter => {
            return {
                powerRate: Number(((parameter.density + parameter.strokes + parameter.scrollSpeed) / 3).toFixed(3)),
                techniqueRate: Number(((parameter.rhythm + parameter.scrollSpeed + parameter.crowd) / 3).toFixed(3)),
                gimmickRate: Number(((parameter.gimmick)).toFixed(3)),
            }
        });

        console.log(scoreDetails);
        console.log(scoreParameters);
        console.log(parameters);
        console.log(rates);

        const units = {
            density: 'combo/sec',
            scrollSpeed: 'bpm',
            strokes: 'combo',
            rhythm: '%',
            crowd: 'combo/measure',
            gimmick: '%',
        };

        // レーダーチャート作成と保持
        rates.forEach((rate, index) => {
            radarCharts.push(createRadarChart(parameters[index], 'myChart', getChartType(rate)));
        });

        // セレクト変更時の処理
        const courseInput = document.getElementById('courseInput');
        if (courseInput) {
            courseInput.addEventListener('change', (event) => {
                const selectedIndex = event.target.selectedIndex;

                if (parameters[selectedIndex]) {

                    // 新しいチャートの作成
                    radarCharts[selectedIndex] = createRadarChart(
                        parameters[selectedIndex],
                        'myChart',
                        getChartType(rates[selectedIndex])
                    );

                    // パラメータの更新表示
                    displayParametersWithUnits(
                        scoreParameters[selectedIndex],
                        units,
                        tjaName
                    );
                }
            });

            // 初期状態で最初のチャートを表示
            if (parameters.length > 0) {
                radarCharts[0] = createRadarChart(parameters[0], 'myChart', getChartType(rates[0]));
                displayParametersWithUnits(scoreParameters[0], units, tjaName);
            }
        }

    });
});

let radarCharts = [];

/**
 * 配列からselect要素にオプションを追加し、既存のオプションを置き換える関数
 * 
 * @param {string} selectId - 入力するselect要素のID
 * @param {string[]} optionsArray - 追加するオプション値の配列
 * @returns {void} 処理結果を返さず、副作用としてselect要素を更新する
 */
const addOptionsToSelect = (selectId, optionsArray) => {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        console.error(`Select element with id "${selectId}" not found.`);
        return;
    }

    selectElement.innerHTML = "";

    optionsArray.forEach(optionValue => {
        const optionElement = document.createElement('option');
        optionElement.value = optionValue;
        optionElement.textContent = optionValue;
        selectElement.appendChild(optionElement);
    });
};

/**
 * パラメータを生成
 * @param {Object} defaultParameter - デフォルトパラメータ
 * @returns {Object} - パラメータ
 */
const calculateParameter = defaultParameter => {
    return clipValues({
        density: (Math.tanh((defaultParameter.density - 6) / 3) + 1) * 5,
        scrollSpeed: (Math.tanh((defaultParameter.scrollSpeed - 200) / 75) + 1) * 5,
        rhythm: Math.log2(defaultParameter.rhythm / 100 + 1) * 10,
        crowd: (Math.tanh((defaultParameter.crowd - 16) / 8) + 1) * 5,
        gimmick: Math.log2(defaultParameter.gimmick / 100 + 1) * 10,
        strokes: (defaultParameter.strokes ** 1.7) / (1000 + (defaultParameter.strokes ** 1.7)) * 10,
    }, 0, 9999);
};

/**
 * オブジェクト内の変数のクリッピングを行う関数
 * @param {Object} obj - オブジェクト
 * @param {Number} min - 最小値
 * @param {Number} max - 最大値
 * @returns 
 */
const clipValues = (obj, min, max) => {
    const clippedObj = {};

    Object.keys(obj).forEach(key => {
        clippedObj[key] = Math.max(min, Math.min(obj[key], max));
    });

    return clippedObj;
};

/**
 * 難易度番号の配列を対応する名前に変換する関数
 * 
 * @param {string[]} courseNumbers - 難易度番号を文字列として含む配列
 * @returns {string[]} - 難易度名を文字列に置き換えた配列
 */
const courseRename = (courseNumbers) => {
    const courseNames = courseNumbers.map(item => {
        switch (item) {
            case '0': return 'Easy';
            case '1': return 'Normal';
            case '2': return 'Hard';
            case '3': return 'Oni';
            case '4': return 'Edit';
            default: return item;
        }
    });
    return courseNames.map(courseName =>
        courseName[0].toUpperCase() + courseName.slice(1).toLowerCase()
    );
};

/**
 * チャートの色を決定する
 * 
 * @param {string[]} rates - 各レート値
 * @returns {string[]} - チャートの色
 */
const getChartType = rates => {
    const conditions = {
        '167, 87, 168': (param) => Math.max(param.powerRate, param.techniqueRate, param.gimmickRate) === param.gimmickRate, // gimmick
        '60, 179, 113': (param) => Math.abs(param.powerRate - param.techniqueRate) < 0.8, // all-round
        '255, 0, 0': (param) => Math.max(param.powerRate, param.techniqueRate, param.gimmickRate) === param.powerRate, // power
        '0, 0, 255': (param) => Math.max(param.powerRate, param.techniqueRate, param.gimmickRate) === param.techniqueRate, // technique
    };

    const evaluate = (param) => {
        return Object.keys(conditions).find(key => conditions[key](param)) || null;
    };
    return evaluate(rates);
}
