
        window.cleanLuckysheetCopy = function(html) {
            try {
                const div = document.createElement('div');
                div.innerHTML = html;
                let text = '';
                const rows = div.querySelectorAll('tr');
                for (let r = 0; r < rows.length; r++) {
                    const cols = rows[r].querySelectorAll('td, th');
                    let rowText = [];
                    for (let c = 0; c < cols.length; c++) {
                        let cellText = cols[c].innerText || cols[c].textContent || '';
                        // Remove newlines inside cells or replace them with spaces
                        cellText = cellText.replace(/\r\n|\n|\r/gm, ' ');
                        rowText.push(cellText);
                    }
                    text += rowText.join('\t') + (r < rows.length - 1 ? '\n' : '');
                }
                return text;
            } catch(e) {
                return html; // Fallback
            }
        };

        window.addEventListener('message', (event) => {
            if (event.data.action === 'loadExcel') {
                if (window.luckysheet) {
                    try { window.luckysheet.destroy(); } catch(e) {}
                    window.luckysheet.create({
                        container: 'luckysheet',
                        data: event.data.sheets,
                        title: event.data.title,
                        userInfo: event.data.userInfo,
                        showinfobar: false,
                        lang: 'en'
                    });
                }
            }
        });
        
        window.parent.postMessage({ action: 'iframeReady' }, '*');
