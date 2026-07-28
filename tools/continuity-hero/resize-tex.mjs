import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const srcTex = process.argv[2]
const dstTex = process.argv[3]
const size = Number(process.argv[4] || 2048)

fs.mkdirSync(dstTex, { recursive: true })

for (const f of fs.readdirSync(srcTex)) {
  if (!/\.(jpe?g|png)$/i.test(f)) continue
  const inP = path.join(srcTex, f)
  const outP = path.join(dstTex, f)
  console.log('resize', f)
  await sharp(inP)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outP)
}
console.log('done')
