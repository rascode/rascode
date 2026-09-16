import type { DraftContext, DraftResult } from './obituary-service.ts'
import type { BelovedBiography, ObituaryTone } from '../types.ts'

export interface ObituaryDrafter {
  draft (context: DraftContext): Promise<DraftResult>
}

/**
 * Local, deterministic drafter used when no LLM key is configured.
 * Produces a respectful first draft from structured biography fields.
 */
export class TemplateObituaryDrafter implements ObituaryDrafter {
  async draft (context: DraftContext): Promise<DraftResult> {
    const { biography, tone, length } = context
    const name = displayName(biography)
    const lifespan = formatLifespan(biography)
    const headline = `${name}${lifespan ? ` (${lifespan})` : ''}`

    const paragraphs = [
      openingSentence(biography, tone),
      lifeStorySentence(biography),
      relationshipsSentence(biography),
      characterSentence(biography, tone),
      survivorsSentence(biography),
      serviceSentence(context),
    ].filter(Boolean)

    let body = paragraphs.join('\n\n')
    if (length === 'short') {
      body = paragraphs.slice(0, 3).join('\n\n')
    } else if (length === 'long' && biography.memorableStories?.length) {
      body += `\n\nThose who loved ${firstName(name)} especially remember: ${biography.memorableStories.join('; ')}.`
    }

    return {
      headline,
      body,
      model: 'template-drafter-v1',
    }
  }
}

/**
 * OpenAI-compatible drafter. Falls back to the template drafter on failure
 * so families always receive a usable first draft.
 */
export class OpenAiObituaryDrafter implements ObituaryDrafter {
  private readonly apiKey: string
  private readonly model: string
  private readonly fallback: ObituaryDrafter

  constructor (
    apiKey: string,
    model: string,
    fallback: ObituaryDrafter = new TemplateObituaryDrafter(),
  ) {
    this.apiKey = apiKey
    this.model = model
    this.fallback = fallback
  }

  async draft (context: DraftContext): Promise<DraftResult> {
    try {
      const prompt = buildPrompt(context)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                'You write compassionate, accurate obituaries for grieving families. Use only the facts provided. Do not invent details. Return JSON with keys headline and body.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        return this.fallback.draft(context)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = payload.choices?.[0]?.message?.content
      if (!content) return this.fallback.draft(context)

      const parsed = JSON.parse(content) as { headline?: string; body?: string }
      if (!parsed.body) return this.fallback.draft(context)

      return {
        headline: parsed.headline || displayName(context.biography),
        body: parsed.body,
        model: this.model,
      }
    } catch {
      return this.fallback.draft(context)
    }
  }
}

export function createObituaryDrafter (options: {
  apiKey?: string
  model: string
}): ObituaryDrafter {
  if (options.apiKey) {
    return new OpenAiObituaryDrafter(options.apiKey, options.model)
  }
  return new TemplateObituaryDrafter()
}

function displayName (bio: BelovedBiography): string {
  return bio.preferredName?.trim() || bio.legalName.trim()
}

function firstName (fullName: string): string {
  return fullName.split(/\s+/)[0] || fullName
}

function formatLifespan (bio: BelovedBiography): string {
  if (bio.dateOfBirth && bio.dateOfDeath) {
    return `${yearOf(bio.dateOfBirth)}–${yearOf(bio.dateOfDeath)}`
  }
  if (bio.ageAtDeath != null) return `age ${bio.ageAtDeath}`
  return ''
}

function yearOf (value: string): string {
  const match = value.match(/^(\d{4})/)
  return match?.[1] ?? value
}

function openingSentence (bio: BelovedBiography, tone: ObituaryTone): string {
  const name = displayName(bio)
  const legal = bio.legalName !== name ? ` (${bio.legalName})` : ''
  const place = bio.placeOfDeath ? ` in ${bio.placeOfDeath}` : ''
  const date = bio.dateOfDeath ? ` on ${bio.dateOfDeath}` : ''
  const age = bio.ageAtDeath != null ? ` at the age of ${bio.ageAtDeath}` : ''

  if (tone === 'celebratory') {
    return `With gratitude for a life well lived, we remember ${name}${legal}, who passed peacefully${place}${date}${age}.`
  }
  if (tone === 'faith_centered') {
    return `${name}${legal} entered into eternal rest${place}${date}${age}, surrounded by the love of family and faith.`
  }
  if (tone === 'concise') {
    return `${name}${legal} died${place}${date}${age}.`
  }
  if (tone === 'traditional') {
    return `${name}${legal} passed away${place}${date}${age}.`
  }
  return `${name}${legal} died peacefully${place}${date}${age}.`
}

function lifeStorySentence (bio: BelovedBiography): string {
  const parts: string[] = []
  if (bio.placeOfBirth || bio.dateOfBirth) {
    parts.push(
      `Born${bio.placeOfBirth ? ` in ${bio.placeOfBirth}` : ''}${bio.dateOfBirth ? ` on ${bio.dateOfBirth}` : ''}`,
    )
  }
  if (bio.education) parts.push(`educated at ${bio.education}`)
  if (bio.occupation) parts.push(`and known for a career as ${bio.occupation}`)
  if (bio.militaryService) parts.push(`Military service included ${bio.militaryService}`)
  if (!parts.length && bio.additionalNotes) return bio.additionalNotes
  if (!parts.length) return ''
  return `${parts.join(', ')}.`.replace(/^and /i, '').replace(/, and known/, ' and known')
}

function relationshipsSentence (bio: BelovedBiography): string {
  const bits: string[] = []
  if (bio.spouseOrPartner) bits.push(`beloved of ${bio.spouseOrPartner}`)
  if (bio.parents?.length) bits.push(`child of ${joinList(bio.parents)}`)
  if (bio.children?.length) bits.push(`parent of ${joinList(bio.children)}`)
  if (bio.grandchildren?.length) bits.push(`grandparent of ${joinList(bio.grandchildren)}`)
  if (!bits.length) return ''
  return `In life, ${displayName(bio)} was ${bits.join('; ')}.`
}

function characterSentence (bio: BelovedBiography, tone: ObituaryTone): string {
  const traits = bio.personalityTraits?.length
    ? bio.personalityTraits.join(', ')
    : undefined
  const hobbies = bio.hobbies?.length ? bio.hobbies.join(', ') : undefined
  const affiliations = bio.affiliations?.length ? bio.affiliations.join(', ') : undefined
  const faith = bio.faithTradition

  const chunks: string[] = []
  if (traits) chunks.push(`remembered for being ${traits}`)
  if (hobbies) chunks.push(`finding joy in ${hobbies}`)
  if (affiliations) chunks.push(`active with ${affiliations}`)
  if (faith && tone === 'faith_centered') chunks.push(`sustained by ${faith}`)
  else if (faith) chunks.push(`a person of ${faith}`)
  if (!chunks.length) return ''
  return `${firstName(displayName(bio))} will be ${chunks.join(', and ')}.`
}

function survivorsSentence (bio: BelovedBiography): string {
  const survivors = bio.survivorList?.length
    ? bio.survivorList
    : [
        bio.spouseOrPartner,
        ...(bio.children ?? []),
        ...(bio.siblings ?? []),
      ].filter((value): value is string => Boolean(value))

  const preceded = bio.precededInDeathBy?.length
    ? ` ${displayName(bio)} was preceded in death by ${joinList(bio.precededInDeathBy)}.`
    : ''

  if (!survivors.length) return preceded.trim()
  return `${displayName(bio)} is survived by ${joinList(survivors)}.${preceded}`
}

function serviceSentence (context: DraftContext): string {
  const { service } = context
  if (!service.serviceDate && !service.venueName) return ''
  const when = [service.serviceDate, service.serviceTime].filter(Boolean).join(' at ')
  const where = [service.venueName, service.venueAddress].filter(Boolean).join(', ')
  return `A celebration of life${when ? ` will be held on ${when}` : ' will be announced'}${where ? ` at ${where}` : ''}.`
}

function joinList (items: string[]): string {
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function buildPrompt (context: DraftContext): string {
  return [
    `Tone: ${context.tone}`,
    `Length: ${context.length}`,
    context.promptNotes ? `Family guidance: ${context.promptNotes}` : '',
    'Biography JSON:',
    JSON.stringify(context.biography, null, 2),
    'Service JSON:',
    JSON.stringify(context.service, null, 2),
  ]
    .filter(Boolean)
    .join('\n')
}
