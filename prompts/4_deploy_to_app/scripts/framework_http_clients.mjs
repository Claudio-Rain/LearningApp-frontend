import { insertTopicFromFiles } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const answersDir = join(__dirname, '../../3_output/answers/framework_http_clients')

await insertTopicFromFiles(answersDir, 'Framework HTTP Clients')
