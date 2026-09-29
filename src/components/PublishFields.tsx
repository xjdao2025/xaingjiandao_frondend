import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput'
import { TextArea } from './AutoTextArea'
import { usePublishValidationAttempted } from './PublishSteps'

type PublishTextAreaProps = Parameters<typeof TextArea>[0]

export function PublishTextInput(props: TextInputProps) {
  const attempted = usePublishValidationAttempted()
  const missing = attempted && props.isRequired && !props.value.trim()
  const field = <TextInput {...props} isLabelHidden placeholder={props.placeholder ?? `${props.label}${props.isRequired ? '（必填）' : ''}`}
    status={props.status ?? (missing ? { type: 'error' } : undefined)} statusVariant="detached" />
  return props.description ? <div className="publish-field-help">{field}<small aria-hidden="true">{props.description}</small></div> : field
}

export function PublishTextArea(props: PublishTextAreaProps) {
  const attempted = usePublishValidationAttempted()
  const missing = attempted && props.isRequired && !props.value.trim()
  const field = <TextArea {...props} isLabelHidden placeholder={props.placeholder ?? `${props.label}${props.isRequired ? '（必填）' : ''}`}
    status={props.status ?? (missing ? { type: 'error' } : undefined)} statusVariant="detached" />
  return props.description ? <div className="publish-field-help">{field}<small aria-hidden="true">{props.description}</small></div> : field
}
