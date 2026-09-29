// Keep short requests silent. A slow request gets a thin line, never another popup.
export function LoadingProgress({ label = '正在准备内容' }: { label?: string }) {
  return <div className="loading-progress" role="status"><span className="visually-hidden">{label}</span></div>
}
