import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/data_sending_and_retrieval.md')
await insertTopic(file, 'Data Sending and Retrieval')
process.exit(0)
