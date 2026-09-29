import { LoginLink } from '../session/LoginLink'
import { Button } from '@astryxdesign/core/Button'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Link, useNavigate } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { useState } from 'react'

import { useStoredSession } from '../session/session'
import {
  changeCurrentUserContact,
  deleteCurrentUser,
  type VerificationChannel,
} from './api'
import { VerificationCodeButton } from './VerificationCodeButton'

export function AccountSecurityPage() {
  const { session, saveSession } = useStoredSession()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState(session?.user.phone || '')
  const [phoneCode, setPhoneCode] = useState('')
  const [email, setEmail] = useState(session?.user.email || '')
  const [emailCode, setEmailCode] = useState('')
  const [editing, setEditing] = useState<VerificationChannel | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteCode, setDeleteCode] = useState('')
  const defaultDeleteChannel: VerificationChannel = session?.user.phone ? 'sms' : 'email'
  const [deleteChannel, setDeleteChannel] = useState<VerificationChannel>(defaultDeleteChannel)

  if (!session) {
    return (
      <div className="page signed-out-state">
        <strong>登录后管理账号</strong>
        <LoginLink className="primary-link">前往登录</LoginLink>
      </div>
    )
  }

  const changeContact = async (channel: VerificationChannel) => {
    setBusy(true)
    setError('')
    try {
      const user = await changeCurrentUserContact({
        data: {
          token: session.token,
          channel,
          code: channel === 'sms' ? phoneCode : emailCode,
          ...(channel === 'sms' ? { phone, phoneRegion: '86' } : { email }),
        },
      })
      saveSession({ ...session, user })
      setNotice(channel === 'sms' ? '手机号已更新。' : '邮箱已更新。')
      setEditing(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '联系方式更新失败')
    } finally {
      setBusy(false)
    }
  }

  const removeAccount = async () => {
    setBusy(true)
    setError('')
    try {
      await deleteCurrentUser({ data: { token: session.token, channel: deleteChannel, code: deleteCode } })
      saveSession(null)
      await navigate({ to: '/login' })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '账号注销失败')
    } finally {
      setBusy(false)
    }
  }

  const editContact = editing === 'sms' ? phone : email
  const editCode = editing === 'sms' ? phoneCode : emailCode

  return (
    <div className="page narrow-page account-security-page">
      <h1>账号与安全</h1>
      <section className="account-summary">
        <div className="account-summary-row">
          <span><small>登录方式</small><strong>Rice + AT Protocol</strong></span>
          <em>已验证</em>
        </div>
        <div className="account-summary-row">
          <span><small>手机号</small><strong>{maskedPhone(session.user.phone)}</strong></span>
          <Button label="更换手机号" variant="ghost" size="sm" onClick={() => setEditing('sms')}>更换</Button>
        </div>
        <div className="account-summary-row">
          <span><small>邮箱</small><strong>{maskedEmail(session.user.email)}</strong></span>
          <Button label="更换邮箱" variant="ghost" size="sm" onClick={() => setEditing('email')}>更换</Button>
        </div>
        <div className="account-summary-row">
          <span><small>DID 标识</small><strong>{session.user.did}</strong></span>
        </div>
        <Link to="/forgot-password" className="account-summary-row">
          <span><small>密码</small><strong>通过已登记的联系方式重置</strong></span>
          <b>→</b>
        </Link>
      </section>

      {editing ? (
        <section key={editing} className="form-card compact-form-card">
          <h2>更换{editing === 'sms' ? '手机号' : '邮箱'}</h2>
          <TextInput label={editing === 'sms' ? '新手机号' : '新邮箱'} type={editing === 'email' ? 'email' : undefined} value={editContact} onChange={editing === 'sms' ? setPhone : setEmail} width="100%" />
          <div className="code-row">
            <TextInput label="验证码" value={editCode} onChange={editing === 'sms' ? setPhoneCode : setEmailCode} width="100%" />
            <VerificationCodeButton channel={editing} contact={editContact} purpose={editing === 'sms' ? 'modify_phone' : 'modify_email'} disabled={busy} onError={setError} onSent={() => setNotice('验证码已发送。')} />
          </div>
          <div className="form-actions">
            <Button label="取消" variant="secondary" onClick={() => setEditing(null)} />
            <Button label="确认更换" variant="primary" clickAction={() => changeContact(editing)} isLoading={busy} isDisabled={!editContact.trim() || !editCode.trim()} />
          </div>
        </section>
      ) : null}

      {notice ? <div className="form-notice">{notice}</div> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <section className="danger-zone">
        <Button label="注销账号" variant="destructive" size="sm" onClick={() => setDeleteOpen((value) => !value)} />
        <p>永久删除账号与个人资料。操作需要验证码确认。</p>
        {deleteOpen ? (
          <div className="delete-account-form">
            <div className="task-warning-note"><CircleAlert size={18} /><span>注销后当前 Rice token 会立即失效。</span></div>
            <Selector
              label="验证方式"
              options={[
                { value: 'sms', label: '手机号', disabled: !session.user.phone },
                { value: 'email', label: '邮箱', disabled: !session.user.email },
              ]}
              value={deleteChannel}
              onChange={(value) => setDeleteChannel(value as VerificationChannel)}
              width="100%"
            />
            <div className="code-row">
              <TextInput label="验证码" value={deleteCode} onChange={setDeleteCode} width="100%" />
              <VerificationCodeButton channel={deleteChannel} contact={(deleteChannel === 'sms' ? session.user.phone : session.user.email) || ''} phoneRegion={session.user.phone_region || '86'} purpose="delete_account" disabled={busy} onError={setError} onSent={() => setNotice('注销验证码已发送。')} />
            </div>
            <div className="form-actions">
              <Button label="确认注销账号" variant="destructive" clickAction={removeAccount} isLoading={busy} isDisabled={!deleteCode.trim()} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function maskedPhone(phone: string | null) {
  if (!phone) return '未绑定'
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function maskedEmail(email: string | null) {
  if (!email) return '未绑定'
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 2)}***@${domain}`
}
