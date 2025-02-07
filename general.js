/**
 * 文字列を指定した操作に基づいて変更する関数。
 * 文字列の削除はすべてこの関数を用いる。
 * 
 * @param {string} str 操作対象の文字列
 * @param {string} target 削除対象となる文字列
 * @param {string} mode 操作モード。'remove'、'removeBefore'、'removeAfter' のいずれか
 * @returns {string} 操作後の文字列
 * @throws {Error} 無効な mode が指定された場合
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
 *  コマンド内で設定された値を検索してすべて取得する
 * @param {string[]} cleanTja - 改行文字とコメントを排したTJAファイル行の配列．
 * @param {string} command - ヘッダーと#から始まる命令
 * @returns {String[]} - コマンド内で設定された値
 */
const searchCommandValue = (cleanTja, command) =>
    getAllIndices(cleanTja, command)
        .map(index => getCommandValue(cleanTja[index], command));