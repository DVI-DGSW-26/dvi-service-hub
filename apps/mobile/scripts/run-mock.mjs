// pnpm run:mock — 목업 웹(apps/web, 5174)을 띄우고 앱을 거기에 붙여 실행한다. 웹을 고치면 앱도 바로 바뀐다.
// 5173 은 평소 띄워 두는 pnpm dev 몫이라 비켜 간다. 뒤에 붙인 인자는 cap run 으로 간다(예: pnpm run:mock --target emulator-5554).
// Ctrl+C 로 끝내면 웹 서버를 끄고 앱 설정을 운영 주소로 되돌린다(cap sync).
import { spawn } from 'node:child_process'

const PORT = '5174'
const URL = `http://127.0.0.1:${PORT}/`
const run = (command, stdin = 'inherit') => spawn(command, { stdio: [stdin, 'inherit', 'inherit'], shell: true })
// shell 로 띄웠으니 손자 프로세스(vite · gradle)까지 끈다
const stop = (child) => {
  if (child.exitCode !== null) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGINT')
}
const answers = () => fetch(URL).then(() => true, () => false)

// 이미 무언가 그 포트에서 답하면 아래 '뜰 때까지 기다리기'가 그걸 우리 서버로 안다 — 먼저 막는다
if (await answers()) {
  console.error(`${PORT} 포트를 이미 다른 프로그램이 쓰고 있습니다. 그 프로그램을 끄고 다시 실행하세요.`)
  process.exit(1)
}

// 웹 서버는 자판을 받지 않게(stdin ignore) — cap 의 기기 고르기 질문이 자판을 받아야 한다
const web = run(`pnpm --filter @dvi/web exec vite --mode mock --host 127.0.0.1 --port ${PORT} --strictPort`, 'ignore')

// 웹이 뜬 뒤에 앱을 띄운다 — 웹이 못 뜨면 앱 설정을 건드리기 전에 끝난다
let up = false
while (!up && web.exitCode === null) {
  up = await answers()
  if (!up) await new Promise((r) => setTimeout(r, 300))
}
if (!up) {
  console.error(`\n목업 웹 서버가 뜨지 않았습니다. ${PORT} 포트를 다른 프로그램이 쓰는지 확인하세요.`)
  process.exit(1)
}

// 앱 기기에서 127.0.0.1:5174 가 PC 로 이어진다(adb reverse)
const extra = process.argv.slice(2).join(' ')
const app = run(`cap run android -l --host 127.0.0.1 --port ${PORT} --forwardPorts ${PORT}:${PORT} ${extra}`)

// Ctrl+C 는 같은 창의 cap · vite 에도 간다 — 여기서는 cap 이 끝나길 기다렸다가 정리한다
process.on('SIGINT', () => {})
web.on('exit', () => stop(app))
app.on('exit', (code) => {
  stop(web)
  // cap 이 어떻게 끝났든(기기 고르기에서 끊김 · 웹이 먼저 꺼짐) 앱 설정은 운영 주소로 — 이미 깔린 앱은 그대로 PC 를 본다
  run('cap sync android', 'ignore').on('exit', () => {
    console.log('\n앱 설정을 운영 주소로 되돌렸습니다. 기기의 앱을 운영 허브로 돌리려면 pnpm run run 으로 다시 까세요.')
    process.exit(code ?? 0)
  })
})
