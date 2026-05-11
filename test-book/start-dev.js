const { spawn } = require('child_process');
const open = require('open');

// Next.js 개발 서버 시작
const nextDev = spawn('npm', ['run', 'dev-only'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
});

// 1초 후 크롬에서 localhost:3000 열기
setTimeout(async () => {
  try {
    await open('http://localhost:3000', { app: 'chrome' });
  } catch (err) {
    // 크롬이 없으면 기본 브라우저로 열기
    try {
      await open('http://localhost:3000');
    } catch (e) {
      console.error('Failed to open browser');
    }
  }
}, 1000);

nextDev.on('error', (err) => {
  console.error('Failed to start Next.js dev server:', err);
  process.exit(1);
});
