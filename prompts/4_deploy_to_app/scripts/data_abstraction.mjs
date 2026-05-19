import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/data_abstraction.md')
await insertTopic(file, 'Data Abstraction')
process.exit(0)
