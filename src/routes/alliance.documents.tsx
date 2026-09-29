import { createFileRoute } from '@tanstack/react-router'
import { getFoundation } from '~/features/alliance/api'
import { publicAttachmentUrl } from '~/lib/attachments'

export const Route = createFileRoute('/alliance/documents')({
  loader: () => getFoundation(),
  component: () => <div className="page business-panel"><h1>金库公示文件</h1><ul className="business-history">{Route.useLoaderData().documents.map((document) => <li key={document.id}><a href={publicAttachmentUrl(document.url)} target="_blank" rel="noopener noreferrer">{document.filename}</a></li>)}</ul></div>,
})
