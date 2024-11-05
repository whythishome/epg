const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'jiotv.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://tsdevil.fun/testing/jtv-apis/v1.3/getepg/get?channel_id=${channel.site_id}&offset=0`
  },
  request: {
    method: 'GET',
    headers: {
      Origin: 'https://www.jiotv.com',
      Referer: 'https://www.jiotv.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
    }
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
            Referer: 'https://www.jiotv.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
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
