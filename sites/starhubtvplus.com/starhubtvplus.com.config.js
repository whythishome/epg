const axios = require('axios')
const dayjs = require('dayjs')

const APP_KEY = '5ee2ef931de1c4001b2e7fa3_5ee2ec25a0e845001c1783dc'
const SESSION_KEY = '01G2QG0N3RWDNCBA1S5MK1MD2K17CE4431A2'

module.exports = {
  site: 'starhubtvplus.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://waf-starhub-metadata-api-p001.ifs.vubiquity.com/v3.1/epg/schedules?locale=en_US&locale_default=en_US&device=1&in_channel_id=${channel.site_id}&gt_end=${date.unix()}&lt_start=${date.add(1, 'd').unix()}&limit=100&page=1`
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.description,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const items = await axios
      .get(
        'https://waf-starhub-metadata-api-p001.ifs.vubiquity.com/v3.1/epg/channels?locale=en_US&locale_default=en_US&device=1&limit=200&page=1',
      )
      .then(r => r.data.resources)
      .catch(console.log)

    return items.map(item => ({
      lang: 'en',
      site_id: item.id,
      name: item.title.replace('_DASH', ''),
      logo: item.pictures[0] ? item.pictures[0].url : null
    }))
  }
}

function parseStart(item) {
  return dayjs.unix(item.start)
}

function parseStop(item) {
  return dayjs.unix(item.end)
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  return data.resources ? data.resources : []
}
