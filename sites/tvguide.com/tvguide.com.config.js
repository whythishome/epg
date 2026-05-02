name: Festy TVGuide

on:
  workflow_dispatch:
  schedule:
    - cron: "0 */12 * * *"

permissions:
  contents: write

jobs:
  build-festy-tvguide:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout your repo
        uses: actions/checkout@v4

      - name: Clone IPTV-org EPG engine
        run: |
          rm -rf epg
          git clone --depth 1 https://github.com/iptv-org/epg.git epg

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install EPG dependencies
        run: |
          cd epg
          npm install

      - name: Copy Festy TVGuide channels and custom config
        run: |
          mkdir -p epg/sites/tvguide.com
          cp guides/festy.channels.xml epg/sites/tvguide.com/festy.channels.xml

          cat > epg/sites/tvguide.com/tvguide.com.config.js <<'EOF'
          const axios = require('axios')
          const dayjs = require('dayjs')
          const utc = require('dayjs/plugin/utc')
          const timezone = require('dayjs/plugin/timezone')

          dayjs.extend(utc)
          dayjs.extend(timezone)

          module.exports = {
            site: 'tvguide.com',
            delay: 3000,
            days: 2,

            url({ date, channel }) {
              const [providerId, sourceId] = String(channel.site_id).split('#')
              return `https://backend.tvguide.com/tvschedules/tvguide/${providerId}/web?start=${date.startOf('d').unix()}&duration=10240&channelSourceIds=${sourceId}&apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`
            },

            request: {
              method: 'GET',
              timeout: 10000,
              cache: { ttl: 60 * 60 * 1000 },
              headers() {
                return {
                  Referer: 'https://www.tvguide.com/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
                }
              }
            },

            async parser({ content }) {
              const programs = []
              const items = parseItems(content)

              for (const item of items) {
                const details = await loadProgramDetails(item)

                const title = cleanTitle(item.title || details.title || '')
                const episodeTitle = cleanSpaces(details.episodeTitle || '')
                const description = fixBrokenDescription(details.description || item.description || '')
                const seasonNumber = details.seasonNumber || ''
                const episodeNumber = details.episodeNumber || ''
                const releaseYear = details.releaseYear || ''
                const episodeAirDate = details.episodeAirDate || ''
                const type = String(details.type || item.type || '').toLowerCase()

                const episodeCode =
                  seasonNumber && episodeNumber
                    ? `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
                    : ''

                const airDate = formatTVGuideDate(episodeAirDate) || formatUnixDate(item.startTime)

                let finalDescription = ''

                if (type === 'movie') {
                  finalDescription = description
                  if (releaseYear) finalDescription = finalDescription ? `${finalDescription} (${releaseYear})` : `(${releaseYear})`
                } else {
                  let prefix = ''

                  if (episodeTitle && episodeCode) prefix = `${episodeTitle} - ${episodeCode}`
                  else if (episodeTitle) prefix = episodeTitle
                  else if (episodeCode) prefix = episodeCode

                  if (prefix && description) finalDescription = `${prefix}. ${description}`
                  else if (prefix) finalDescription = `${prefix}.`
                  else finalDescription = description

                  if (airDate) finalDescription = finalDescription ? `${finalDescription} (${airDate})` : `(${airDate})`
                }

                programs.push({
                  title,
                  description: cleanSpaces(finalDescription),
                  start: dayjs.unix(item.startTime),
                  stop: dayjs.unix(item.endTime)
                })
              }

              return programs
            }
          }

          async function loadProgramDetails(item) {
            if (!item.programDetails) return {}

            const url = item.programDetails.includes('?')
              ? `${item.programDetails}&apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`
              : `${item.programDetails}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`

            return axios
              .get(url, {
                timeout: 10000,
                headers: {
                  Referer: 'https://www.tvguide.com/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
                }
              })
              .then(r => r.data?.data?.item || {})
              .catch(() => ({}))
          }

          function parseItems(content) {
            const data = JSON.parse(content)
            return data?.data?.items?.[0]?.programSchedules || []
          }

          function cleanTitle(value) {
            return String(value || '')
              .replace(/\s+/g, ' ')
              .replace(/^\s*(New|Live|Repeat)\s*[:\-]\s*/i, '')
              .replace(/\s*\((New|Live|Repeat)\)\s*$/i, '')
              .replace(/\s*[-–—]\s*(New|Live|Repeat)\s*$/i, '')
              .trim()
          }

          function cleanSpaces(value) {
            return String(value || '')
              .replace(/\s+/g, ' ')
              .replace(/\s+([.,!?;:])/g, '$1')
              .replace(/([.,!?;:])([A-Za-z0-9])/g, '$1 $2')
              .trim()
          }

          function fixBrokenDescription(value) {
            let d = cleanSpaces(value)
            if (!d) return ''

            d = d.replace(/\.\.\.$/, '').trim()
            d = d.replace(/[,:;–—-]\s*$/, '').trim()

            const words = d.split(/\s+/)
            const last = words[words.length - 1] || ''
            const stripped = last.toLowerCase().replace(/[^a-z]/g, '')

            const badEndings = [
              'stor', 'storie', 'experienc', 'becaus', 'includ', 'discover',
              'investigat', 'myster', 'famil', 'friend', 'someth', 'everyth',
              'meanwhil', 'continu', 'return', 'learn', 'realiz'
            ]

            if (badEndings.includes(stripped) && words.length > 1) {
              words.pop()
              d = words.join(' ').trim()
            }

            if (!/[.!?]$/.test(d)) d += '.'
            return d
          }

          function formatTVGuideDate(value) {
            const match = String(value || '').match(/\/Date\((\d+)\)\//)
            if (!match) return ''
            const date = new Date(Number(match[1]))
            return date.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })
          }

          function formatUnixDate(value) {
            if (!value) return ''
            return dayjs.unix(value).format('MM/DD/YYYY')
          }
          EOF

      - name: Grab TVGuide guide - 2 days
        run: |
          cd epg
          npx tsx scripts/commands/epg/grab.ts \
            --channels=sites/tvguide.com/festy.channels.xml \
            --output=../guide.xml \
            --days=2

          cd ..
          if [ ! -s guide.xml ]; then
            echo "guide.xml was not created or is empty"
            exit 1
          fi

          ls -lh guide.xml

      - name: Commit guide
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"

          git add guide.xml

          if git diff --cached --quiet; then
            echo "No guide changes to commit"
          else
            git commit -m "Update Festy TVGuide guide"
            git push
          fi
