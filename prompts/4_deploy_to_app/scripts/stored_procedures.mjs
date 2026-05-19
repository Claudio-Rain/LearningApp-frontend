import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/stored_procedures.md')
await insertTopic(file, 'Stored Procedures')
process.exit(0)
