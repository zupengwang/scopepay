import { spawn } from 'node:child_process';
const children = [spawn(process.execPath, ['--watch', 'server/index.mjs'], { stdio: 'inherit', env: { ...process.env, APP_ORIGIN: 'http://127.0.0.1:5173' } }), spawn('npm', ['exec', 'vite'], { stdio: 'inherit' })];
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => children.forEach(child => child.kill(signal)));
children.forEach(child => child.on('exit', code => { children.forEach(c => c.kill()); process.exit(code || 0); }));
