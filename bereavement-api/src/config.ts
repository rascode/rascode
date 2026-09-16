import path from 'node:path'

export interface AppConfig {
  host: string
  port: number
  uploadDir: string
  generatedDir: string
  openaiApiKey?: string
  openaiModel: string
}

export function loadConfig (env: NodeJS.ProcessEnv = process.env): AppConfig {
  const root = process.cwd()
  return {
    host: env.HOST ?? '0.0.0.0',
    port: Number(env.PORT ?? 3040),
    uploadDir: env.UPLOAD_DIR ?? path.join(root, 'uploads'),
    generatedDir: env.GENERATED_DIR ?? path.join(root, 'generated'),
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL ?? 'gpt-4o-mini',
  }
}
