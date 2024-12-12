const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

module.exports = {
  site: 'tvtv.us',
  delay: 1500, // 1500 ms (otherwise the server returns error 429: https://github.com/iptv-org/epg/issues/2176)
  days: 2,
  url: function ({ date, channel }) {
    return `https://www.tvtv.us/api/v1/lineup/USA-ME18440-X/grid/${date.toJSON()}/${date
      .add(1, 'd')
      .toJSON()}/${channel.site_id}`
  },
  parser: function ({ content }) {
    let programs = []

    const items = parseItems(content)
    items.forEach(item => {
      const start = dayjs.utc(item.startTime)
      const stop = start.add(item.runTime, 'm')
      programs.push({
        title: item.title,
        description: item.subtitle,
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    let channels = []
    const data = await axios
      .get( `https://www.tvtv.us/api/v1/lineup/USA-ME18440-X/channels`, {
        headers : {
          'Referer': 'https://www.tvtv.us',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      }).then(r => r.data)
      .catch(console.log)

    data.data.items.forEach(item => {        
      channels.push({
        lang: 'en',
        site_id: item.stationId,
        name: item.stationCallSign,
        logo: item.logo ? `https://www.tvtv.us${item.logo}` : null
      })
    })

  return channels
  }
}

function parseItems(content) {
  const json = JSON.parse(content)
  if (!json.length) return []
  return json[0]
}

function setHeaders() {
  return {
    'Referer': 'https://www.tvtv.us',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
}
