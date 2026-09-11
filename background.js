chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    // Если скачивание запустили мы сами (кнопка "Скачать" в нашем просмотрщике), пропускаем
    if (downloadItem.byExtensionId === chrome.runtime.id) {
        suggest();
        return;
    }

    const filename = downloadItem.filename.toLowerCase();
    
    // Проверяем расширение файла
    if (filename.match(/\.(pdf|docx|xlsx|xls|png|jpeg|jpg)$/i)) {
        // Отменяем системное скачивание файла
        chrome.downloads.cancel(downloadItem.id, () => {
            // Открываем нашу вкладку предпросмотра
            const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(downloadItem.url)}&name=${encodeURIComponent(downloadItem.filename)}`);
            chrome.tabs.create({ url: viewerUrl });
        });
    }
    
    suggest();
});

// На всякий случай оставляем и старый слушатель сообщений, если понадобится
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openViewer') {
        const viewerUrl = chrome.runtime.getURL(`viewer/viewer.html?url=${encodeURIComponent(message.fileUrl)}&name=${encodeURIComponent(message.fileName)}`);
        chrome.tabs.create({ url: viewerUrl });
    }
});
