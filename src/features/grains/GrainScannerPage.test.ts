import { expect, it } from 'vitest'
import { grainCodeRecipient } from './GrainScannerPage'

it('reads current and original receive codes without accepting unrelated links or recipient injection', () => {
  const origin = 'https://demo.wamo.social'
  expect(grainCodeRecipient(`${origin}/profile/did%3Aplc%3Aalice?send=1`, origin)).toBe('did:plc:alice')
  expect(grainCodeRecipient(`${origin}/profile/alice.web5.xjdao.xyz?send=1`, origin)).toBe('alice.web5.xjdao.xyz')
  expect(grainCodeRecipient('https://xjdao.xyz/middle-page?receiveUser=13800138000', origin)).toBe('13800138000')
  expect(grainCodeRecipient('https://xjdao.xyz/middle-page?receiveUser=alice_tag@example.com', origin)).toBe('alice_tag@example.com')
  expect(grainCodeRecipient('https://xjdao.xyz/middle-page?receiveUser=alice+tag@example.com', origin)).toBe('alice+tag@example.com')
  for (const value of ['hello', 'https://other.example/profile/alice?send=1', `${origin}/profile/alice`, `${origin}/profile/alice%2Fbob?send=1`, `${origin}/middle-page?receiveUser=`, `${origin}/middle-page?receiveUser=alice%0Abob`, 'https://alice:secret@demo.wamo.social/profile/alice?send=1']) {
    expect(() => grainCodeRecipient(value, origin)).toThrow()
  }
})
