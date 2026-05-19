import { insertTopic } from './_lib.mjs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const file = join(dirname(fileURLToPath(import.meta.url)), '../../3_output/answers/advanced_prompting_techniques.md')
await insertTopic(file, 'Advanced Prompting Techniques')
process.exit(0)
