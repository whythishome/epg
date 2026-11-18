const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'distro.tv',
  days: 1,
  url: function ({ date, channel }) {
    return `https://tv.jsrdn.com/epg/query.php?range=now,24h&id=${channel.site_id}`
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    const slots = items.epg[channel.site_id].slots
    slots.forEach(item => {
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
    const response = await axios
      .get(
        'https://tv.jsrdn.com/tv_v5/getfeed.php?type=live',
      )
      .catch(console.log)
    console.log(response.data.env)
    const data = Object.values(response.data.shows);
    let channels = []
    data.forEach(item => {
      channels.push({
        lang: 'en',
        site_id: item.seasons[0].episodes[0].id,
        name: item.seasons[0].episodes[0].title,
        logo: item.img_logo
      })
    })
    return channels
  }
}

function parseStart(item) {
  return dayjs(item.start)
}

function parseStop(item) {
  return dayjs(item.end)
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  return data ? data : []
}
