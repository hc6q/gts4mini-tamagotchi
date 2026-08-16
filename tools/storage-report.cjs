#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { pathToFileURL } = require('node:url')

const ROOT = path.resolve(__dirname, '..')
const IGNORED_DIRS = new Set(['.git', 'node_modules'])
const APP_JS_PREFIXES = ['page/', 'utils/']
const MAX_SAVE_TARGET = 10 * 1024
const MAX_DATA_TARGET = 32 * 1024
const MAX_ASSET_TARGET = 1024 * 1024

function walk(directory, output = [], base = ROOT) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute, output, base)
    else if (entry.isFile()) {
      output.push({
        absolute,
        relative: path.relative(base, absolute).replaceAll(path.sep, '/'),
        size: fs.statSync(absolute).size,
      })
    }
  }
  return output
}

function total(files) {
  return files.reduce((sum, file) => sum + file.size, 0)
}

function format(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(2)} KB (${bytes} B)`
}

function isAppJavaScript(file) {
  if (!file.relative.endsWith('.js')) return false
  return (
    file.relative === 'app.js' ||
    APP_JS_PREFIXES.some((prefix) => file.relative.startsWith(prefix))
  )
}

function topDirectory(relative) {
  const slash = relative.indexOf('/')
  return slash === -1 ? '(root)' : relative.slice(0, slash)
}

function inspectZab(zab) {
  if (!zab) return null

  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'gts-gotchi-storage-'),
  )

  try {
    const zabDirectory = path.join(temporary, 'zab')
    const zpkDirectory = path.join(temporary, 'zpk')
    const deviceDirectory = path.join(temporary, 'device')
    fs.mkdirSync(zabDirectory)
    fs.mkdirSync(zpkDirectory)
    fs.mkdirSync(deviceDirectory)

    execFileSync('unzip', ['-qq', zab.absolute, '-d', zabDirectory])
    const zpk = fs
      .readdirSync(zabDirectory)
      .find((name) => name.toLowerCase().endsWith('.zpk'))
    if (!zpk) return null

    execFileSync('unzip', [
      '-qq',
      path.join(zabDirectory, zpk),
      '-d',
      zpkDirectory,
    ])
    const deviceZip = path.join(zpkDirectory, 'device.zip')
    if (!fs.existsSync(deviceZip)) return null

    execFileSync('unzip', ['-qq', deviceZip, '-d', deviceDirectory])
    const files = walk(deviceDirectory, [], deviceDirectory)
    const code = files.filter((file) => file.relative.endsWith('.bin'))
    const assets = files.filter((file) =>
      file.relative.startsWith('assets/'),
    )

    return { files, code, assets }
  } catch (error) {
    return null
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

async function estimatedSaveSize() {
  const gameUrl = pathToFileURL(path.join(ROOT, 'utils/game.js')).href
  const game = await import(gameUrl)
  const save = game.createSave(1786921200)
  save.n = 'ABCDEFGHIJKL'
  save.f = 1000000
  save.p = 1000000
  save.na = 1000000
  save.st = 1000000
  save.mx = 1000000
  save.gd = 1000000
  save.bd = 1000000
  save.a = (1 << game.ACHIEVEMENT_TOTAL) - 1
  save.d = Array.from({ length: game.MAX_DIARY_EVENTS }, (_, index) => [
    2147483000 + index,
    255,
    2147483647,
  ])
  return JSON.stringify(save).length * 2
}

async function main() {
  const files = walk(ROOT)
  const sourceFiles = files.filter((file) => !file.relative.startsWith('dist/'))
  const assetFiles = sourceFiles.filter((file) =>
    file.relative.startsWith('assets/'),
  )
  const appJsFiles = sourceFiles.filter(isAppJavaScript)
  const jsFiles = sourceFiles.filter((file) =>
    /\.(?:js|mjs|cjs)$/.test(file.relative),
  )
  const pngFiles = assetFiles.filter((file) =>
    file.relative.toLowerCase().endsWith('.png'),
  )
  const spriteFiles = pngFiles.filter(
    (file) => path.basename(file.relative).toLowerCase() !== 'icon.png',
  )
  const zabFiles = files
    .filter((file) => file.relative.toLowerCase().endsWith('.zab'))
    .sort((a, b) => b.size - a.size)
  const largest = [...files].sort((a, b) => b.size - a.size)
  const largestSourceFiles = [...sourceFiles].sort((a, b) => b.size - a.size)
  const saveSize = await estimatedSaveSize()
  const steadyDataSize = saveSize
  const safeWritePeak = saveSize * 3
  const directorySizes = new Map()

  for (const file of files) {
    const directory = topDirectory(file.relative)
    directorySizes.set(directory, (directorySizes.get(directory) || 0) + file.size)
  }

  const largestFile = largestSourceFiles[0]
  const zab = zabFiles[0]
  const packageContents = inspectZab(zab)
  const packagedAssets = packageContents ? packageContents.assets : []
  const packagedCode = packageContents ? packageContents.code : []
  const assetReportFiles = packageContents ? packagedAssets : assetFiles
  const largestAssets = [...assetReportFiles].sort((a, b) => b.size - a.size)
  const sourceJsSize = total(appJsFiles)
  const sourceAssetSize = total(assetFiles)
  const packagedAssetSize = total(packagedAssets)
  const assetReportSize = packageContents
    ? packagedAssetSize
    : sourceAssetSize
  const largestPackagedFile = packageContents
    ? [...packageContents.files].sort((a, b) => b.size - a.size)[0]
    : null

  console.log('STORAGE REPORT')
  console.log('')
  console.log(`ZAB: ${zab ? format(zab.size) : 'not found'}`)
  console.log(`JavaScript: ${format(sourceJsSize)} source`)
  console.log(`Assets: ${format(assetReportSize)} packaged`)
  console.log(`/data expected: ${format(steadyDataSize)} steady state`)
  console.log(`Largest source file: ${largestFile ? `${largestFile.relative} — ${format(largestFile.size)}` : 'none'}`)
  if (largestPackagedFile) {
    console.log(`Largest packaged file: ${largestPackagedFile.relative} — ${format(largestPackagedFile.size)}`)
  }
  console.log(`Number of sprites: ${spriteFiles.length}`)
  console.log('')
  console.log(`ZAB size: ${zab ? format(zab.size) : 'not found'}`)
  console.log(`JS size: ${format(sourceJsSize)} source`)
  if (packageContents) {
    console.log(`Compiled app code: ${format(total(packagedCode))}`)
  }
  console.log(`Assets size: ${format(assetReportSize)} packaged`)
  console.log(`Source assets size: ${format(sourceAssetSize)}`)
  console.log(`Save estimated size: ${format(saveSize)}`)
  console.log('Largest assets:')
  if (largestAssets.length === 0) console.log('  none')
  else {
    for (const file of largestAssets.slice(0, 10)) {
      console.log(`  ${file.relative} — ${format(file.size)}`)
    }
  }

  console.log('')
  console.log('DETAILED AUDIT')
  console.log(`Total project size: ${format(total(sourceFiles))} excluding dist, .git and node_modules`)
  console.log(`Total source asset size: ${format(sourceAssetSize)}`)
  console.log(`Total app JS source size: ${format(sourceJsSize)}`)
  if (packageContents) {
    console.log(`Installed device payload: ${format(total(packageContents.files))}`)
    console.log(`Packaged compiled app code: ${format(total(packagedCode))}`)
    console.log(`Packaged asset size: ${format(packagedAssetSize)}`)
  }
  console.log(`Safe-write temporary peak: ${format(safeWritePeak)}`)
  console.log(`Number of PNG files: ${pngFiles.length}`)
  console.log(`Number of JS files: ${jsFiles.length}`)

  console.log('')
  console.log('Largest 20 files:')
  for (const file of largest.slice(0, 20)) {
    console.log(`  ${file.relative} — ${format(file.size)}`)
  }

  console.log('')
  console.log('Size by directory:')
  for (const [directory, size] of [...directorySizes.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${directory} — ${format(size)}`)
  }

  const warnings = []
  if (saveSize >= MAX_SAVE_TARGET) warnings.push('estimated save exceeds 10 KB')
  if (steadyDataSize >= MAX_DATA_TARGET) warnings.push('/data estimate exceeds 32 KB')
  if (assetReportSize >= MAX_ASSET_TARGET) warnings.push('assets exceed 1 MB')

  console.log('')
  if (warnings.length === 0) console.log('Internal conservative targets: PASS')
  else {
    console.log(`Internal conservative targets: FAIL — ${warnings.join('; ')}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
