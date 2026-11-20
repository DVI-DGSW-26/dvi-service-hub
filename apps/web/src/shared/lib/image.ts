/**
 * 고른 그림을 긴 변 max px 이하로 줄인 data URL 로 — 사진 원본을 그대로 두면 브라우저 저장 공간(5MB 안팎)을 넘는다.
 * 투명한 부분을 지키는 WebP 로, 못 만드는 브라우저면 JPEG 로. 그림이 아니거나 못 읽으면 throw
 */
export async function fitImage(file: File, max: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not an image')
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const webp = canvas.toDataURL('image/webp', 0.82)
  // shortcut: JPEG 로 떨어지면 투명한 부분이 검게 된다, WebP 를 못 만드는 브라우저가 많아지면 PNG 로
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82)
}
