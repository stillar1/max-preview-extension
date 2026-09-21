chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    // Если скачивание запустили мы сами (кнопка "Скачать" в нашем просмотрщике), пропускаем
    if (downloadItem.byExtensionId === chrome.runtime.id) {
        suggest();
        return;
    }


    const filename = downloadItem.filename.toLowerCase();
    
    // Строго проверяем, что скачивание инициировано с web.max.ru или его поддоменов
    const isFromMax = (downloadItem.url && downloadItem.url.includes('max.ru')) || 
                      (downloadItem.referrer && downloadItem.referrer.includes('max.ru')) ||
                      (downloadItem.finalUrl && downloadItem.finalUrl.includes('max.ru'));
                      
    if (!isFromMax) {
        suggest();
        return;
    }

    if (filename.match(/\.(pdf|docx|xlsx|xls|png|jpeg|jpg|rtf|zip|pptx|odt|txt|csv|py|c|cpp|java|cs|go|php|rb|swift|ts|sh|json|xml|md|js|css|html|mp3|wav|ogg|mp4|webm|avi|mov|mkv)$/i)) {
        // Отменяем системное скачивание файла
        chrome.downloads.cancel(downloadItem.id, () => {
            // Открываем нашу вкладку предпросмотра
            const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(downloadItem.url)}&name=${encodeURIComponent(downloadItem.filename)}`);
            chrome.tabs.create({ url: viewerUrl });
        });
        return true; // ВАЖНО: возвращаем true, чтобы браузер ждал и не показывал диалог сохранения
    }
    
    suggest();
    return false;
});

// На всякий случай оставляем и старый слушатель сообщений, если понадобится
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openViewer') {
        const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(message.fileUrl)}&name=${encodeURIComponent(message.fileName)}`);
        chrome.tabs.create({ url: viewerUrl });
    }
});
