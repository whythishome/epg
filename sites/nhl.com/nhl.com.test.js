const { parser, url } = require('./nhl.com.config.js')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
dayjs.extend(utc)

const date = dayjs.utc('2024-11-21', 'YYYY-MM-DD').startOf('d')

it('can generate valid url', () => {
  expect(url({ date })).toBe('https://api-web.nhle.com/v1/network/tv-schedule/2024-11-21')
})

it('can parse response', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.json'))
  let results = parser({ content, date })
  results = results.map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(results[0]).toMatchObject({
    start: '2024-11-21T12:00:00.000Z',
    stop: '2024-11-21T13:00:00.000Z',
    title: 'On The Fly',
    category: 'Sports'
  })
})

it('can handle empty guide', () => {
  const results = parser({
    content: JSON.stringify({
      // extra props not necessary but they form a valid response
      date: '2024-11-21',
      startDate: '2024-11-07',
      endDate: '2024-12-05',
      broadcasts: []
    })
  })
  expect(results).toMatchObject([])
})
