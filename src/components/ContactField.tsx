import { TextInput } from '@astryxdesign/core/TextInput'
import { PublishTextInput } from './PublishFields'

export function ContactField({ value, onChange, disabled, organizer = false }: { value: string; onChange: (value: string) => void; disabled?: boolean; organizer?: boolean }) {
  const Field = organizer ? PublishTextInput : TextInput
  return <Field label={organizer ? '组织方联系方式' : '联系方式'} value={value} onChange={onChange}
    description={organizer ? '将在详情中公开展示。' : '填写电话、微信或邮箱，仅你和组织方可见。'}
    status={value.trim().length > 256 ? { type: 'error', message: '联系方式不能超过 256 字。' } : undefined}
    isDisabled={disabled} isRequired width="100%" />
}
