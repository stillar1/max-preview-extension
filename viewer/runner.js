window.addEventListener('message', async (event) => {
    // Only accept messages from the extension
    if (event.source !== window.parent) return;

    const { action, code, lang, messageId } = event.data;
    
    if (action === 'runCode') {
        let output = '';
        
        function sendOutput(text, isError = false) {
            output += text;
            window.parent.postMessage({
                action: 'runCodeResult',
                messageId: messageId,
                output: output,
                isError: isError,
                done: false
            }, '*');
        }

        if (lang === 'js') {
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            console.log = (...args) => sendOutput(args.join(' ') + '\n');
            console.error = (...args) => sendOutput(args.join(' ') + '\n', true);
            console.warn = (...args) => sendOutput(args.join(' ') + '\n', true);
            
            try {
                // Execute JS
                // We use eval so it runs in local context. Since this is a sandboxed iframe, it is safe.
                eval(code);
            } catch (e) {
                sendOutput(e.toString() + '\n', true);
            } finally {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
                
                window.parent.postMessage({
                    action: 'runCodeResult',
                    messageId: messageId,
                    output: output,
                    isError: false,
                    done: true
                }, '*');
            }
        } else if (lang === 'py') {
            function builtinRead(x) {
                if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
                    throw "File not found: '" + x + "'";
                return Sk.builtinFiles["files"][x];
            }
            
            Sk.pre = "output";
            Sk.configure({
                output: (text) => sendOutput(text),
                read: builtinRead
            });
            
            try {
                await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, code, true));
                window.parent.postMessage({
                    action: 'runCodeResult',
                    messageId: messageId,
                    output: output,
                    isError: false,
                    done: true
                }, '*');
            } catch (e) {
                sendOutput(e.toString() + '\n', true);
                window.parent.postMessage({
                    action: 'runCodeResult',
                    messageId: messageId,
                    output: output,
                    isError: true,
                    done: true
                }, '*');
            }
        }
    }
});
