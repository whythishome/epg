const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'dishtv.in',
  days: 2,
  url: function ({ date, channel }) {
    const id = `${channel.site_id}_${date.format('YYYY-MM-DDTHH:mm:ss')}`

    return `https://tvguide.myjcom.jp/api/getEpgInfo/?channels=${id}`
  },
  parser: function ({ content, channel, date }) {
    let programs = []
    const items = parseItems(content, channel, date)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.desc,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const requests = [
      axios.get(
        'https://tvguide.myjcom.jp/api/mypage/getEpgChannelList/?channelType=2&area=108&channelGenre&course&chart&is_adult=true'
      ),
      axios.get(
        'https://tvguide.myjcom.jp/api/mypage/getEpgChannelList/?channelType=3&area=108&channelGenre&course&chart&is_adult=true'
      ),
      axios.get(
        'https://tvguide.myjcom.jp/api/mypage/getEpgChannelList/?channelType=5&area=108&channelGenre&course&chart&is_adult=true'
      ),
      axios.get(
        'https://tvguide.myjcom.jp/api/mypage/getEpgChannelList/?channelType=120&area=108&channelGenre&course&chart&is_adult=true'
      ),
      axios.get(
        'https://tvguide.myjcom.jp/api/mypage/getEpgChannelList/?channelType=200&area=108&channelGenre&course&chart&is_adult=true'
      )
    ]

    let items = []
    await Promise.all(requests)
      .then(responses => {
        for (const r of responses) {
          items = items.concat(r.data.header)
        }
      })
      .catch(console.log)

    return items.map(item => {
      return {
        lang: 'en',
        site_id: item.channel_id,
        name: item.channel_name
      }
    })
  }
}

function parseStart(item) {
  return dayjs.tz(item.programstart.toString(), 'YYYY-MM-DDTHH:mm:ss', 'Asia/Kolkata')
}

function parseStop(item) {
  return dayjs.tz(item.programstop.toString(), 'YYYY-MM-DDTHH:mm:ss', 'Asia/Kolkata')
}

function parseItems(content, channel, date) {
  const id = `${channel.site_id}_${date.format('YYYYMMDD')}`
  const parsed = JSON.parse(content)

  return parsed[id] || []
}
