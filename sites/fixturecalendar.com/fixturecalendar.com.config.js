const axios = require('axios')
const dayjs = require('dayjs')

module.exports = {
  site: 'fixturecalendar.com',
  days: 1,
  url: function ({ date, channel }) {
    return `https://api.fixturecalendar.com/api/v1/fixtures?sport=${channel.name}&startDate=${date.format('DD/MM/YYYY')}&endDate=${date.add(4, 'd').format('DD/MM/YYYY')}`
  },
  request: {
    method: 'GET',
    headers: function() {
      return setHeaders()
    }
  },
  parser: function ({ content, channel }) {
    let programs = [];
    const items = parseItems(content);
    items.forEach(item => {
      programs.push({
        title: parseTitle(item),
        description: parseDescription(item),
        start: parseStart(item),
        stop: parseStop(item)
      });
    });
    return programs;
  },
  async channels() {
    const headers = setHeaders();
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
      logo: item.picture ? item.picture : ''
    }))
  }
}

function parseStart(item) {
  return dayjs(item.startTime)
}

function parseStop(item) {
  return dayjs(item.endTime)
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data.events || !Array.isArray(data.events)) return []
  return data.events
}

function parseTitle(item) {
  const name = item.competition.name || '';
  const homeTeamName = item.homeTeam.name || '';
  const guestTeamName = item.guestTeam.name || '';
  const title = `${name} - ${homeTeamName} vs ${guestTeamName}`;
  return title;
}

function parseDescription(item) {
  const stadiumName = item.location.place.name || '';
  const cityName = item.location.city.name || '';
  const countryName = item.location.country.name || '';
  const description = `LIVE action from ${stadiumName} in ${cityName}, ${countryName}`;
  return description;
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
