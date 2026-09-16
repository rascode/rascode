import PDFDocument from 'pdfkit'
import path from 'node:path'
import { PDF_TEMPLATES, getTemplateById } from '../data/templates/catalog.ts'
import type {
  BelovedBiography,
  BereavementCase,
  BereavementPackage,
  CreatePackageInput,
  Obituary,
  PdfTemplate,
  ServiceProgramContent,
} from '../types.ts'
import { badRequest, newId, nowIso, notFound } from '../lib/errors.ts'
import { ensureDir, safeFilename, saveBinaryFile } from '../lib/files.ts'
import type { BereavementStore } from '../store/memory-store.ts'
import type { CaseService } from './case-service.ts'

export class PackageService {
  private readonly store: BereavementStore
  private readonly cases: CaseService
  private readonly generatedDir: string

  constructor (store: BereavementStore, cases: CaseService, generatedDir: string) {
    this.store = store
    this.cases = cases
    this.generatedDir = generatedDir
  }

  listTemplates (): PdfTemplate[] {
    return [...PDF_TEMPLATES]
  }

  getTemplate (templateId: string): PdfTemplate {
    const template = getTemplateById(templateId)
    if (!template) throw notFound('Template', templateId)
    return template
  }

  async list (caseId: string): Promise<BereavementPackage[]> {
    await this.cases.ensureExists(caseId)
    return this.store.listPackages(caseId)
  }

  async get (caseId: string, packageId: string): Promise<BereavementPackage> {
    await this.cases.ensureExists(caseId)
    const item = await this.store.getPackage(caseId, packageId)
    if (!item) throw notFound('Package', packageId)
    return item
  }

  async create (caseId: string, input: CreatePackageInput): Promise<BereavementPackage> {
    const bereavementCase = await this.cases.ensureExists(caseId)
    const template = this.getTemplate(input.templateId)
    const obituary = await this.store.getObituary(caseId, input.obituaryId)
    if (!obituary) throw notFound('Obituary', input.obituaryId)

    const biography = await this.store.getBiography(caseId)
    if (!biography) {
      throw badRequest('Biography is required before generating a PDF package')
    }

    const timestamp = nowIso()
    const pkg: BereavementPackage = {
      id: newId(),
      caseId,
      templateId: template.id,
      obituaryId: obituary.id,
      status: 'pending',
      program: withDefaultProgram(input.program, bereavementCase),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await this.store.savePackage(pkg)

    try {
      const pdf = await renderBereavementPdf({
        template,
        bereavementCase,
        biography,
        obituary,
        program: pkg.program,
      })

      const filename = safeFilename(
        `${biography.preferredName || biography.legalName}-${template.id}.pdf`,
      )
      const storagePath = path.join(this.generatedDir, caseId, `${pkg.id}-${filename}`)
      await ensureDir(path.dirname(storagePath))
      await saveBinaryFile(storagePath, pdf)

      const ready: BereavementPackage = {
        ...pkg,
        status: 'ready',
        filename,
        storagePath,
        updatedAt: nowIso(),
      }
      await this.store.savePackage(ready)
      await this.cases.update(caseId, { status: 'ready_for_service' })
      return ready
    } catch (error) {
      const failed: BereavementPackage = {
        ...pkg,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'PDF generation failed',
        updatedAt: nowIso(),
      }
      await this.store.savePackage(failed)
      return failed
    }
  }
}

function withDefaultProgram (
  program: ServiceProgramContent | undefined,
  bereavementCase: BereavementCase,
): ServiceProgramContent {
  const defaults: ServiceProgramContent = {
    orderOfService: [
      'Welcome and Gathering',
      'Opening Prayer or Reflection',
      'Remembering Our Beloved',
      'Music',
      'Readings',
      'Words of Comfort',
      'Closing Blessing',
      'Commendation',
    ],
    welcomeMessage:
      bereavementCase.service.additionalNotes ||
      'Thank you for joining our family as we honor a life of love and memory.',
    acknowledgements:
      'The family gratefully acknowledges your presence, prayers, and kindness during this time.',
  }

  return {
    orderOfService: program?.orderOfService ?? defaults.orderOfService,
    welcomeMessage: program?.welcomeMessage ?? defaults.welcomeMessage,
    acknowledgements: program?.acknowledgements ?? defaults.acknowledgements,
    donationRequests: program?.donationRequests,
  }
}

export async function renderBereavementPdf (input: {
  template: PdfTemplate
  bereavementCase: BereavementCase
  biography: BelovedBiography
  obituary: Obituary
  program: ServiceProgramContent
}): Promise<Buffer> {
  const { template, bereavementCase, biography, obituary, program } = input
  const size = template.pageSize === 'half_letter' ? ([396, 612] as [number, number]) : 'LETTER'

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size,
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
      info: {
        Title: `${biography.preferredName || biography.legalName} — Remembrance`,
        Author: 'dbui bereavement-api',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const accent = accentForStyle(template.style)
    const name = biography.preferredName || biography.legalName
    const dates = [biography.dateOfBirth, biography.dateOfDeath].filter(Boolean).join(' — ')

    doc.fillColor(accent).font('Times-Bold').fontSize(22).text(name, { align: 'center' })
    doc.moveDown(0.4)
    if (dates) {
      doc.fillColor('#444444').font('Times-Roman').fontSize(12).text(dates, { align: 'center' })
    }
    doc.moveDown(0.8)
    drawRule(doc, accent)
    doc.moveDown(0.8)

    if (obituary.headline) {
      doc.fillColor('#222222').font('Times-Bold').fontSize(14).text(obituary.headline, {
        align: 'center',
      })
      doc.moveDown(0.6)
    }

    doc.fillColor('#222222').font('Times-Roman').fontSize(11).text(obituary.body, {
      align: 'left',
      lineGap: 3,
    })

    doc.addPage()
    doc.fillColor(accent).font('Times-Bold').fontSize(18).text('Order of Service', {
      align: 'center',
    })
    doc.moveDown(0.3)
    if (bereavementCase.service.serviceDate || bereavementCase.service.venueName) {
      const serviceLine = [
        bereavementCase.service.serviceDate,
        bereavementCase.service.serviceTime,
        bereavementCase.service.venueName,
      ]
        .filter(Boolean)
        .join(' · ')
      doc.fillColor('#555555').font('Times-Italic').fontSize(11).text(serviceLine, {
        align: 'center',
      })
    }
    doc.moveDown(0.6)
    drawRule(doc, accent)
    doc.moveDown(0.8)

    if (program.welcomeMessage) {
      doc.fillColor('#222222').font('Times-Roman').fontSize(11).text(program.welcomeMessage, {
        align: 'left',
        lineGap: 2,
      })
      doc.moveDown(0.8)
    }

    for (const [index, item] of (program.orderOfService ?? []).entries()) {
      doc.fillColor('#222222').font('Times-Bold').fontSize(11).text(`${index + 1}. ${item}`)
      doc.moveDown(0.35)
    }

    if (bereavementCase.service.musicSelections?.length) {
      doc.moveDown(0.5)
      doc.font('Times-Bold').text('Music')
      doc.font('Times-Roman').text(bereavementCase.service.musicSelections.join('; '))
    }

    if (bereavementCase.service.readings?.length) {
      doc.moveDown(0.5)
      doc.font('Times-Bold').text('Readings')
      doc.font('Times-Roman').text(bereavementCase.service.readings.join('; '))
    }

    if (program.acknowledgements) {
      doc.moveDown(1)
      drawRule(doc, accent)
      doc.moveDown(0.6)
      doc.font('Times-Italic').fontSize(10).text(program.acknowledgements, { align: 'center' })
    }

    if (program.donationRequests) {
      doc.moveDown(0.6)
      doc.font('Times-Roman').fontSize(10).text(program.donationRequests, { align: 'center' })
    }

    doc.fillColor('#888888').fontSize(8).text(
      `Prepared with ${template.name}`,
      54,
      doc.page.height - 40,
      { align: 'center', width: doc.page.width - 108 },
    )

    doc.end()
  })
}

function accentForStyle (style: PdfTemplate['style']): string {
  switch (style) {
    case 'modern':
      return '#1f4b5e'
    case 'garden':
      return '#3f6b4f'
    case 'faith':
      return '#4a3f6b'
    case 'classic':
    default:
      return '#2c2c2c'
  }
}

function drawRule (doc: PDFKit.PDFDocument, color: string): void {
  const y = doc.y
  const left = doc.page.margins.left
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right
  doc.save()
  doc.strokeColor(color).lineWidth(1).moveTo(left, y).lineTo(left + width, y).stroke()
  doc.restore()
  doc.moveDown(0.2)
}
