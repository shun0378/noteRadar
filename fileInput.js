/**
 * ファイル選択時にファイル名と内容を取得する関数
 * @param {HTMLInputElement} fileInput - ファイル入力の要素
 * @param {Function} callback - ファイル名と内容を受け取るコールバック関数
 */
const setupFileInputListener = (fileInput, callback) => {
    if (!(fileInput instanceof HTMLInputElement)) {
        console.error('Invalid file input element');
        return;
    }

    if (typeof callback !== 'function') {
        console.error('Callback must be a function');
        return;
    }

    // ファイル選択イベントをリッスン
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0]; // 選択されたファイル
        if (!file) {
            console.warn('No file selected');
            return;
        }

        const reader = new FileReader();

        // ファイル読み取り完了時の処理
        reader.onload = () => callback(file.name, reader.result);

        // ファイル読み取りエラー時の処理
        reader.onerror = () => {
            console.error(`Error reading file: ${reader.error?.message || 'Unknown error'}`);
        };

        // ファイルをテキストとして読み取る
        reader.readAsText(file);
    });
};
