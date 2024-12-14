const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tvguide.com',
  delay: 2500,
  days: 1,
  url: function ({ date, channel }) {
    const [providerId, channelSourceIds] = channel.site_id.split('#')
    const url = `https://backend.tvguide.com/tvschedules/tvguide/${providerId}/web?start=${date
      .startOf('d')
      .unix()}&duration=12000&channelSourceIds=${channelSourceIds}&apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`

    return url
  },
  request: {
    method: 'GET',
    headers: {
      'Referer': 'https://www.tvguide.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  },
  async parser({ content }) {
    const programs = [];
    const items = parseItems(content);
    for (let item of items) {
      const details = await loadProgramDetails(item)
      programs.push({
        title: item.title,
        description: details.description,
        start: parseTime(item.startTime),
        stop: parseTime(item.endTime)
      })
    }
    return programs
  },
  async channels() {
    const providers = [9133001044]

    let channels = []
    for (let providerId of providers) {
      const data = await axios
        .get(
          `https://backend.tvguide.com/tvschedules/tvguide/serviceprovider/${providerId}/sources/web?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`
        )
        .then(r => r.data)
        .catch(console.log)

      data.data.items.forEach(item => {
        channels.push({
          lang: 'en',
          site_id: `${providerId}#${item.sourceId}`,
          name: item.fullName,
          logo: item.logo ? `https://www.tvguide.com/a/img/catalog${item.logo}` : null
        })
      })
    }

    return channels
  }
}

function parseRating(item) {
  return item.rating ? { system: 'MPA', value: item.rating } : null
}

function parseCategories(details) {
  return Array.isArray(details.genres) ? details.genres.map(g => g.name) : []
}

function parseTime(timestamp) {
  return dayjs.unix(timestamp)
}

function parseItems(content) {
  const data = JSON.parse(content)
  if (!data.data || !Array.isArray(data.data.items) || !data.data.items.length) return []

  return data.data.items[0].programSchedules
}

async function loadProgramDetails(item) {
  const programDetailsUrl = `${item.programDetails}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`;
  const data = await makeRequest(programDetailsUrl, { headers: setHeaders() });
  if (!data || !data.data || !data.data.item) return {}

  return data.data.item
}

function setHeaders() {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://www.tvguide.com',
    'priority': 'u=1, i',
    'referer': 'https://www.tvguide.com/',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
}

async function makeRequest(url, options) {
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('Received 403 error, making a call to https://www.tvguide.com/listings/');
      await axios.get('https://www.tvguide.com/listings/', { headers: setHeaders() });
      console.log('Retrying the original URL');
      return makeRequest(url, options); // Retry the original request
    } else {
      console.log('Error:', error.message);
      throw error;
    }
  }
}
