import chalk from 'chalk'
import { request } from '@octokit/request'
import { getInput } from '@actions/core'

export interface Quot {
  _id: string
  content: string
  author: string
  authorSlug: string
  length: number
  tags: string[]
}

const conf = {
  tags: getInput('tags'),
  minLength: getInput('min_length'),
  maxLength: getInput('max_length'),
  timeZone: getInput('time_zone'),

  token: process.env.GH_TOKEN!,
  gistId: getInput('gist_id', { required: true }),
  gistFileName: getInput('gist_file_name', { required: true }),
}

const msgTypes = {
  info: chalk.bold.bgBlueBright('INFO'),
  fatal: chalk.bold.bgRedBright('FATL'),
}

;(async () => {
  const remt = new URL('https://api.quotable.io/quotes/random?limit=1')

  if (conf.tags) remt.searchParams.set('tags', conf.tags)
  if (conf.minLength) remt.searchParams.set('minLength', conf.minLength)
  if (conf.maxLength) remt.searchParams.set('maxLength', conf.maxLength)

  console.log(msgTypes.info, `Fetching ${remt.toString()} …`)

  const resp = await fetch(remt.toString())
    .then((res) => res.json())
    .catch((err) => {
      console.error(msgTypes.fatal, `${err}`)

      process.exit(1)
    })

  const quot = resp[0]
  const content = `“${quot.content}”
— ${quot.author}

Updated at ${Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(new Date())}`

  console.log(`\n${content}\n`)

  const gist = await request('GET /gists/:gist_id', {
    gist_id: conf.gistId || undefined,
    headers: {
      authorization: `token ${conf.token}`,
    },
  }).catch((err) => {
    console.error(msgTypes.fatal, `${err}`)

    process.exit(1)
  })

  const filename = Object.keys(gist.data.files)[0]

  request('PATCH /gists/:gist_id', {
    files: {
      [filename]: {
        filename: conf.gistFileName || undefined,
        content,
      },
    },
    gist_id: conf.gistId || undefined,
    headers: {
      authorization: `token ${conf.token}`,
    },
  })
    .then(() => {
      console.log(msgTypes.info, 'The Gist was updated successfully!')
    })
    .catch((err) => {
      console.error(msgTypes.fatal, `${err}`)

      process.exit(1)
    })
})()
