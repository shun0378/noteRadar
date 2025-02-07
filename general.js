/**
 * ��������w�肵������Ɋ�Â��ĕύX����֐��B
 * ������̍폜�͂��ׂĂ��̊֐���p����B
 * 
 * @param {string} str ����Ώۂ̕�����
 * @param {string} target �폜�ΏۂƂȂ镶����
 * @param {string} mode ���샂�[�h�B'remove'�A'removeBefore'�A'removeAfter' �̂����ꂩ
 * @returns {string} �����̕�����
 * @throws {Error} ������ mode ���w�肳�ꂽ�ꍇ
 */
const modifyString = (str, target, mode) => ({
    remove: () => str.replace(target, ''),
    removeBefore: () => str.slice(str.indexOf(target) + target.length),
    removeAfter: () => str.slice(0, str.indexOf(target))
})[mode] ? str.indexOf(target) !== -1 ? ({
    remove: () => str.replace(target, ''),
    removeBefore: () => str.slice(str.indexOf(target) + target.length),
    removeAfter: () => str.slice(0, str.indexOf(target))
})[mode]() : str : (() => { throw new Error('Invalid mode'); })();

/**
 *  �R�}���h���Őݒ肳�ꂽ�l���������Ă��ׂĎ擾����
 * @param {string[]} cleanTja - ���s�����ƃR�����g��r����TJA�t�@�C���s�̔z��D
 * @param {string} command - �w�b�_�[��#����n�܂閽��
 * @returns {String[]} - �R�}���h���Őݒ肳�ꂽ�l
 */
const searchCommandValue = (cleanTja, command) =>
    getAllIndices(cleanTja, command)
        .map(index => getCommandValue(cleanTja[index], command));