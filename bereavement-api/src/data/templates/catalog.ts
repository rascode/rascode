import type { PdfTemplate } from '../../types.ts'

/**
 * Predefined bereavement PDF options families can choose from.
 * Each template packages the beloved's obituary with a service program layout.
 */
export const PDF_TEMPLATES: readonly PdfTemplate[] = [
  {
    id: 'classic-letter',
    name: 'Classic Letter',
    description:
      'Traditional full-page letter layout with centered headline, obituary narrative, and a formal order of service on the following page.',
    style: 'classic',
    pageSize: 'letter',
    includesObituary: true,
    includesServiceProgram: true,
    previewSummary: 'Serif typography, restrained rules, two-page letter fold.',
  },
  {
    id: 'modern-half',
    name: 'Modern Half-Fold',
    description:
      'Contemporary half-letter booklet: cover with name and dates, interior obituary, and a clean program page for readings and music.',
    style: 'modern',
    pageSize: 'half_letter',
    includesObituary: true,
    includesServiceProgram: true,
    previewSummary: 'Sans-serif accents, generous whitespace, booklet-ready.',
  },
  {
    id: 'garden-remembrance',
    name: 'Garden Remembrance',
    description:
      'Soft memorial style suited to outdoor or garden services. Obituary flows into a welcoming program with space for acknowledgements.',
    style: 'garden',
    pageSize: 'letter',
    includesObituary: true,
    includesServiceProgram: true,
    previewSummary: 'Gentle headings, botanical divider motifs (text-safe).',
  },
  {
    id: 'faith-service',
    name: 'Faith Service',
    description:
      'Faith-centered layout with room for scripture readings, hymns, and a pastoral welcome alongside the obituary.',
    style: 'faith',
    pageSize: 'letter',
    includesObituary: true,
    includesServiceProgram: true,
    previewSummary: 'Structured liturgy sections with classic typographic hierarchy.',
  },
] as const

export function getTemplateById (id: string): PdfTemplate | undefined {
  return PDF_TEMPLATES.find((template) => template.id === id)
}
