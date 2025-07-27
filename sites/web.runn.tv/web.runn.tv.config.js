const axios = require('axios')
const dayjs = require('dayjs')
const plugins = ['utc', 'timezone', 'customParseFormat']

plugins.forEach(plugin => dayjs.extend(require(`dayjs/plugin/${plugin}`)))

let TOKEN
let tokenPromise = null

module.exports = {
  site: 'web.runn.tv',
  days: 1,
  url({ channel }) {
    return `https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`
  },
  request: {
    method: 'GET',
    headers: {
      userid: '0D-62-2D-15-FD-CE'
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
