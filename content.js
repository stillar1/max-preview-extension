document.addEventListener('click', (e) => {
    // Пытаемся найти ссылку, по которой кликнули (или родительский элемент ссылки)
    const target = e.target.closest('a');
    
    if (target && target.href) {
        const url = target.href;
        const urlLower = url.toLowerCase();
        
        // Проверяем, заканчивается ли ссылка на один из поддерживаемых форматов (игнорируя параметры ?...)
        if (urlLower.match(/\.(pdf|docx|xlsx|xls|png|jpeg|jpg|rtf|zip|odt|pptx|txt|csv|json|xml|md|js|css|html|py|c|cpp|java|cs|go|php|rb|swift|ts|sh)(\?.*)?$/)) {
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


// Автоматическое сохранение и открытие последнего чата
document.addEventListener('click', (e) => {
    if (e.clientX < window.innerWidth * 0.4) {
        let target = e.target.closest('a') || e.target.closest('li') || e.target.closest('[class*="chat"]') || e.target.closest('[class*="item"]');
        if (target) {
            let identifier = target.getAttribute('href') || target.getAttribute('data-id');
            if (identifier && identifier !== '#' && identifier !== '/') {
                localStorage.setItem('max_last_chat_id', identifier);
                localStorage.removeItem('max_last_chat_text');
            } else {
                let text = target.innerText.trim().split('\n')[0];
                if (text && text.length > 2 && text.length < 40) {
                    localStorage.setItem('max_last_chat_text', text);
                    localStorage.removeItem('max_last_chat_id');
                }
            }
        }
    }
}, true);

window.addEventListener('load', () => {
    setTimeout(() => {
        let id = localStorage.getItem('max_last_chat_id');
        let text = localStorage.getItem('max_last_chat_text');
        
        let target = null;
        if (id) {
            target = document.querySelector(`[href="${id}"], [data-id="${id}"]`);
        }
        
        if (!target && text) {
            // Ищем элементы с таким текстом
            let elements = document.evaluate(`//div[text()='${text}'] | //span[text()='${text}'] | //a[text()='${text}']`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < elements.snapshotLength; i++) {
                let el = elements.snapshotItem(i);
                let rect = el.getBoundingClientRect();
                if (rect.left < window.innerWidth * 0.4 && rect.width > 0) {
                    target = el;
                    break;
                }
            }
        }
        
        if (target && typeof target.click === 'function') {
            // Кликаем по самому элементу или его родителю
            let clickable = target.closest('a') || target.closest('li') || target.closest('[class*="item"]') || target;
            clickable.click();
        }
    }, 1500);
});
