// �萔
const VALID_NOTE_TYPES = /[1-4]/;
const ALL_NOTE_TYPES = /[0-9]/;
const SEPARATOR_NOTE = ',';
const EMPTY_NOTE_TYPE = 0;
const INVALID_NOTE_TYPES = /[056789]/;
const NOTE_INTERVAL_CALC_CONSTANT = 240;

/**
 * TJA�̃e�L�X�g���X�R�A�f�[�^�ɕϊ�����֐��B
 *
 * @param {string[]} cleanTja - ���s�����ƃR�����g��������TJA�t�@�C���s�̔z��
 * @returns {Array<Array<Array<Map<string, string>>>>>} - ���ʂ̏ڍ׃f�[�^
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
 * TJA��#START��#END�̊Ԃ̃Z�O�����g�𒊏o����B
 *
 * @param {string[]} cleanTja - ���s�����ƃR�����g��r����TJA�t�@�C���s�̔z��
 * @returns {string[][]} - �e�`���[�g�����̃Z�O�����g�z��
 */
const clippingTja = (cleanTja) => {
    const startIndices = getAllIndices(cleanTja, /^#START$/);
    const endIndices = processArrays(startIndices, getAllIndices(cleanTja, /^#END$/));

    return startIndices.map((startIndex, i) => cleanTja.slice(startIndex + 1, endIndices[i]));
};

/**
 * ���ʍs�ɉ��������������s���A�m�[�c�̏ڍ׏��𐶐��B
 *
 * @param {string[]} score - 1�̓�Փx�ɑΉ����镈�ʍs
 * @param {Object} noteStatus - ���݂̃m�[�c�̃X�e�[�^�X���
 * @returns {Array<Map<string, string>>} - �m�[�c�̏ڍ׏��
 */
const generateNoteStatus = (score, noteStatus) =>
    score.flatMap(line =>
        line.includes('#')
            ? processCommand(line, noteStatus) || []
            : processNotes(line, noteStatus)
    );

/**
 * �R�}���h�s���������AnoteStatus���X�V�B
 *
 * @param {string} commandLine - �R�}���h�s
 * @param {Object} noteStatus - ���݂̃m�[�c�̃X�e�[�^�X���
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
 * �m�[�c�s���������ďڍ׏��𐶐��B
 *
 * @param {string} notesLine - ���ʂ�1�s
 * @param {Object} noteStatus - ���݂̃m�[�c�̃X�e�[�^�X���
 * @returns {Array<Map<string, string>>} - �m�[�c�ڍ׏��
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
 * �e���߂��ƂɃm�[�c�𕪊��B
 *
 * @param {Array<Map<string, string>>} scoreDetails - ���ʂ̃m�[�c�ڍ�
 * @returns {Array<Array<Map<string, string>>>} - ���߂��Ƃɕ������ꂽ�m�[�c
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
 * ���߂��Ƃ̃m�[�c�z��ɃC���^�[�o����ݒ肷��֐��B
 *
 * @param {Array<Array<Map<string, string>>>} measures - �m�[�c��񂪊i�[���ꂽ�z��
 * @returns {Array<Array<Map<string, string>>>} - �C���^�[�o�����������ݒ肳�ꂽ�z��
 */
const generateInterval = (measures) => {
    let lastNoteIndex = null; // �Ō�ɏ������ꂽ�m�[�g�̃C���f�b�N�X
    let intervalAccumulator = 0; // �ݐσC���^�[�o������

    measures.forEach((measure, measureIndex) => {
        if (measure.length > 0) {
            measure.forEach((note, noteIndex) => {
                const { noteType, bpm, measureWidth } = note;
                const beatCount = measure.length; // ���ߓ��̃m�[�g��

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
 * interval���v�Z�B
 *
 * @param {number} bpm - �m�[�c��BPM
 * @param {number} beat - ���߂̕�����
 * @param {number} measureWidth - ���߂̒���
 * @returns {number} - �v�Z���ꂽ�C���^�[�o��
 */
const calculateInterval = (bpm, beat, measureWidth) =>
    (NOTE_INTERVAL_CALC_CONSTANT / bpm / beat) * measureWidth;

/**
 * �m�[�c��type��0�̂��̂��폜�B
 *
 * @param {Array<Array<Map<string, string>>>} measures - �m�[�c�̏��ߔz��
 * @returns {Array<Array<Map<string, string>>>} - �폜��̃m�[�c���ߔz��
 */
const removeInvalidNote = (measures) =>
    measures.map(measure => measure.filter(note => VALID_NOTE_TYPES.test(note.noteType)));

/**
 * �l�����l�������؁B
 *
 * @param {string} value - ���؂���l
 * @param {string} errorMessage - �G���[���b�Z�[�W
 * @returns {number} - ���؍ς݂̐��l
 */
const validateNumber = (value, errorMessage) => {
    const number = parseFloat(value);
    if (isNaN(number)) throw new Error(errorMessage);
    return number;
};


/**
 * �z��a�Ɣz��b�̓��v�f���r���Aa�̒l��b�̒l���傫���ꍇ��b�̊Y���v�f���폜����֐�
 * 
 * �����菇:
 *  0. a��b���ꂼ��̃C���f�b�N�X(i, j)��0�ŏ���������B
 *  1. a[i]��b[j]���r����B
 *     - a[i] < b[j] �܂��� a[i] === b[j] �̏ꍇ�A���������ɗ����̃C���f�b�N�X��1���₷�B
 *     - a[i] > b[j] �̏ꍇ�Ab[j]���폜���A�z��b���l�߂�B�C���f�b�N�X�͑��₳�Ȃ��B
 *  2. ���̏�����a�̒����������J��Ԃ��B
 * 
 * @param {number[]} a - ��r�̊�ƂȂ�z��i��: [17, 116, 403, 501, 599]�j
 * @param {number[]} b - �����Ώۂ̔z��i��: [107, 206, 303, 395, 493, 591, 689]�j
 * @returns {number[]} - ������̔z��b�i��: [107, 206, 493, 591, 689]�j
 */
const processArrays = (a, b) => {
    let i = 0, j = 0;
    // a�̒��������[�v�Bb�͍폜�ɂ�蒷�����Z���Ȃ�\��������̂ŁAj�������Ɋ܂߂�B
    while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) {
            // a�̗v�f��b�̗v�f�ȉ��̏ꍇ�A�����̃C���f�b�N�X�𑝂₷
            i++;
            j++;
        } else {
            // a�̗v�f��b�̗v�f���傫���ꍇ�Ab[j]���폜���Ĕz����l�߂�
            b.splice(j, 1);
            // �C���f�b�N�X�͂��̂܂܁i�폜�ɂ�莟�̗v�f��j�Ԗڂɗ��邽�߁j
        }
    }
    return b;
};

/**
 * 4/4�̂悤�Ȕ��q��\����������v�Z���Ƃ��Čv�Z����֐�
 * @param {string} measureString - 4/4�̂悤�Ȕ��q��\�������� 
 * @returns �����̕�������v�Z��������
 */
const parseMeasure = (measureString) => {
    const [numerator, denominator] = measureString.split('/').map(Number);
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        throw new Error(`Invalid measure value: ${measureString}`);
    }
    return numerator / denominator;
};

/**
*  �R�}���h���ݒ肳��Ă��镶������擾���A�R�}���h���Őݒ肳�ꂽ�l���擾����
* @param {string} line - �����s
* @param {string} command - �w�b�_�[��#����n�܂閽��
* @returns {String} - �R�}���h���Őݒ肳�ꂽ�l
*/
const getCommandValue = (line, command) =>
    modifyString(line, command, 'remove');

/**
 * �^����ꂽ���K�\���Ƀ}�b�`����z�񒆂̗v�f�̂��ׂẴC���f�b�N�X����������֐��B
 * �z��̕������v�̍s�������͂��ׂĂ��̊֐���p����B
 * 
 * @param {string[]} array - �����Ώۂ̔z��D
 * @param {RegExp|string} regex - ���K�\���C���邢�̓}�b�`���镶����D
 * @returns {number[]} - ��v�����C���f�b�N�X�̔z��B
 */
const getAllIndices = (array, regex) => array
    .map((element, index) => (element.search(regex) > -1 ? index : -1))
    .filter(index => index !== -1);