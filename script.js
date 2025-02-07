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

        // ���[�_�[�`���[�g�쐬�ƕێ�
        rates.forEach((rate, index) => {
            radarCharts.push(createRadarChart(parameters[index], 'myChart', getChartType(rate)));
        });

        // �Z���N�g�ύX���̏���
        const courseInput = document.getElementById('courseInput');
        if (courseInput) {
            courseInput.addEventListener('change', (event) => {
                const selectedIndex = event.target.selectedIndex;

                if (parameters[selectedIndex]) {

                    // �V�����`���[�g�̍쐬
                    radarCharts[selectedIndex] = createRadarChart(
                        parameters[selectedIndex],
                        'myChart',
                        getChartType(rates[selectedIndex])
                    );

                    // �p�����[�^�̍X�V�\��
                    displayParametersWithUnits(
                        scoreParameters[selectedIndex],
                        units,
                        tjaName
                    );
                }
            });

            // ������Ԃōŏ��̃`���[�g��\��
            if (parameters.length > 0) {
                radarCharts[0] = createRadarChart(parameters[0], 'myChart', getChartType(rates[0]));
                displayParametersWithUnits(scoreParameters[0], units, tjaName);
            }
        }

    });
});

let radarCharts = [];

/**
 * �z�񂩂�select�v�f�ɃI�v�V������ǉ����A�����̃I�v�V������u��������֐�
 * 
 * @param {string} selectId - ���͂���select�v�f��ID
 * @param {string[]} optionsArray - �ǉ�����I�v�V�����l�̔z��
 * @returns {void} �������ʂ�Ԃ����A����p�Ƃ���select�v�f���X�V����
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
 * �p�����[�^�𐶐�
 * @param {Object} defaultParameter - �f�t�H���g�p�����[�^
 * @returns {Object} - �p�����[�^
 */
const calculateParameter = defaultParameter => {
    return clipValues({
        density: (Math.tanh((defaultParameter.density - 6) / 3) + 1) * 5,
        scrollSpeed: (Math.tanh((defaultParameter.scrollSpeed - 200) / 75) + 1) * 5,
        rhythm: Math.log2(defaultParameter.rhythm / 100 + 1) * 10,
        crowd: (Math.tanh((defaultParameter.crowd - 12) / 6) + 1) * 5,
        gimmick: Math.log2(defaultParameter.gimmick / 100 + 1) * 10,
        strokes: (defaultParameter.strokes ** 1.7) / (1000 + (defaultParameter.strokes ** 1.7)) * 10,
    }, 0, 9999);
};

/**
 * �I�u�W�F�N�g���̕ϐ��̃N���b�s���O���s���֐�
 * @param {Object} obj - �I�u�W�F�N�g
 * @param {Number} min - �ŏ��l
 * @param {Number} max - �ő�l
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
 * ��Փx�ԍ��̔z���Ή����閼�O�ɕϊ�����֐�
 * 
 * @param {string[]} courseNumbers - ��Փx�ԍ��𕶎���Ƃ��Ċ܂ޔz��
 * @returns {string[]} - ��Փx���𕶎���ɒu���������z��
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
 * �`���[�g�̐F�����肷��
 * 
 * @param {string[]} rates - �e���[�g�l
 * @returns {string[]} - �`���[�g�̐F
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