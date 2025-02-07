/**
 * �t�@�C���I�����Ƀt�@�C�����Ɠ��e���擾����֐�
 * @param {HTMLInputElement} fileInput - �t�@�C�����̗͂v�f
 * @param {Function} callback - �t�@�C�����Ɠ��e���󂯎��R�[���o�b�N�֐�
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

    // �t�@�C���I���C�x���g�����b�X��
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0]; // �I�����ꂽ�t�@�C��
        if (!file) {
            console.warn('No file selected');
            return;
        }

        const reader = new FileReader();

        // �t�@�C���ǂݎ�芮�����̏���
        reader.onload = () => callback(file.name, reader.result);

        // �t�@�C���ǂݎ��G���[���̏���
        reader.onerror = () => {
            console.error(`Error reading file: ${reader.error?.message || 'Unknown error'}`);
        };

        // �t�@�C�����e�L�X�g�Ƃ��ēǂݎ��
        reader.readAsText(file);
    });
};
