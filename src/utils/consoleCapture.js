const LOG_LIMIT = 100;
const logs = [];

let installed = false;

export function installConsoleCapture() {
    if (installed) return;
    installed = true;

    const original = {
        log: console.log,
        warn: console.warn,
        error: console.error,
    };

    function capture(level, args) {
        try {
            const entry = {
                level,
                time: new Date().toISOString(),
                message: Array.from(args).map(a => {
                    if (a instanceof Error) return `${a.message}\n${a.stack}`;
                    if (typeof a === 'object') {
                        try { return JSON.stringify(a, null, 0); }
                        catch { return String(a); }
                    }
                    return String(a);
                }).join(' '),
            };
            logs.push(entry);
            if (logs.length > LOG_LIMIT) logs.shift();
        } catch {
            // 캡쳐 실패해도 무시
        }
    }

    console.log = (...args) => { capture('log', args); original.log.apply(console, args); };
    console.warn = (...args) => { capture('warn', args); original.warn.apply(console, args); };
    console.error = (...args) => { capture('error', args); original.error.apply(console, args); };

    // 전역 에러 캡쳐
    window.addEventListener('error', (e) => {
        capture('error', [`[Uncaught] ${e.message} at ${e.filename}:${e.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (e) => {
        capture('error', [`[Unhandled Promise] ${e.reason}`]);
    });
}

export function getConsoleLogs() {
    return [...logs];
}
