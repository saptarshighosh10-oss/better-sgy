import { launchSchoolBrowser } from './lib/browser-profile.mjs'
const browser = await launchSchoolBrowser()
try {
  const page = await browser.newPage()
  await page.goto('https://fuhsd.schoology.com/home', { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(async () => {
    const fname = 'bs-fileupload-test.txt'
    // 1. get token + form fields
    const r = await fetch('/assignment/8339829444/dropbox/submit', { credentials: 'include', headers: { Accept: 'text/html' } })
    const html = await r.text()
    const tk = html.match(/"file_service_upload":\{"enabled":true,"url":"([^"]+)","token":"([^"]+)"/)
    const uploadUrl = tk[1].replace(/\\\//g, '/'), token = tk[2]
    const doc = new DOMParser().parseFromString(html, 'text/html')
    let form = null
    for (const f of doc.querySelectorAll('form')) if (f.querySelector('input[name="file[files]"]')) { form = f; break }

    // 2. upload file
    const fd = new FormData()
    fd.append('name', fname)
    fd.append('use_plain', '1')
    fd.append('file', new File(['better schoology file upload test — please ignore\n'], fname, { type: 'text/plain' }))
    const up = await fetch(uploadUrl, { method: 'POST', credentials: 'include', headers: { Authorization: 'Bearer ' + token }, body: fd })
    const upBody = await up.json().catch(() => null)
    if (!up.ok || !upBody?.fileMetadataId) return { step: 'upload', status: up.status, body: upBody }
    const uuid = upBody.fileMetadataId

    // 3. submit with file[files]
    const body = new FormData()
    form.querySelectorAll('input').forEach(i => {
      const n = i.getAttribute('name'); const t = (i.getAttribute('type')||'text').toLowerCase()
      if (!n || t === 'submit' || t === 'file') return
      body.append(n, i.getAttribute('value') ?? '')
    })
    body.set('file[files]', JSON.stringify({ [uuid]: { title: fname, encode: true } }))
    body.set('op', 'Submit')
    const sub = await fetch(form.getAttribute('action'), { method: 'POST', credentials: 'include', body })
    return { step: 'done', uuid, submitStatus: sub.status, submitUrl: sub.url }
  })
  console.log(JSON.stringify(result, null, 1))
  // verify revision created
  const revs = await page.evaluate(async () => {
    const t = await (await fetch('/assignment/8339829444', { credentials: 'include', headers: { Accept: 'text/html' } })).text()
    return [...new Set([...t.matchAll(/Revision (\d+)/g)].map(m => m[1]))]
  })
  console.log('revisions now:', revs)
} finally { await browser.close() }
