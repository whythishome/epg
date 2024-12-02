const axios = require('axios')
const dayjs = require('dayjs')

const APP_KEY = '5ee2ef931de1c4001b2e7fa3_5ee2ec25a0e845001c1783dc'
const SESSION_KEY = '01G2QG0N3RWDNCBA1S5MK1MD2K17CE4431A2'

module.exports = {
  site: 'starhubtvplus.com',
  days: 2,
  url: function ({ date, channel }) {
    return `https://api.fixturecalendar.com/api/v1/fixtures?startDate=${date.format('DD/MM/YYYY')}&endDate=${date.add(1, 'd').format('DD/MM/YYYY')}`
  },
  request: {
    method: 'GET',
    headers: function() {
      return setHeaders()
    }
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      programs.push({
        title: parseTitle(item),
        description: item.description,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const headers = getHeaders();
    const items = await axios
      .get(
        'https://api.fixturecalendar.com/api/v1/sports', {
        headers: headers
      })
      .then(r => r.data)
      .catch(console.log)

    return items.map(item => ({
      lang: 'en',
      site_id: item.id,
      name: item.name,
      logo: item.pictures ? item.pictures : ''
    }))
  }
}

function parseStart(item) {
  return dayjs(item.startTime)
}

function parseStop(item) {
  return dayjs(item.endTime)
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  return data.events ? data.events : []
}

function parseTitle(item) {
  // Extract the necessary fields
  const name = item.name || '';
  const homeTeamName = item.homeTeam.name || '';
  const guestTeamName = item.guestTeam.name || '';
  // Concatenate the fields
  const title = `${name} - ${homeTeamName} ${guestTeamName}`;
  return title;
}
}

function setHeaders() {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Origin': 'https://www.fixturecalendar.com',
    'Pragma': 'no-cache',
    'Referer': 'https://www.fixturecalendar.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
}
