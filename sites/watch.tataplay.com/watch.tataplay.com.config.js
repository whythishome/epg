const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

let TOKEN

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'watch.tataplay.com',
  days: 2,
  url: function ({ date }) {
    return `https://tm.tapi.videoready.tv/content-detail/pub/api/v2/channels/schedule?date=${date.format('DD-MM-YYYY')}`
  },
  request: {
    method: 'POST',
    headers: function() {
      return setHeaders()
    },
    data({ channel, date }) {
      return {
        id: channel.site_id
      }
    }
  },
  parser: function({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.desc,
        icon: item.boxCoverImage,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })
    return programs
  }
  // async channels() {
  //   let channels = []
  //   const url = 'https://www.dishtv.in/services/epg/channels'
  //   const params = {
  //     headers: await setHeaders()
  //   }
  //   const pages = await fetchPages()

  //   for (let i = 0; i < Number(pages); i++) {
  //     const body = {
  //       pageNum: i + 1
  //     }
  //     const data = await axios
  //       .post(url, body, params)
  //       .then(r => r.data)
  //       .catch(console.log)

  //     data.programDetailsByChannel.forEach(channel => {
  //       if (channel.channelname === '.') return
  //       channels.push({
  //         lang: 'en',
  //         site_id: channel.channelid,
  //         name: channel.channelname
  //       })
  //     })
  //   }

  //   return channels
  // }
}

function parseStart(item) {
  return dayjs(item.startTime).format('YYYY-MM-DDTHH:mm:ss')
}

function parseStop(item) {
  return dayjs(item.endTime).format('YYYY-MM-DDTHH:mm:ss')
}

function parseItems(content) {
  try {
    const data = JSON.parse(content)
    const epg = data.data.epg

    return epg
  } catch (e) {
    return []
  }
}

async function fetchPages() {
  const url = 'https://www.dishtv.in/services/epg/channels'
  const body = {
    pageNum: 1,
  }
  const params = {
    headers: await setHeaders()
  }
  const data = await axios
    .post(url, body, params)
    .then(r => r.data)
    .catch(console.log)

  return data.pageNum
}

// Function to try to fetch TOKEN
function fetchToken() {
  return fetch(
      'https://www.dishtv.in/services/epg/signin', {
        headers: {
          accept: 'application/json, text/javascript, */*; q=0.01',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'x-requested-with': 'XMLHttpRequest',
          Referer: 'https://www.dishtv.in/channel-guide.html'
        },
        method: 'POST'
      }
    )
    .then(response => {
      // Check if the response status is OK (2xx)
      if (!response.ok) {
        throw new Error('HTTP request failed')
      }
      return response.json()
    })
    .then(data => {
      if (data.token) {
        TOKEN = data.token
      } else {
        console.log('TOKEN not found in the response.')
      }
    })
    .catch(error => {
      console.error(error)
    })
}

function setHeaders() {
  return {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Origin': 'https://watch.tataplay.com',
    'Pragma': 'no-cache',
    'Referer': 'https://watch.tataplay.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'content-type': 'application/json',
    'locale': 'ENG',
    'platform': 'web',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
}
