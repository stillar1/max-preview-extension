document.addEventListener('click', (e) => {
    // Пытаемся найти ссылку, по которой кликнули (или родительский элемент ссылки)
    const target = e.target.closest('a');
    
    if (target && target.href) {
        const url = target.href;
        const urlLower = url.toLowerCase();
        
        // Проверяем, заканчивается ли ссылка на один из поддерживаемых форматов (игнорируя параметры ?...)
        if (urlLower.match(/\.(pdf|docx|xlsx|xls|png|jpeg|jpg)(\?.*)?$/)) {
            e.preventDefault();
            e.stopPropagation();
            
            // Пытаемся достать имя файла из текста ссылки или из самого URL
            const fileName = target.innerText.trim() || url.split('/').pop().split('?')[0];
            
            // Отправляем сообщение в background script для открытия вкладки
            chrome.runtime.sendMessage({
                action: 'openViewer',
                fileUrl: url,
                fileName: fileName
            });
        }
    }
}, true); // Используем capture phase, чтобы перехватить клик до того, как его обработает React/Vue
