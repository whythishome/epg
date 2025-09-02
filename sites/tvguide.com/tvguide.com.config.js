const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const debug = require('debug')('site:tvguide.com')

dayjs.extend(utc)
dayjs.extend(timezone)

const providerId = '9100002976'
const maxDuration = 240
const segments = 1440 / maxDuration
const headers = {
  'referer': 'https://www.tvguide.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
}

const east_channels = [
  '5StarMax', 'ABC Network Feed', 'ActionMax', 'A&E', 'AMC', 'Animal Planet', 'BBC America',
  'BET', 'BET Her', 'Bravo', 'Cartoon Network', 'CBS National', 'Cinemax', 'CMT', 'Comedy Central',
  'Discovery', 'Disney', 'Disney Junior', 'Disney XD', 'E!', 'Flix', 'Food Network', 'FOX', 'Freeform',
  'Fuse HD', 'FX', 'FXX', 'FYI', 'Game Show Network', 'Hallmark', 'Hallmark Mystery', 'HBO 2',
  'HBO Comedy', 'HBO', 'HBO Family', 'HBO Signature', 'HBO Zone', 'HGTV', 'History', 'IFC',
  'Investigation Discovery', 'ION', 'Lifetime', 'LMN', 'LOGO', 'MAGNOLIA Network', 'MGM+ Hits HD',
  'MoreMax', 'MovieMax', 'MTV2', 'MTV', 'National Geographic', 'National Geographic Wild', 'NBC National',
  'Nickelodeon', 'Nick Jr.', 'Nicktoons', 'OuterMax', 'OWN', 'Oxygen', 'Paramount Network', 'PBS HD',
  'Pop Network', 'SHOWTIME 2', 'Paramount+ with Showtime', 'SHOWTIME EXTREME', 'SHOWTIME FAMILY ZONE',
  'SHOWTIME NEXT', 'SHOWTIME SHOWCASE', 'SHOWTIME WOMEN', 'SHOxBET', 'Smithsonian', 'STARZ Cinema',
  'STARZ Comedy', 'STARZ', 'STARZ Edge', 'STARZ ENCORE Action', 'STARZ ENCORE Black',
  'STARZ ENCORE Classic', 'STARZ ENCORE', 'STARZ ENCORE Family', 'STARZ ENCORE Suspense',
  'STARZ ENCORE Westerns', 'STARZ InBlack', 'STARZ Kids & Family', 'Sundance TV', 'Syfy', 'tbs',
  'Turner Classic Movies', 'TeenNick', 'Telemundo', 'The Movie', 'The Movie Xtra', 'ThrillerMax', 'TLC',
  'TNT', 'Travel', 'truTV', 'TV Land', 'Universal Kids', 'USA', 'VH1', 'WE tv', 'Univision'
]

// simple sleep helper
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// shared in-memory cache for program detail responses (per run)
const detailsCache = new Map()

// GET with retry/backoff for transient 403/429/5xx
async function getWithRetry(url, { headers }, maxRetries = 4) {
  let attempt = 0
  let lastErr
  while (attempt <= maxRetries) {
    try {
      return await axios.get(url, {
        headers,
        timeout: 15000,
        validateStatus: s => s >= 200 && s < 300
      })
    } catch (err) {
      lastErr = err
      const status = err?.response?.status
      // backoff only for rate limit or transient server errors
      if (status === 403 || status === 429 || (status >= 500 && status < 600)) {
        const delay = Math.min(8000, 500 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250)
        debug(`Retry ${attempt + 1}/${maxRetries} for ${url} after ${delay}ms due to status ${status}`)
        await sleep(delay)
        attempt++
        continue
      }
      throw err
    }
  }
  throw lastErr
}

module.exports = {
  site: 'tvguide.com',
  days: 7,
  request: {
    headers: function () {
      return headers
    },
    responseType: 'application/json',
    decompress: true,
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  async url({ date, channel, segment = 1 }) {    
    let effectiveProviderId = providerId
    let channelSourceIds
    if (channel && typeof channel.site_id === 'string' && channel.site_id.includes('#')) {
      const parts = channel.site_id.split('#')
      effectiveProviderId = parts[0] || effectiveProviderId
      channelSourceIds = parts[1]
    }
    const params = []
    if (module.exports.apiKey === undefined) {
      module.exports.apiKey = await module.exports.fetchApiKey()
      debug('Got api key', module.exports.apiKey)
    }
    if (date) {
      if (segment > 1) {
        date = date.add((segment - 1) * maxDuration, 'm')
      }
      params.push(`start=${date.unix()}`, `duration=${maxDuration}`)
      if (channelSourceIds) params.push(`channelSourceIds=${channelSourceIds}`)
    }
    params.push(`apiKey=${module.exports.apiKey}`)

    return date ?
      `https://backend.tvguide.com/tvschedules/tvguide/${effectiveProviderId}/web?${params.join('&')}` :
      `https://backend.tvguide.com/tvschedules/tvguide/serviceprovider/${effectiveProviderId}/sources/web?${params.join('&')}`
  },
  async parser({ content, date, channel, fetchSegments = true }) {
    const programs = []
    const f = data => {
      const result = []
      if (typeof data === 'string') {
        data = JSON.parse(data)
      }
      if (data && Array.isArray(data?.data?.items)) {
        data.data.items
          .filter(i => {
            // support both old and new forms of site_id
            const siteId = typeof channel.site_id === 'string' ? channel.site_id : `${channel.site_id}`
            const sourceId = (siteId.includes('#') ? siteId.split('#')[1] : siteId)
            return i.channel.sourceId.toString() === sourceId
          })
          .forEach(i => {
            result.push(...i.programSchedules.map(p => {
              return { i: p, url: p.programDetails }
            }))
          })
      }

      return result
    }
    // dedupe by programDetails URL to minimize requests
    const queues = []
    const seen = new Set()
    for (const q of f(content)) {
      if (!seen.has(q.url)) {
        seen.add(q.url)
        queues.push(q)
      }
    }
    if (queues.length && fetchSegments) {
      for (let segment = 2; segment <= segments; segment++) {
        const segmentUrl = await module.exports.url({ date, channel, segment })
        debug(`fetch segment ${segment}: ${segmentUrl}`)
        try {
          const res = await getWithRetry(segmentUrl, { headers })
          for (const q of f(res.data)) {
            if (!seen.has(q.url)) {
              seen.add(q.url)
              queues.push(q)
            }
          }
        } catch (err) {
          debug(`Failed to fetch segment ${segment}: ${err.message}`)
        }
      }
    }
    for (const queue of queues) {
      try {
        let item
        if (detailsCache.has(queue.url)) {
          item = detailsCache.get(queue.url)
        } else {
          const res = await getWithRetry(queue.url, { headers })
          item = res.data?.data?.item || queue.i
          // cache only if we got enriched data
          detailsCache.set(queue.url, item)
          // small jitter to be polite
          await sleep(50 + Math.floor(Math.random() * 50))
        }            
        // Extract necessary properties
        const episodeTitle = item.title || queue.i.title;
        const description = item?.description || '';
        const seasonNumber = item?.seasonNumber || '';
        const episodeNumber = item?.episodeNumber || '';
        const releaseYear = item?.releaseYear || '';
        const tvRating = item?.tvRating || '';
        const firstGenre = item?.genres?.[0]?.name || '';
        const secondGenre = item?.genres?.[1]?.name || '';
        const episodeAirDate = item?.episodeAirDate || '';
        
        // Extract the timestamp and convert it to a Date object
        const timestamp = episodeAirDate.match(/\/Date\((\d+)\)\//);
        const airDate = timestamp ? new Date(parseInt(timestamp[1])) : null;
      
        // Format the date if it exists
        const formattedDate = airDate ? airDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '';

        // Create the new description variable conditionally
        let newDescription = '';
        if (episodeTitle) newDescription += `${episodeTitle}`;
        if (seasonNumber && episodeNumber) newDescription += ` - S${seasonNumber}E${episodeNumber}.`;
        newDescription += ` ${description}`;
        // if (tvRating) newDescription += ` ${tvRating}.`;
        // if (firstGenre) newDescription += ` ${firstGenre}`;
        // if (secondGenre) newDescription += `/${secondGenre}`;
        if (formattedDate) newDescription += ` (${formattedDate})`;

        if (details.type == 'movie') {
          newDescription = description;
          // if (tvRating) newDescription += ` ${tvRating}.`;
          // if (firstGenre) newDescription += ` ${firstGenre}`;
          // if (secondGenre) newDescription += `/${secondGenre}`;
          if (releaseYear) newDescription += ` (${releaseYear})`;
        }
        programs.push({
          title: item.title || queue.i.title,
          sub_title: item.episodeNumber ? item.episodeTitle : null,
          description: newDescription.trim(), // Trim any leading/trailing whitespace
          season: item.seasonNumber,
          episode: item.episodeNumber,
          rating: item.rating ? { system: 'MPA', value: item.rating } : null,
          categories: Array.isArray(item.genres) ? item.genres.map(g => g.name) : null,
          start: dayjs.unix(item.startTime || queue.i.startTime),
          stop: dayjs.unix(item.endTime || queue.i.endTime),
        })
      } catch (err) {
        debug(`Failed to fetch program details ${queue.url}: ${err.message}`)
      }
    }
    return programs
  },
  async channels() {
    const channels = []
    try {
      const data = await getWithRetry(await this.url({}), { headers })
        .then(r => r.data)
      data.data.items.forEach(item => {
        const finalName = item.fullName.replace(/Channel|Schedule/g, '').trim()
        const isEast = east_channels.some(name => name.toLowerCase().includes(finalName.toLowerCase()))
        channels.push({
          lang: 'en',
          site_id: `${providerId}#${item.sourceId}`,
          xmltv_id: finalName.replaceAll(/[ '&]/g, '') + '.us' + (isEast ? '@East' : ''),
          name: finalName,
        })
      })
    } catch (err) {
      console.error('Failed to fetch channels:', err.message)
    }
    return channels
  },
  async fetchApiKey() {
    try {
      const data = await axios
        .get('https://www.tvguide.com/listings/')
        .then(r => r.data)
      return data ? data.match(/apiKey=([a-zA-Z0-9]+)&/)[1] : null
    } catch (err) {
      console.error('Failed to fetch API key:', err.message)
      return null
    }
  }
}
