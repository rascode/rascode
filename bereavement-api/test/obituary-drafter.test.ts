import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TemplateObituaryDrafter } from '../src/services/obituary-drafter.ts'

describe('TemplateObituaryDrafter', () => {
  it('drafts a warm obituary from biography fields', async () => {
    const drafter = new TemplateObituaryDrafter()
    const result = await drafter.draft({
      biography: {
        caseId: '00000000-0000-0000-0000-000000000001',
        legalName: 'Morgan Ellis',
        preferredName: 'Morgan',
        dateOfBirth: '1940-01-02',
        dateOfDeath: '2026-08-01',
        ageAtDeath: 86,
        occupation: 'teacher',
        spouseOrPartner: 'Pat Ellis',
        children: ['Casey Ellis'],
        hobbies: ['painting'],
        personalityTraits: ['kind'],
        survivorList: ['Pat Ellis', 'Casey Ellis'],
        updatedAt: new Date().toISOString(),
      },
      service: {
        serviceDate: '2026-08-10',
        venueName: 'Community Hall',
      },
      tone: 'warm',
      length: 'standard',
      promptNotes: 'Mention the love of painting.',
    })

    assert.match(result.headline, /Morgan/)
    assert.match(result.body, /teacher/)
    assert.match(result.body, /Pat Ellis/)
    assert.match(result.body, /Community Hall/)
    assert.equal(result.model, 'template-drafter-v1')
  })
})
