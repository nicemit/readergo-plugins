/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { findChapterIndex, parseEpub, resolveZipPath, searchableText, splitEpubHref, splitHtmlIntoSections } from './parseEpub'

async function fixtureEpub(): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  )
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Fixture Book</dc:title>
    <dc:creator>Ada</dc:creator>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="part.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch4" href="split.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
    <itemref idref="ch4"/>
  </spine>
</package>`,
  )
  zip.file(
    'OEBPS/nav.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml">
<body>
<nav>
  <ol>
    <li><a href="ch1.xhtml">One</a></li>
    <li><a href="ch2.xhtml">Two</a></li>
    <li><a href="part.xhtml#later">Later</a></li>
  </ol>
</nav>
</body>
</html>`,
  )
  zip.file(
    'OEBPS/ch1.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>One</h1><p>Hello</p><script>alert(1)</script></body></html>`,
  )
  zip.file(
    'OEBPS/ch2.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Two</h1><p>World</p><a href="part.xhtml#later">Later</a></body></html>`,
  )
  zip.file(
    'OEBPS/part.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1 id="later">Later</h1><p>End</p></body></html>`,
  )
  zip.file(
    'OEBPS/split.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body>
      <h1>Part</h1><p>Intro</p>
      <h2 id="alpha">Alpha</h2><p>A text</p>
      <h2 id="beta">Beta</h2><p>B text</p>
    </body></html>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('parseEpub', () => {
  it('resolves package-relative paths', () => {
    expect(resolveZipPath('OEBPS', '../Images/a.png')).toBe('Images/a.png')
    expect(resolveZipPath('OEBPS/Text', 'ch1.xhtml#frag')).toBe('OEBPS/Text/ch1.xhtml')
  })

  it('reads title, chapters, and strips scripts', async () => {
    const book = await parseEpub(await fixtureEpub())
    expect(book.title).toBe('Fixture Book')
    expect(book.creator).toBe('Ada')
    expect(book.chapters).toHaveLength(6)
    expect(book.chapters[0]?.title).toBe('One')
    expect(book.chapters[0]?.html).toContain('Hello')
    expect(book.chapters[0]?.html).not.toContain('script')
    expect(searchableText(book)).toContain('World')
    expect(book.chapters[1]?.html).toContain('data-epub-href="part.xhtml#later"')
  })

  it('finds chapters from relative and hashed hrefs', () => {
    const chapters = [
      { href: 'OEBPS/ch1.xhtml' },
      { href: 'OEBPS/ch2.xhtml' },
      { href: 'OEBPS/part.xhtml' },
    ]
    expect(splitEpubHref('part.xhtml#later')).toEqual({ path: 'part.xhtml', hash: 'later' })
    expect(findChapterIndex(chapters, 'ch2.xhtml', 'OEBPS/ch1.xhtml')).toBe(1)
    expect(findChapterIndex(chapters, 'part.xhtml#later', 'OEBPS/ch2.xhtml')).toBe(2)
    expect(findChapterIndex(chapters, '../OEBPS/ch1.xhtml', 'OEBPS/Text/nav.xhtml')).toBe(0)
  })

  it('splits one file into chapter and nested sections', () => {
    const sections = splitHtmlIntoSections(
      '<h1>Part</h1><p>Intro</p><h2 id="alpha">Alpha</h2><p>A text</p><h2 id="beta">Beta</h2><p>B text</p>',
      'OEBPS/split.xhtml',
      { idref: 'ch4' },
    )
    expect(sections).toHaveLength(3)
    expect(sections[0]?.title).toBe('Part')
    expect(sections[0]?.level).toBe(1)
    expect(sections[1]?.href).toBe('OEBPS/split.xhtml#alpha')
    expect(sections[1]?.html).toContain('A text')
    expect(sections[1]?.html).not.toContain('B text')
    expect(sections[2]?.href).toBe('OEBPS/split.xhtml#beta')
  })

  it('picks a hashed section over the first file slice', () => {
    const chapters = [
      { href: 'OEBPS/split.xhtml' },
      { href: 'OEBPS/split.xhtml#alpha' },
      { href: 'OEBPS/split.xhtml#beta' },
    ]
    expect(findChapterIndex(chapters, 'split.xhtml#beta', 'OEBPS/split.xhtml')).toBe(2)
  })
})
