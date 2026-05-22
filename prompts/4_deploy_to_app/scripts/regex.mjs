import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/regex.md')
await insertTopic(file, '.NET Regular Expressions')
process.exit(0)
