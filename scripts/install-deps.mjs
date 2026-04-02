import { execSync } from 'child_process';

console.log('[v0] Installing web-push packages...');
execSync('pnpm add web-push', { cwd: '/vercel/share/v0-project', stdio: 'inherit' });
execSync('pnpm add -D @types/web-push', { cwd: '/vercel/share/v0-project', stdio: 'inherit' });
console.log('[v0] Done.');
