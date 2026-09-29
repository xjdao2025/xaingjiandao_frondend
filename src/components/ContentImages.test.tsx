import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ImageGroup } from './ContentImages'

it('lays out one to nine images without dropping any', () => {
  for (const [count, columns] of [[1, 1], [4, 2], [9, 3]]) {
    const images = Array.from({ length: count }, (_, index) => ({ src: `/image-${index}.jpg`, alt: `图片 ${index + 1}` }))
    const html = renderToStaticMarkup(<ImageGroup images={images} className="post-image-grid" />)
    expect(html).toContain('post-image-grid')
    expect(html).toContain(`repeat(${columns}, 1fr)`)
    expect(html.match(/<img\b/g)).toHaveLength(count)
  }
})
