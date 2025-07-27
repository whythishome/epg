const axios = require('axios')
const dayjs = require('dayjs')
const plugins = ['utc', 'timezone', 'customParseFormat']

plugins.forEach(plugin => dayjs.extend(require(`dayjs/plugin/${plugin}`)))

let TOKEN
let tokenPromise = null

module.exports = {
  site: 'web.runn.tv',
  days: 2,
  url({ channel }) {
    return `https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`
  },
  request: {
    method: 'GET',
    headers: function() {
      return getHeaders();
    }
  },
  parser: ({ channel, content }) => {
    const programs = []
    const items = parseItems(content)
    const lang = channel.lang

    items.forEach(item => {      
      const durMs = item.durationSeconds * 1000;
      const endMs = item.startTime + durMs;
      programs.push({
        title: item.programName,
        description: item.description,
        icon: item.infoImages.web,
        start: parseTime(item.startTime),
        stop: parseTime(endMs)
      });
    })

    return programs
  },
  async channels({ lang }) {
    const totalPages = await fetchPages('https://www.dishtv.in/services/epg/channels')

    const channels = []
    for (let i = 0; i < Number(totalPages); i++) {
      const body = new FormData()
      body.append('pageNum', i + 1)

      try {
        const resp = await axios.post('https://www.dishtv.in/services/epg/channels', body, {
          headers: { 'authorization-token': (await getHeaders()).Authorization }
        })
        resp.data.programDetailsByChannel.forEach(channel => {
          if (channel.channelname !== '.') {
            channels.push({
              lang,
              site_id: channel.channelid,
              name: channel.channelname,
              logo: channel.channelimage
            })
          }
        })
      } catch (error) {
        console.error(`Error fetching channels on page ${i + 1}:`, error.message)
      }
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
    return Array.isArray(data.schedules) ? data.schedules : []
  } catch (error) {
    console.error('Error parsing content:', error.message)
    return []
  }
}

async function getHeaders() {
  return {
    'userid': '0D-62-2D-15-FD-CE'
  };
}
