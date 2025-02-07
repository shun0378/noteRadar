let radarChart = null;
const createRadarChart = (data, canvasId, chartType) => {

    const labels = Object.keys(data);
    const values = Object.values(data);

    const ctx = document.getElementById(canvasId).getContext('2d');

    if (!radarChart) {
        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '',
                    data: values,
                    backgroundColor: 'rgba(' + chartType + ',0.2)',
                    borderColor: 'rgba(' + chartType + ',1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    r: {
                        max: 10,
                        min: -2,
                        ticks: {
                            stepSize: 10,
                            display: false
                        },
                        grid: {
                            display: true
                        },
                        startAngle: 0
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } else {
        radarChart.data.labels = labels;
        radarChart.data.datasets[0].data = values;
        radarChart.data.datasets[0].backgroundColor = 'rgba(' + chartType + ',0.2)'
        radarChart.data.datasets[0].borderColor = 'rgba(' + chartType + ',1)'
        radarChart.update();
    }
};

// 画面表示関連
// パラメータを表示
const displayParametersWithUnits = (parameter, units, tjaName) => {
    const container = document.getElementById('paramSpace');
    if (!container) {
        return;
    }

    const calcParameter = processObjectEntries(
        parameter,
        value => Number((value).toFixed(3))
    );
    container.innerHTML = '';

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const header1 = document.createElement('th');
    const header2 = document.createElement('th');
    header1.textContent = 'songName';
    header2.textContent = tjaName.split('.tja')[0];
    header1.style.border = '1px solid #ddd';
    header1.style.padding = '8px';
    header2.style.border = '1px solid #ddd';
    header2.style.padding = '8px';
    headerRow.appendChild(header1);
    headerRow.appendChild(header2);

    Object.keys(calcParameter).forEach(key => {
        const value = calcParameter[key];

        const row = table.insertRow();

        const labelCell = row.insertCell();
        labelCell.textContent = key;

        const valueCell = row.insertCell();
        valueCell.textContent = value + ' ' + units[key];

        labelCell.style.border = '1px solid #ddd';
        labelCell.style.padding = '8px';
        valueCell.style.border = '1px solid #ddd';
        valueCell.style.padding = '8px';
    });

    container.appendChild(table);
}

/**
 * オブジェクトのすべてのキーと値を指定した変換関数で処理する関数
 * 
 * @param {Object} obj - 対象のオブジェクト
 * @param {Function} transformValue - 値を変換するための関数
 * @returns {Object} - 変換後の新しいオブジェクト
 */
const processObjectEntries = (obj, transformValue) => {
    const processedObject = {};
    for (const [key, value] of Object.entries(obj)) {
        processedObject[key] = transformValue(value);
    }
    return processedObject;
};
