import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface DetailLine {
  label: string
  value: string
}

interface Props {
  pathLabel?: string
  helpType?: string
  isUrgent?: boolean
  contactName?: string
  contactEmail?: string
  partner?: string
  campus?: string
  product?: string
  severityLabel?: string
  summary?: string
  submittedAt?: string
  detailLines?: DetailLine[]
}

const Email = ({
  pathLabel = 'Question',
  helpType = 'A',
  isUrgent = false,
  contactName = '(unknown)',
  contactEmail = '(unknown)',
  partner,
  campus,
  product,
  severityLabel,
  summary = '(no summary)',
  submittedAt,
  detailLines = [],
}: Props) => {
  const rows: DetailLine[] = [
    { label: 'Name', value: contactName },
    { label: 'Email', value: contactEmail },
    { label: 'Partner', value: partner || '(none)' },
    { label: 'Campus', value: campus || '(none)' },
    { label: 'Product', value: product || '(none)' },
  ]
  if (severityLabel) rows.push({ label: 'Severity', value: severityLabel })

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${pathLabel}: ${summary.slice(0, 90)}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isUrgent ? '[URGENT] ' : ''}New support submission
          </Heading>
          <Text style={meta}>
            Path: {pathLabel} ({helpType})
            {submittedAt ? ` · ${submittedAt}` : ''}
          </Text>

          <Section style={card}>
            <Heading as="h2" style={h2}>Contact</Heading>
            {rows.map((r) => (
              <Text key={r.label} style={row}>
                <strong style={rowLabel}>{r.label}:</strong> {r.value}
              </Text>
            ))}
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>Summary</Heading>
            <Text style={summaryText}>{summary}</Text>
          </Section>

          {detailLines.length > 0 && (
            <Section style={card}>
              <Heading as="h2" style={h2}>Details</Heading>
              {detailLines.map((d, i) => (
                <Text key={i} style={row}>
                  <strong style={rowLabel}>{d.label}:</strong> {d.value}
                </Text>
              ))}
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Reply directly to this email to reach {contactName} at {contactEmail}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const base = `[EMC Support] ${data.pathLabel ?? 'Submission'} — ${(data.summary ?? '').slice(0, 80)}`
    return data.isUrgent ? `[URGENT] ${base}` : base
  },
  displayName: 'Support submission notification',
  to: 'support@economicmobilitycenter.org',
  previewData: {
    pathLabel: 'Question',
    helpType: 'A',
    isUrgent: false,
    contactName: 'Jane Partner',
    contactEmail: 'jane@example.org',
    partner: 'Example Partner',
    campus: 'Main',
    product: 'Insights',
    summary: 'How do I export a report to CSV?',
    submittedAt: new Date().toISOString(),
    detailLines: [{ label: 'Browser', value: 'Chrome 120' }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#042C53', fontSize: '22px', margin: '0 0 4px' }
const h2 = { color: '#042C53', fontSize: '14px', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const meta = { color: '#6B6F76', fontSize: '13px', margin: '0 0 20px' }
const card = { border: '1px solid #E2E4E8', borderRadius: '12px', padding: '16px 18px', margin: '0 0 14px', backgroundColor: '#ffffff' }
const row = { fontSize: '14px', margin: '4px 0', color: '#1A1A1A' }
const rowLabel = { color: '#6B6F76', fontWeight: 500 as const }
const summaryText = { fontSize: '14px', margin: 0, color: '#1A1A1A', whiteSpace: 'pre-wrap' as const }
const hr = { border: 'none', borderTop: '1px solid #E2E4E8', margin: '20px 0 12px' }
const footer = { fontSize: '12px', color: '#8A8E96', margin: 0 }