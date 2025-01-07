const axios = require('axios')
const dayjs = require('dayjs')
const plugins = ['utc', 'timezone', 'customParseFormat']

plugins.forEach(plugin => dayjs.extend(require(`dayjs/plugin/${plugin}`)))

let TOKEN
let tokenPromise = null

module.exports = {
  site: 'sunnxt.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://pwaapi.sunnxt.com/epg/v2/channelEPG/${channel.site_id}?date=${date.format('YYYY-MM-DD')}&level=epgstatic&imageProfile=mdpi&count=100&startIndex=1&orderBy=siblingOrder&orderMode=1`
  },
  request: {
    method: 'GET',
    headers: {
      Referer: 'https://www.sunnxt.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  },
  parser: ({ channel, content }) => {
    const programs = []
    const items = parseItems(content)
    items.results.forEach(item => {
      programs.push({
        title: item.title,
        icon: item.images.values[0].link,
        start: parseTime(item.startDate),
        stop: parseTime(item.endDate)
      })
    })

    return programs
  },
  async channels({ lang }) {
    const channels = []
    try {
      const resp = await axios.get('https://pwaapi.sunnxt.com/content/v2/contentList?type=live&fields=images,generalInfo&startIndex=1&count=100&orderBy=siblingOrder&orderMode=1&language=', body, {
        headers: {
          Referer: 'https://www.sunnxt.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      })
      console.log(resp.data)
      resp.data.results.forEach(channel => {
          channels.push({
            lang: 'en',
            site_id: channel._id,
            name: channel.title,
            logo: channel.images.values[5].link
          })
      })
    } catch (error) {
      console.error(error.message)
    }
    return channels
  }
}

function parseTime(timestamp) {
  return dayjs.tz(timestamp, 'YYYY-MM-DDTHH:mm:ss', 'Asia/Kolkata')
}

function parseItems(content) {
  try {
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error parsing content:', error.message)
    return []
  }
}
