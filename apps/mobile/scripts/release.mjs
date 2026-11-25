// pnpm release <버전> "<바뀐 점>" ["<바뀐 점>" ...] — 앱 껍데기(아이콘 · 플러그인 · Java)를 바꾼 뒤 새 버전을 낸다.
//   예: pnpm release 1.1.0 "알림을 앱에서 받기"
// 서명된 APK 를 허브에 올릴 자리(apps/web/public/app)에 두고, 업데이트 기록(releases.json) 맨 앞에 이 버전을 적는다.
// dev 에 올리면(운영 배포) 앱이 다음 실행 때 새 버전을 알아채고, 업데이트를 누르면 스스로 바뀐다(AppUpdatePlugin · 웹 features/app-release).
// 화면 · 기능(웹)만 바꿨으면 이것은 필요 없다 — 앱이 허브를 그대로 띄워 웹 배포만으로 바뀐다.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const gradle = join(root, 'android/app/build.gradle')
const out = join(root, '../web/public/app')

if (!existsSync(join(homedir(), '.dvi-keys/dvi-service-hub.properties'))) {
  console.error('서명 키(~/.dvi-keys/dvi-service-hub.properties)가 없습니다. 이 키로 서명한 APK 만 이미 깔린 앱 위에 깔립니다.')
  process.exit(1)
}

const [name, ...notes] = process.argv.slice(2)
const history = existsSync(join(out, 'releases.json')) ? JSON.parse(readFileSync(join(out, 'releases.json'), 'utf8')) : []
const semver = (v) => v.split('.').map(Number)
const newer = (a, b) => { const [x, y] = [semver(a), semver(b)]; const i = x.findIndex((n, k) => n !== y[k]); return i >= 0 && x[i] > y[i] }
if (!/^\d+\.\d+\.\d+$/.test(name ?? '') || !notes.length) {
  console.error('쓰는 법: pnpm release <버전 x.y.z> "<바뀐 점>" ["<바뀐 점>" ...]')
  process.exit(1)
}
if (history[0] && !newer(name, history[0].versionName)) {
  console.error(`버전은 지난 버전(${history[0].versionName})보다 커야 합니다.`)
  process.exit(1)
}

const before = readFileSync(gradle, 'utf8')
// 앱이 새 버전인지 가리는 번호 — 사람이 읽는 버전과 따로 하나씩 오른다
const code = Math.max(Number(/versionCode (\d+)/.exec(before)?.[1]), history[0]?.versionCode ?? 0) + 1
writeFileSync(gradle, before.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]*"/, `versionName "${name}"`))

// 이 변수가 있으면 cmd 가 현재 폴더의 gradlew 를 못 찾는다
const env = { ...process.env }
delete env.NoDefaultCurrentDirectoryInExePath
const run = (cmd, cwd) => spawnSync(cmd, { cwd, env, stdio: 'inherit', shell: true }).status === 0
const ok = run('pnpm exec cap sync android', root) && run(process.platform === 'win32' ? 'gradlew.bat assembleRelease' : './gradlew assembleRelease', join(root, 'android'))
if (!ok) {
  writeFileSync(gradle, before)
  console.error('\n빌드에 실패해 버전 번호를 되돌렸습니다.')
  process.exit(1)
}

mkdirSync(out, { recursive: true })
const apk = join(out, 'dvi-service-hub.apk')
copyFileSync(join(root, 'android/app/build/outputs/apk/release/app-release.apk'), apk)
const date = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD(이 PC 시간대)
const release = { versionCode: code, versionName: name, date, size: statSync(apk).size, notes }
writeFileSync(join(out, 'releases.json'), `${JSON.stringify([release, ...history], null, 2)}\n`)
console.log(`\n${name}(${code}) 을 apps/web/public/app 에 두었습니다. 커밋해서 dev 에 올리면 배포됩니다.`)
