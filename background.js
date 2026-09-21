
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    // Если скачивание запустили мы сами (кнопка "Скачать" в нашем просмотрщике), пропускаем
    if (downloadItem.byExtensionId === chrome.runtime.id) {
        suggest();
        return;
    }

    const filename = downloadItem.filename.toLowerCase();
    
    // Асинхронно проверяем активную вкладку, так как referrer часто бывает пустым из-за политик безопасности браузера
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        let isFromMax = false;
        
        // 1. Проверяем поля самого скачивания
        if ((downloadItem.url && downloadItem.url.includes('max.ru')) || 
            (downloadItem.referrer && downloadItem.referrer.includes('max.ru')) ||
            (downloadItem.finalUrl && downloadItem.finalUrl.includes('max.ru'))) {
            isFromMax = true;
        }
        
        // 2. Проверяем URL активной вкладки, с которой пользователь инициировал скачивание
        if (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.includes('max.ru')) {
            isFromMax = true;
        }

        // Если это не max.ru, отдаем скачивание обратно браузеру
        if (!isFromMax) {
            suggest();
            return;
        }

        // Если файл поддерживается, перехватываем
        if (filename.match(/\.(pdf|docx|xlsx|xls|png|jpeg|jpg|rtf|zip|pptx|odt|txt|csv|py|c|cpp|java|cs|go|php|rb|swift|ts|sh|json|xml|md|js|css|html|mp3|wav|ogg|mp4|webm|avi|mov|mkv)$/i)) {
            chrome.downloads.cancel(downloadItem.id, () => {
                const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(downloadItem.url)}&name=${encodeURIComponent(downloadItem.filename)}`);
                chrome.tabs.create({ url: viewerUrl });
            });
        } else {
            suggest();
        }
    });

    return true; // Указываем Chrome, что мы вызовем suggest() асинхронно
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openViewer') {
        const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(message.fileUrl)}&name=${encodeURIComponent(message.fileName)}`);
        chrome.tabs.create({ url: viewerUrl });
    }
});
