const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'jiotv.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://tsdevil.fun/testing/jtv-apis/getepg?id=${channel.site_id}&offset=0`
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      programs.push({
        title: item.showname,
        description: item.episode_num ? item.description + ' E' + item.episode_num : item.description,
        image: 'https://jiotvimages.cdn.jio.com/dare_images/shows/700/-/' + item.episodePoster,
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
  return dayjs.unix(item.startEpoch)
}

function parseStop(item) {
  return dayjs.unix(item.endEpoch)
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  return data.epg ? data.epg : []
}
