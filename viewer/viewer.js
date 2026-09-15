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
            container.style.display = 'block';
            
            const file = new File([blob], fileName, {type: mimeType});
            LuckyExcel.transformExcelToLucky(file, function(exportJson, luckysheetfile){
                if(exportJson.sheets == null || exportJson.sheets.length == 0){
                    throw new Error("Ошибка чтения excel файла!");
                }
                
                window.luckysheet.destroy();
                window.luckysheet.create({
                    container: 'luckysheet', // container id
                    data: exportJson.sheets,
                    title: (exportJson.info && exportJson.info.name) ? exportJson.info.name : fileName,
                    userInfo: (exportJson.info && exportJson.info.creator) ? exportJson.info.creator : '',
                    showinfobar: false,
                    lang: 'ru'
                });
            });
        } else {
            throw new Error("Неподдерживаемый формат: " + ext);
        }
    } catch (e) {
        console.error(e);
        loadingEl.innerHTML = `<span style="color:red; font-weight:bold;">Ошибка:</span><br>${e.message}`;
    }
}

// Запускаем файл сразу без кнопки
loadFile();
