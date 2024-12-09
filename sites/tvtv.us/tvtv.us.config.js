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
      .get( `https://tvtv.us/api/v1/lineup/USA-ME18440-X/channels`, {
        headers : {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-US,en;q=0.9',
          'priority': 'u=0, i',
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      }).then(r => r.data)
      .catch(console.log)

    data.data.items.forEach(item => {        
      channels.push({
        lang: 'en',
        site_id: item.stationId,
        name: item.stationCallSign,
        logo: item.logo ? `https://tvtv.us${item.logo}` : null
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
    'Referer': 'https://tvtv.us',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
}
