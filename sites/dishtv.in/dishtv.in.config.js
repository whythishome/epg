const axios = require('axios')
const dayjs = require('dayjs')
const plugins = ['utc', 'timezone', 'customParseFormat']

plugins.forEach(plugin => dayjs.extend(require(`dayjs/plugin/${plugin}`)))

let TOKEN
let tokenPromise = null

module.exports = {
  site: 'dishtv.in',
  days: 2,
  url: 'https://epg.mysmartstick.com/dishtv/api/v1/epg/entities/programs',
  request: {
    method: 'POST',
    headers: getHeaders(),
    data: ({ channel, date }) => ({
      allowPastEvents: true,
      channelid: channel.site_id,
      date: date.format('DD/MM/YYYY')
    })
  },
  parser: ({ channel, content }) => {
    const programs = []
    const items = parseItems(content)
    const lang = channel.lang

    items.forEach(item => {
      const title =
        lang === 'hi' && item.programlanguage !== 'English' && item.regional?.hindi?.title
          ? item.regional.hindi.title
          : item.title

      const description =
        lang === 'hi' && item.programlanguage !== 'English' && item.regional?.hindi?.desc
          ? `${item.regional.hindi.desc}${item['episode-num'] ? ` E${item['episode-num']}` : ''}`
          : `${item.desc}${item['episode-num'] ? ` E${item['episode-num']}` : ''}`
      
      programs.push({
        title,
        description,
        icon: item.programmeurl,
        start: parseTime(item.start),
        stop: parseTime(item.stop)
      })
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
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error parsing content:', error.message)
    return []
  }
}

async function fetchPages(url) {
  try {
    const resp = await axios.post(
      url,
      { pageNum: 1 },
      { headers: { 'authorization-token': (await getHeaders()).Authorization } }
    )
    return resp.data.totalPages || 0
  } catch (error) {
    console.error('Error fetching total pages:', error.message)
    return 0
  }
}

async function fetchToken() {
  try {
    const response = await axios.post('https://www.dishtv.in/services/epg/signin', null, {
      headers: {
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer: 'https://www.dishtv.in/channel-guide.html'
      }
    })

    if (response.data?.token) {
      return response.data.token
    } else {
      throw new Error(`TOKEN not found in the response. Response: ${response.data}`)
    }
  } catch (error) {
    throw new Error(`Error fetching TOKEN: ${error.message}`)
  }
}

async function getHeaders() {
  if (TOKEN) {
    return {
      Authorization: TOKEN
    }
  }

  if (!tokenPromise) {
    tokenPromise = fetchToken()
  }

  try {
    TOKEN = await tokenPromise
  } catch (error) {
    console.error(error.message)
    TOKEN = ''
  } finally {
    tokenPromise = null
  }

  return {
    Authorization: TOKEN
  }
}
