import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { TextInput } from '@astryxdesign/core/TextInput'

import type { VerificationChannel, VerificationPurpose } from './api'
import { VerificationCodeButton } from './VerificationCodeButton'

type Props = {
  channel: VerificationChannel
  setChannel: (channel: VerificationChannel) => void
  contact: string
  setContact: (contact: string) => void
  code: string
  setCode: (code: string) => void
  purpose: VerificationPurpose
  channels?: VerificationChannel[]
  disabled?: boolean
  onError: (message: string) => void
  onSent?: () => void
}

export function VerificationFields(props: Props) {
  return (
    <>
      {(props.channels?.length ?? 2) > 1 ? <SegmentedControl
        label="验证方式"
        value={props.channel}
        onChange={(value) => props.setChannel(value as VerificationChannel)}
        layout="fill"
      >
        <SegmentedControlItem value="sms" label="手机号" />
        <SegmentedControlItem value="email" label="邮箱" />
      </SegmentedControl> : null}
      <TextInput
        label={props.channel === 'sms' ? '手机号' : '邮箱'}
        type={props.channel === 'email' ? 'email' : 'text'}
        value={props.contact}
        onChange={props.setContact}
        width="100%"
        isDisabled={props.disabled}
      />
      <div className="code-row">
        <TextInput
          label="验证码"
          value={props.code}
          onChange={props.setCode}
          width="100%"
          isDisabled={props.disabled}
        />
        <VerificationCodeButton {...props} />
      </div>
    </>
  )
}
