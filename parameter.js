//�萔
const FIXED_DIGIT = 10
/**
 * �f�t�H���g�p�����[�^�𐶐�
 * @param {Object} scoreDetails - �X�R�A�ڍ׃f�[�^
 * @returns {Object} - �f�t�H���g�p�����[�^
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
 * ���ϖ��x�����߂�
 * @param {Array} validNotesStatus - �m�[�c�̃X�e�[�^�X��2�����z��
 * @returns {number} ���ϖ��x
 */
const calculateDensity = validNotesStatus =>
    Number(((countElementsIn2DArray(validNotesStatus) - 1) / sumPropertyValues2DArray(validNotesStatus, 'interval')).toFixed(FIXED_DIGIT));

/**
 * �X�N���[�����x�����߂�
 * @param {Array} validNotesStatus - �m�[�c�̃X�e�[�^�X��2�����z��
 * @returns {number} �X�N���[�����x
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
 * ���W�x���v�Z
 * @param {Array} parameter - �m�[�c�f�[�^��2�����z��
 * @returns {number} ���W�x
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
        90
    )
    if (crowd === null) throw new Error("crowd is null");
    return Number(crowd.toFixed(FIXED_DIGIT));
};

/**
 * ���ߓ����x���v�Z
 * @param {Array} validNotesStatus - �m�[�c�̃X�e�[�^�X��2�����z��
 * @returns {Array<number>} ���߂��Ƃ̖��x�z��
 */
const calculateLocalDensities = validNotesStatus => {
    const measureNotesCounts = separatelyCountElementsIn2DArray(validNotesStatus);
    const measureTimes = separatelySumPropertyValues2DArray(validNotesStatus, 'interval');

    return measureNotesCounts
        .map((count, i) => count / measureTimes[i])
        .filter(value => value > 0);
};

/**
 * �ő�A�������v�Z
 * @param {Array} arr - �m�[�c�f�[�^��2�����z��
 * @returns {number} �ő�A����
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
 * ���Y����Փx���v�Z
 * @param {Array} arr - �m�[�c�f�[�^��2�����z��
 * @returns {number} ���Y����Փx
 */
const calculateRhythm = arr => {
    const trueCount = arr.reduce((count, subArray) => {
        const intervalTypes = calculateIntervalTypes(subArray);
        return count + (isIrregularRhythms(intervalTypes) ? 1 : 0);
    }, 0);

    return trueCount / arr.length;
};

/**
 * ���Y�����ϑ��I������
 * @param {Array<number>} intervalTypes - ���Y���^�C�v�̔z��
 * @returns {boolean} �ϑ��I���ۂ�
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
 * �V�����l��z��Ɉ�ӂɒǉ�
 * @param {Array<number>} arr - ���l�z��
 * @param {number} newValue - �ǉ�����l
 * @returns {Array<number>} �X�V���ꂽ�z��
 */
const addUniqueElement = (arr, newValue) => {
    const roundedValue = Math.round(newValue * 1000) / 1000;
    return roundedValue === 0 || arr.includes(roundedValue) ? arr : [...arr, roundedValue];
};

/**
 * interval �� n ���������v�Z
 * @param {Array} subArray - ���߃f�[�^
 * @returns {Array<number>} interval ��ޔz��
 */
const calculateIntervalTypes = subArray =>
    subArray.reduce((intervalTypes, item) => {
        const adjustBpm = bpm => (bpm > 300 ? adjustBpm(bpm / 2) : bpm);
        const effectiveBpm = adjustBpm(item.bpm);
        const intervalValue = item.interval !== 0 ? (240 / effectiveBpm / item.interval).toFixed(FIXED_DIGIT) : 0;
        return addUniqueElement(intervalTypes, intervalValue);
    }, []);

/**
 * �M�~�b�N�����v�Z
 * @param {Array} validNotesStatus - �m�[�c�̃X�e�[�^�X��2�����z��
 * @returns {number} �M�~�b�N��
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
// �ėp�w���p�[�֐�
// 

/**
 * 2�����z����̑S�v�f�����J�E���g����֐�
 *
 * @param {Array<Array<any>>} arr - 2�����z��
 * @returns {number} 2�����z����̑S�v�f��
 */
const countElementsIn2DArray = arr =>
    arr.reduce((total, subArray) => total + subArray.length, 0);

/**
 * �I�u�W�F�N�g�̔z����ŁA�w�肵���v���p�e�B�̒l�̍��v���v�Z����֐�
 *
 * @param {Array<Object>} arr - �I�u�W�F�N�g�̔z��
 * @param {string} prop - ���v����v���p�e�B�̃L�[
 * @returns {number} �v���p�e�B�̒l�̍��v�i���݂��Ȃ��ꍇ��0�Ƃ��Ĉ����j
 */
const sumPropertyValues1DArray = (arr, prop) =>
    arr.reduce((sum, obj) => sum + (obj[prop] || 0), 0);

/**
 * 2�����z����̑S�I�u�W�F�N�g�ɂ��āA�w�肵���v���p�e�B�̒l�̍��v���v�Z����֐�
 *
 * @param {Array<Array<Object>>} arr - 2�����z��i�I�u�W�F�N�g�̔z��̔z��j
 * @param {string} prop - ���v����v���p�e�B�̃L�[
 * @returns {number} 2�����z����̃v���p�e�B�l�̍��v
 */
const sumPropertyValues2DArray = (arr, prop) =>
    arr.reduce((total, subArray) => total + sumPropertyValues1DArray(subArray, prop), 0);

/**
 * ���l�̔z�񂩂�A��� n �p�[�Z���g�̒l���擾����֐�
 *
 * @param {number[]} values - ���l�̔z��
 * @param {number} n - ��ʉ��p�[�Z���g�� (0�`100)
 * @returns {number|null} ��� n �p�[�Z���g�ɑ�������l�B�z�񂪋�̏ꍇ�� null ��Ԃ�
 * @throws {Error} n �� 0�`100 �͈̔͊O�̏ꍇ�ɃG���[���X���[����
 */
const calculateTopPercentageValue = (values, n) => {
    if (values.length === 0) return null;
    if (n < 0 || n > 100) throw new Error("Percentage must be between 0 and 100");

    const sortedValues = [...values].sort((a, b) => a - b);
    const index = Math.ceil((sortedValues.length * n) / 100) - 1;
    return sortedValues[Math.max(index, 0)];
};

/**
 * 2�����z���1�����ɕ��R������֐�
 *
 * @param {Array<Array<any>>} arr2D - 2�����z��
 * @returns {Array<any>} ���R�����ꂽ1�����z��
 */
const flatten2DArray = arr2D => arr2D.flat();

/**
 * �I�u�W�F�N�g�̔z�񂩂�A�w�肵���L�[�̒l�݂̂𒊏o����1�����z��ɂ���֐�
 *
 * @param {Array<Object>} data - �I�u�W�F�N�g�̔z��
 * @param {string} key - ���o����L�[
 * @returns {Array<any>} ���o���ꂽ�l��1�����z��
 */
const extractKeyTo1DArray = (data, key) => data.map(obj => obj[key]);

/**
 * 2�����z����̊e�T�u�z�񂩂�A�w�肵���L�[�̒l�݂̂𒊏o����2�����z��ɂ���֐�
 *
 * @param {Array<Array<Object>>} data - 2�����z��i�I�u�W�F�N�g�̔z��̔z��j
 * @param {string} key - ���o����L�[
 * @returns {Array<Array<any>>} �e�T�u�z�񂩂璊�o���ꂽ�l��2�����z��
 */
const extractKeyTo2DArray = (data, key) => data.map(innerArray => extractKeyTo1DArray(innerArray, key));

/**
 * 2�����z����̊e�T�u�z��̗v�f�����ʂɃJ�E���g����֐�
 *
 * @param {Array<Array<any>>} arr2D - 2�����z��
 * @returns {number[]} �e�T�u�z��̗v�f���̔z��
 */
const separatelyCountElementsIn2DArray = arr2D => arr2D.map(row => row.length);

/**
 * 2�����z����̊e�T�u�z��ɂ��āA�w�肵���v���p�e�B�̒l�̍��v���v�Z����֐�
 *
 * @param {Array<Array<Object>>} arr2D - 2�����z��i�I�u�W�F�N�g�̔z��̔z��j
 * @param {string} prop - ���v����v���p�e�B�̃L�[
 * @returns {number[]} �e�T�u�z�񂲂Ƃ̃v���p�e�B�l�̍��v�̔z��
 */
const separatelySumPropertyValues2DArray = (arr2D, prop) => arr2D.map(arr => sumPropertyValues1DArray(arr, prop));

/**
 * 2�̔z��̊e�v�f���|�����킹�A���̌��ʂ�z��Ƃ��ĕԂ��֐�
 *
 * @param {number[]} a - ���l�̔z��
 * @param {number[]} b - ���l�̔z��ia�Ɠ��������ł��邱�Ɓj
 * @returns {number[]} �e�v�f���m���|�����킹�����ʂ̔z��
 */
const multiplyArrays = (a, b) => a.map((x, i) => x * b[i]);

/**
 * 2��2�����z��̊e�Ή��v�f���|�����킹�A���̌��ʂ�2�����z��Ƃ��ĕԂ��֐�
 *
 * @param {Array<Array<number>>} a - 2�����z��i���l�̔z��̔z��j
 * @param {Array<Array<number>>} b - 2�����z��ia�Ɠ����`��ł��邱�Ɓj
 * @returns {Array<Array<number>>} �e�Ή��v�f���m���|�����킹�����ʂ�2�����z��
 */
const multiply2DArrays = (a, b) => a.map((row, i) => row.map((x, j) => x * b[i][j]));

/**
 * �����z��̊e�v�f���l�̌ܓ����A�e�l�̏o���񐔂�Ԃ��֐�
 * @param {number[]} arr - �����̔z��
 * @returns {Object} - �l�̌ܓ������l���L�[�A���̏o���񐔂�l�Ƃ���I�u�W�F�N�g
 */
const countRoundedValues = (arr) => {
    return arr.reduce((acc, num) => {
        const rounded = Math.round(num * 1000) / 1000;
        acc[rounded] = (acc[rounded] || 0) + 1;
        return acc;
    }, {});
};

/**
 * �����z��̊e�v�f���l�̌ܓ��������ʁA�ł��p�o����l�Ƃ��̏o���񐔂�Ԃ��֐�
 * @param {number[]} arr - �����̔z��
 * @returns {{mostFrequent: number, count: number}} - �ŕp�l�Ƃ��̌������I�u�W�F�N�g
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