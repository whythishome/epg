const axios = require('axios')
const dayjs = require('dayjs')

const APP_KEY = '5ee2ef931de1c4001b2e7fa3_5ee2ec25a0e845001c1783dc'
const SESSION_KEY = '01G2QG0N3RWDNCBA1S5MK1MD2K17CE4431A2'

module.exports = {
  site: 'distro.tv',
  days: 1,
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
    const data = await axios
      .get(
        'https://tv.jsrdn.com/tv_v5/getfeed.php?type=live',
      )
      .then(r => r.data.shows)
      .catch(console.log)
    
    // Add this check to ensure that items is an array
    if (!Array.isArray(data)) {
      console.error('Items is not an array:', items);
      return [];
    }

    let channels = []
    data.forEach(item => {
      const channelData = item.seasons[0].episodes[0];
      channels.push({
        lang: 'en',
        site_id: channelData.id,
        name: channelData.title,
        logo: channelData.img_thumbv
      })
    })
    return channels
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
