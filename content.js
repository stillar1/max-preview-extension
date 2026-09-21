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





// Вспомогательная функция для получения точного CSS пути элемента
function getCssPath(el) {
    if (!(el instanceof Element)) return '';
    let path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
            }
            if (nth !== 1 || el.nextElementSibling) selector += ":nth-of-type("+nth+")";
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}

// Запоминаем последний клик в левой части экрана (список чатов)
document.addEventListener('click', (e) => {
    // Сохраняем время клика для background.js (перехват скачиваний)
    chrome.storage.local.set({ max_last_click: Date.now() });

    // Обрабатываем авто-открытие чата
    if (e.clientX < window.innerWidth * 0.45) {
        // Ищем осмысленный элемент
        let target = e.target.closest('a') || e.target.closest('li') || e.target.closest('[class*="item"]') || e.target;
        
        let path = getCssPath(target);
        if (path) {
            localStorage.setItem('max_last_chat_path', path);
        }
        
        let text = target.innerText ? target.innerText.trim().split('\n')[0] : '';
        if (text && text.length > 2 && text.length < 40) {
            localStorage.setItem('max_last_chat_text', text);
        }
    }
}, true);

// Восстанавливаем при загрузке
window.addEventListener('load', () => {
    // Повторяем попытки клика, так как React/Vue могут рендериться с задержкой
    let attempts = 0;
    let interval = setInterval(() => {
        attempts++;
        if (attempts > 10) { // 10 попыток по 500мс = 5 секунд
            clearInterval(interval);
            return;
        }
        
        let path = localStorage.getItem('max_last_chat_path');
        let text = localStorage.getItem('max_last_chat_text');
        let target = null;
        
        if (path) {
            try { target = document.querySelector(path); } catch (e) {}
        }
        
        if (!target && text) {
            let elements = document.evaluate(`//div[text()='${text}'] | //span[text()='${text}']`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (elements.snapshotLength > 0) {
                target = elements.snapshotItem(0);
            }
        }
        
        if (target) {
            let clickable = target.closest('a') || target.closest('li') || target.closest('[class*="item"]') || target;
            clickable.click();
            clearInterval(interval);
        }
    }, 500);
});
