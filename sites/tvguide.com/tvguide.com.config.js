const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tvguide.com',
  delay: 5000,
  days: 2,
  url: function ({ date, channel }) {
    const [providerId, channelSourceIds] = channel.site_id.split('#')
    const url = `https://backend.tvguide.com/tvschedules/tvguide/${providerId}/web?start=${date
      .startOf('d')
      .unix()}&duration=1200&channelSourceIds=${channelSourceIds}`

    return url
  },
  request: {
    method: 'GET',
    headers: function() {
      return setHeaders()
    }
  },
  async parser({ content }) {
    const programs = [];
    const items = parseItems(content);
    for (let item of items) {
      // const details = await loadProgramDetails(item)
      // programs.push({
      //   title: item.title,
      //   sub_title: details.episodeTitle,
      //   description: details.description,
      //   season: details.seasonNumber,
      //   episode: details.episodeNumber,
      //   rating: parseRating(item),
      //   categories: parseCategories(details),
      //   start: parseTime(item.startTime),
      //   stop: parseTime(item.endTime)
      // })
      programs.push({
        title: item.title,
        start: parseTime(item.startTime),
        stop: parseTime(item.endTime)
      })
    }
    return programs
  },
  async channels() {
    const providers = [9100001138]

    let channels = []
    for (let providerId of providers) {
      const data = await axios
        .get(
          `https://backend.tvguide.com/tvschedules/tvguide/serviceprovider/${providerId}/sources/web`
        )
        .then(r => r.data)
        .catch(console.log)

      data.data.items.forEach(item => {        
        channels.push({
          lang: 'en',
          site_id: `${providerId}#${item.sourceId}`,
          name: item.fullName,
          logo: item.logo ? `https://www.tvguide.com/a/img/catalog${item.logo}` : null
        })
      })
    }

    return channels
  }
}

function parseRating(item) {
  return item.rating ? { system: 'MPA', value: item.rating } : null
}

function parseCategories(details) {
  return Array.isArray(details.genres) ? details.genres.map(g => g.name) : []
}

function parseTime(timestamp) {
  return dayjs.unix(timestamp)
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data.data || !Array.isArray(data.data.items) || !data.data.items.length) return []

  return data.data.items[0].programSchedules
}

async function loadProgramDetails(item) {
  const data = await axios
    .get(item.programDetails, {
        headers: function() {
          return setHeaders()
        }
    }).then(r => r.data)
    .catch(err => {
      console.log(err.message)
    });
  if (!data || !data.data || !data.data.item) return {}

  return data.data.item
}

function setHeaders() {
  return {
    'Referer': 'https://www.tvguide.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
}
