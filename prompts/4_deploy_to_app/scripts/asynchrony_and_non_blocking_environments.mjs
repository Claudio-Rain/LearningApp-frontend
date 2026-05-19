import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/asynchrony_and_non_blocking_environments.md')
await insertTopic(file, 'Asynchrony and Non-Blocking Environments')
process.exit(0)
