const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'jiotv.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://jiotvapi.jsrdn.com/epg/query.php?range=now,24h&id=${channel.site_id}`
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
    const items = await axios
      .get(
        'https://tsdevil.fun/testing/jtv-apis/v3.0/getMobileChannelList/get/?langid=6&devicetype=phone&os=android&usertype=JIO&version=343',
        { 
          headers: {
            Origin: 'https://www.jiotv.com',
            Referer: 'https://www.jiotv.com'
          } 
        }
      )
      .then(r => r.data.result)
      .catch(console.log)
    let channels = []
    items.forEach(item => {
      channels.push({
        lang: 'en',
        site_id: item.channel_id,
        name: item.channel_name,
        logo: 'https://jiotvimages.cdn.jio.com/dare_images/images/' + item.logoUrl
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
