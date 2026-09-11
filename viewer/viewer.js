const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('url');
let fileName = urlParams.get('name') || 'Document';

const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
let ext = extMatch ? extMatch[1].toLowerCase() : '';
if (!ext) {
    const urlExtMatch = fileUrl.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
    if (urlExtMatch) ext = urlExtMatch[1].toLowerCase();
}

document.getElementById('fileName').textContent = fileName;

document.getElementById('downloadBtn').addEventListener('click', () => {
    chrome.downloads.download({ url: fileUrl, filename: fileName });
});

async function loadFile() {
    const loadingEl = document.getElementById('loading');
    try {
        if (fileUrl.startsWith('blob:')) {
            throw new Error("Файл зашифрован (blob).");
        }
        
        loadingEl.innerHTML = `Загрузка файла...`;
        
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("HTTP " + response.status);
        
        // ПРИНУДИТЕЛЬНО задаем правильный MIME-тип
        let mimeType = 'application/octet-stream';
        if (ext === 'pdf') mimeType = 'application/pdf';
        if (ext === 'png') mimeType = 'image/png';
        if (ext === 'jpeg' || ext === 'jpg') mimeType = 'image/jpeg';
        if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
        
        const rawBlob = await response.blob();
        const blob = new Blob([rawBlob], { type: mimeType });
        
        loadingEl.style.display = 'none';

        if (ext === 'pdf') {
            const container = document.getElementById('pdf-container');
            container.src = URL.createObjectURL(blob);
            container.style.display = 'block';
        } else if (ext === 'png' || ext === 'jpeg' || ext === 'jpg') {
            const container = document.getElementById('img-container');
            document.getElementById('img-preview').src = URL.createObjectURL(blob);
            container.style.display = 'block';
        } else if (ext === 'docx') {
            const container = document.getElementById('docx-container');
            container.style.display = 'block';
            await docx.renderAsync(blob, container);
        } else if (ext === 'xlsx' || ext === 'xls') {
            const container = document.getElementById('excel-container');
            container.style.display = 'flex';
            const arrayBuffer = await blob.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            renderExcel(workbook);
        } else {
            throw new Error("Неподдерживаемый формат: " + ext);
        }
    } catch (e) {
        console.error(e);
        loadingEl.innerHTML = `<span style="color:red; font-weight:bold;">Ошибка:</span><br>${e.message}`;
    }
}

function renderExcel(workbook) {
    const tabsContainer = document.getElementById('excel-tabs');
    const gridContainer = document.getElementById('excel-grid');
    let tabulatorInstance = null;

    workbook.SheetNames.forEach((sheetName, index) => {
        const tab = document.createElement('div');
        tab.className = 'excel-tab' + (index === 0 ? ' active' : '');
        tab.textContent = sheetName;
        tab.addEventListener('click', () => {
            document.querySelectorAll('.excel-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadSheet(sheetName);
        });
        tabsContainer.appendChild(tab);
    });

    function loadSheet(sheetName) {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (json.length === 0) {
            if (tabulatorInstance) tabulatorInstance.destroy();
            gridContainer.innerHTML = '<div style="padding: 20px;">Пустой лист</div>';
            return;
        }

        let headers = json[0];
        let data = json.slice(1);
        let maxCols = 0;
        json.forEach(row => { if (row.length > maxCols) maxCols = row.length; });
        
        const columns = [];
        for (let i = 0; i < maxCols; i++) {
            const titleText = headers[i] !== undefined && headers[i] !== "" ? String(headers[i]) : "Колонка " + (i+1);
            columns.push({ title: titleText, field: "col" + i, headerFilter: "input", widthGrow: 1 });
        }
        
        const tableData = data.map(row => {
            const rowData = {};
            for (let i = 0; i < maxCols; i++) { rowData["col" + i] = row[i]; }
            return rowData;
        });

        if (tabulatorInstance) tabulatorInstance.destroy();
        tabulatorInstance = new Tabulator(gridContainer, { data: tableData, columns: columns, layout: "fitDataFill", height: "100%", placeholder: "Нет данных" });
    }
    if (workbook.SheetNames.length > 0) loadSheet(workbook.SheetNames[0]);
}

// Запускаем файл сразу без кнопки
loadFile();
