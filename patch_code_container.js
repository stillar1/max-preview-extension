const fs = require('fs');

let html = fs.readFileSync('viewer/viewer.html', 'utf8');

if (!html.includes('code-container')) {
    html = html.replace('</head>', '    <link href="libs/highlight/github.min.css" rel="stylesheet">\n</head>');
    html = html.replace('</body>', '    <script src="libs/highlight/highlight.min.js"></script>\n</body>');
    
    html = html.replace(
        '<div id="text-container"',
        `<div id="code-container" style="display:none; width: 100%; height: 100%; overflow: auto; background: #fff; padding: 20px; box-sizing: border-box; font-family: monospace; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 id="code-title" style="margin: 0; font-family: sans-serif;">Исходный код</h3>
                <button id="runCodeBtn" style="display:none; padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-weight: bold;">▶ Запустить</button>
            </div>
            <pre style="margin: 0; padding: 15px; background: #f6f8fa; border-radius: 6px; overflow: auto; border: 1px solid #d0d7de;"><code id="code-content" style="font-size: 14px; line-height: 1.5; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;"></code></pre>
            
            <div id="code-output-wrapper" style="display:none; margin-top: 20px;">
                <div style="font-family: sans-serif; font-weight: bold; margin-bottom: 8px; color: #333;">Вывод (Console):</div>
                <pre id="code-output" style="margin: 0; padding: 15px; background: #1e1e1e; color: #d4d4d4; border-radius: 6px; overflow: auto; font-size: 14px; line-height: 1.5; font-family: 'SFMono-Regular', Consolas, monospace; min-height: 100px; max-height: 300px; white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>
            <iframe id="code-runner-iframe" src="runner.html" style="display:none;"></iframe>
        </div>
        <div id="text-container"`
    );
    fs.writeFileSync('viewer/viewer.html', html);
    console.log("Patched viewer.html");
}

let js = fs.readFileSync('viewer/viewer.js', 'utf8');
if (!js.includes("code-container")) {
    js = js.replace(/\[([^\]]+)\]\.forEach/, (m, p1) => {
        if (!p1.includes('code-container')) return `[${p1}, 'code-container'].forEach`;
        return m;
    });

    const codeExts = "['py','js','c','cpp','java','cs','go','php','rb','swift','ts','sh','html','css','xml','json','md']";
    
    // Update ext matching
    js = js.replace(/} else if \(\['txt','csv','json','xml','md','js','css','html'\].includes\(ext\)\) {/, `} else if (${codeExts}.includes(ext) || ext === 'txt' || ext === 'csv') {`);
    
    const codeRenderCode = `
            if (${codeExts}.includes(ext)) {
                loadingEl.style.display = 'none';
                const container = document.getElementById('code-container');
                container.style.display = 'block';
                
                const codeContent = await blob.text();
                const codeEl = document.getElementById('code-content');
                codeEl.textContent = codeContent;
                codeEl.className = 'language-' + ext;
                
                document.getElementById('code-title').textContent = 'Исходный код (' + ext + ')';
                
                // Highlight syntax
                if (window.hljs) {
                    hljs.highlightElement(codeEl);
                }
                
                // Setup Run Button
                const runBtn = document.getElementById('runCodeBtn');
                const outputWrapper = document.getElementById('code-output-wrapper');
                const outputEl = document.getElementById('code-output');
                const iframe = document.getElementById('code-runner-iframe');
                
                outputWrapper.style.display = 'none';
                outputEl.textContent = '';
                
                if (ext === 'js' || ext === 'py') {
                    runBtn.style.display = 'block';
                    runBtn.onclick = () => {
                        outputWrapper.style.display = 'block';
                        outputEl.textContent = 'Выполнение...\\n';
                        outputEl.style.color = '#d4d4d4';
                        
                        // Send message to sandboxed iframe
                        iframe.contentWindow.postMessage({
                            action: 'runCode',
                            code: codeContent,
                            lang: ext,
                            messageId: Date.now()
                        }, '*');
                    };
                    
                    // Listen for results
                    window.addEventListener('message', (event) => {
                        if (event.source !== iframe.contentWindow) return;
                        if (event.data.action === 'runCodeResult') {
                            outputEl.textContent = event.data.output || '(нет вывода)\\n';
                            if (event.data.isError) {
                                outputEl.style.color = '#ff5555';
                            } else {
                                outputEl.style.color = '#d4d4d4';
                            }
                            // Auto scroll to bottom
                            outputEl.scrollTop = outputEl.scrollHeight;
                        }
                    });
                    
                } else {
                    runBtn.style.display = 'none';
                }
                
            } else if (['txt','csv'].includes(ext)) {
                loadingEl.style.display = 'none';
                const container = document.getElementById('text-container');
                container.style.display = 'block';
                container.textContent = await blob.text();
    `;
    
    const targetStr = `            loadingEl.style.display = 'none';
            const container = document.getElementById('text-container');
            container.style.display = 'block';
            container.textContent = await blob.text();`;
            
    js = js.replace(targetStr, codeRenderCode);
    
    // Add to web_accessible_resources in manifest
    let manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    manifest.web_accessible_resources[0].resources.push("viewer/runner.html");
    manifest.web_accessible_resources[0].resources.push("viewer/runner.js");
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));

    fs.writeFileSync('viewer/viewer.js', js);
    console.log("Patched viewer.js");
}
