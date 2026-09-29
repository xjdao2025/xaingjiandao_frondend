import { expect, it } from 'vitest'
import { integerInputError } from './integer-input'

it('rejects negative, fractional and malformed money instead of interpreting their digits as another amount', () => {
  for (const value of ['-1', '1.5', '+1', '1e2', '1 5', '', '1000000000']) {
    expect(integerInputError(value, '报酬')).toContain('整数')
  }
  expect(integerInputError('0', '报酬')).toBeNull()
  expect(integerInputError('150', '报名费')).toBeNull()
  expect(integerInputError('0', '参与名额', 1, 100_000)).not.toBeNull()
  expect(integerInputError('100001', '参与名额', 1, 100_000)).not.toBeNull()
})
