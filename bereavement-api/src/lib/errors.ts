import { randomUUID } from 'node:crypto'

export function nowIso (): string {
  return new Date().toISOString()
}

export function newId (): string {
  return randomUUID()
}

export class AppError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor (statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function notFound (resource: string, id?: string): AppError {
  const suffix = id ? ` (${id})` : ''
  return new AppError(404, 'not_found', `${resource} not found${suffix}`)
}

export function badRequest (message: string, details?: unknown): AppError {
  return new AppError(400, 'bad_request', message, details)
}

export function conflict (message: string): AppError {
  return new AppError(409, 'conflict', message)
}
