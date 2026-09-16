import { mkdir, writeFile, readFile, unlink, access } from 'node:fs/promises'
import path from 'node:path'
import { constants } from 'node:fs'

export async function ensureDir (dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

export async function saveBinaryFile (filePath: string, data: Buffer): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await writeFile(filePath, data)
}

export async function readBinaryFile (filePath: string): Promise<Buffer> {
  return readFile(filePath)
}

export async function removeFileIfExists (filePath: string): Promise<void> {
  try {
    await access(filePath, constants.F_OK)
    await unlink(filePath)
  } catch {
    // already gone
  }
}

export function safeFilename (name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
}
