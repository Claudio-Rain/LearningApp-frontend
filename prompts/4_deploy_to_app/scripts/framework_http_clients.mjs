import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/framework_http_clients.md')
await insertTopic(file, 'Framework HTTP Clients')
process.exit(0)
