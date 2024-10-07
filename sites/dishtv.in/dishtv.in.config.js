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
  site: 'dishtv.in',
  days: 1,
  url: 'https://epg.mysmartstick.com/dishtv/api/v1/epg/entities/programs',
  request: {
    method: 'POST',
    headers: function() {
      return setHeaders()
    },
    data({
      channel,
      date
    }) {
      return {
        allowPastEvents: true,
        channelid: channel.site_id,
        date: date.format('DD/MM/YYYY')
      }
    }
  },
  parser: function({
    content
  }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.desc,
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
  return dayjs.utc(item.start, 'YYYY-MM-DDTHH:mm:ss')
}

function parseStop(item) {
  return dayjs.utc(item.stop, 'YYYY-MM-DDTHH:mm:ss')
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data)) return []

  return data
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
  return fetchToken().then(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': TOKEN
    }
  })
}
