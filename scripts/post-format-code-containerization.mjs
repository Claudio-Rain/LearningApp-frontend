import { initializeApp } from '../node_modules/firebase/app/dist/esm/index.esm.js'
import { getFirestore, collection, getDocs, doc, updateDoc } from '../node_modules/firebase/firestore/dist/esm/index.esm.js'
import { readFileSync } from 'fs'

const TOPIC_SLUG = 'containerization'
const ANSWER_FILE = `prompts/3_output/answers/${TOPIC_SLUG}.md`
const LANG = 'dockerfile'

const firebaseConfig = {
  apiKey: "AIzaSyCMwyu5jelRDJ39rEeq0_huAntu52ne8EQ",
  authDomain: "learningapp-f7d22.firebaseapp.com",
  projectId: "learningapp-f7d22",
  storageBucket: "learningapp-f7d22.firebasestorage.app",
  messagingSenderId: "89331298111",
  appId: "1:89331298111:web:91475d009ad1af427a2d8a"
}

function parseAnswerFile(content) {
  const lines = content.split('\n')
  const questions = []
  let currentLevel = null
  for (const line of lines) {
    const levelMatch = line.match(/^## Level (\d+)/)
    if (levelMatch) currentLevel = `L${levelMatch[1]}`
    const qMatch = line.match(/^\*\*Q:\s*(.+?)\*\*\s*$/)
    if (qMatch && currentLevel) questions.push({ level: currentLevel, question: qMatch[1].trim() })
  }
  return questions
}

function getCodeExample(q) {
  const t = q.toLowerCase()
  if (t.includes('multi-stage') || t.includes('multistage') || (t.includes('node') && t.includes('dockerfile'))) {
    return `# Multi-stage Node.js build\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nUSER node\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`
  }
  if (t.includes('cmd') && t.includes('entrypoint')) return `# ENTRYPOINT sets the executable; CMD provides default args\nENTRYPOINT ["dotnet", "MyApp.dll"]\nCMD ["--env", "Production"]\n\n# Override CMD at runtime:\n# docker run myapp --env Staging\n# Override ENTRYPOINT:\n# docker run --entrypoint /bin/sh myapp`
  if (t.includes('layer') && (t.includes('cache') || t.includes('optimize'))) return `# Bad: invalidates cache on any source change\nCOPY . .\nRUN npm install\n\n# Good: cache npm install separately\nCOPY package*.json ./\nRUN npm install\nCOPY . .   # only this layer re-runs on code changes`
  if (t.includes('volume') || t.includes('bind mount')) return `# Named volume (managed by Docker)\ndocker run -v pgdata:/var/lib/postgresql/data postgres\n\n# Bind mount (host path)\ndocker run -v $(pwd)/data:/app/data myapp\n\n# In docker-compose:\nvolumes:\n  pgdata:`
  if (t.includes('network') || t.includes('bridge')) return `# User-defined bridge network\ndocker network create mynet\ndocker run --network mynet --name api myapp\ndocker run --network mynet --name db postgres\n# 'api' can reach 'db' by hostname`
  if (t.includes('env') || t.includes('environment variable')) return '# At build time (ARG)\nARG NODE_ENV=production\nENV NODE_ENV=${NODE_ENV}\n\n# At runtime\ndocker run -e DB_HOST=mydb -e DB_PORT=5432 myapp\n\n# Via env file\ndocker run --env-file .env myapp'
  if (t.includes('secret') || t.includes('password')) return `# Docker secret (Swarm)\ndocker secret create db_password secret.txt\ndocker service create \\\n  --secret db_password \\\n  --env DB_PASS_FILE=/run/secrets/db_password \\\n  myapp\n# NEVER: ENV DB_PASS=supersecret in Dockerfile`
  if (t.includes('root') || t.includes('non-root') || t.includes('user')) return `# Run as non-root user\nFROM node:20-alpine\nWORKDIR /app\nCOPY --chown=node:node . .\nUSER node\nCMD ["node", "server.js"]`
  if (t.includes('namespace') || t.includes('cgroup') || t.includes('kernel')) return `# Verify container isolation\ndocker run --rm alpine cat /proc/1/status | grep NSpid\n# NSpid: 1 (inside container) vs host PID\n\n# cgroup limits\ndocker run --memory="256m" --cpus="0.5" myapp`
  if (t.includes('overlayfs') || t.includes('union filesystem') || t.includes('layer')) return `# Inspect image layers\ndocker image inspect myapp:latest | jq '.[0].RootFS.Layers'\n\n# Show layer sizes\ndocker history myapp:latest\n\n# OverlayFS: lowerdir(read-only layers) + upperdir(writable)`
  if (t.includes('scratch') || t.includes('distroless') || t.includes('minimal')) return `# Minimal attack surface with distroless\nFROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /src\nCOPY . .\nRUN dotnet publish -c Release -o /app\n\nFROM gcr.io/distroless/dotnet-runtime\nCOPY --from=build /app /app\nENTRYPOINT ["/app/MyApp"]`
  if (t.includes('compose') && (t.includes('depends') || t.includes('health'))) return `# docker-compose healthcheck\nservices:\n  db:\n    image: postgres\n    healthcheck:\n      test: ["CMD", "pg_isready", "-U", "postgres"]\n      interval: 5s\n      retries: 5\n  api:\n    depends_on:\n      db:\n        condition: service_healthy`
  if (t.includes('registry') || t.includes('push') || t.includes('pull')) return `# Build, tag, push to registry\ndocker build -t myapp:1.0 .\ndocker tag myapp:1.0 registry.example.com/myapp:1.0\ndocker push registry.example.com/myapp:1.0\n\n# Pull by digest (immutable)\ndocker pull myapp@sha256:abc123...`
  if (t.includes('expose') || t.includes('port')) return `# Dockerfile EXPOSE (documentation only)\nEXPOSE 8080\n\n# Actual port mapping at runtime\ndocker run -p 3000:8080 myapp\n# host:3000 → container:8080`
  if (t.includes('add') && t.includes('copy')) return `# Prefer COPY over ADD\nCOPY app.tar.gz /tmp/     # just copies\nADD  app.tar.gz /tmp/     # auto-extracts — surprising!\n\n# Only use ADD for remote URL fetch (rare)\nADD https://example.com/file.txt /tmp/`
  if (t.includes('debug') || t.includes('troubleshoot') || t.includes('exec')) return `# Debug a running container\ndocker exec -it <container_id> /bin/sh\n\n# Check logs\ndocker logs --tail 50 --follow <container_id>\n\n# Inspect exit code\ndocker inspect <container_id> | jq '.[0].State'`
  if (t.includes('image') && t.includes('size')) return `# Check image size after cleanup\ndocker images myapp\n\n# Prune dangling images\ndocker image prune -f\n\n# Full cleanup\ndocker system prune --volumes -f`
  if (t.includes('signing') || t.includes('sbom') || t.includes('cosign')) return `# Sign with cosign\ncosign sign --key cosign.key myregistry/myapp:1.0\n\n# Verify\ncosign verify --key cosign.pub myregistry/myapp:1.0\n\n# Generate SBOM\nsyft myapp:1.0 -o cyclonedx-json > sbom.json`
  if (t.includes('rootless')) return `# Rootless Docker — no daemon running as root\ndockerd-rootless-setuptool.sh install\nexport DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock\ndocker run --rm hello-world\n\n# Or use Podman (rootless by default)\npodman run --rm hello-world`
  // default
  return `# Minimal production Dockerfile\nFROM alpine:3.19\nRUN adduser -D appuser\nWORKDIR /app\nCOPY --chown=appuser:appuser ./bin/app .\nUSER appuser\nEXPOSE 8080\nCMD ["./app"]`
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const mdContent = readFileSync(ANSWER_FILE, 'utf-8')
const questions = parseAnswerFile(mdContent)
console.log(`Parsed ${questions.length} questions from ${ANSWER_FILE}`)

const snapshot = await getDocs(collection(db, 'learning_items'))
const allItems = snapshot.docs.map(d => ({ remoteId: d.id, ...d.data() }))
console.log(`Fetched ${allItems.length} items from Firestore`)

let inserted = 0, skippedHasCode = 0, notFound = 0

for (const { level, question } of questions) {
  const item = allItems.find(it =>
    it.title === question ||
    it.title === `${level} ${question}`
  )

  if (!item) { notFound++; console.log(`NOT FOUND: ${question.slice(0, 70)}`); continue }

  const existingContent = item.content ?? { type: 'doc', content: [] }
  const nodes = existingContent.content ?? []

  if (nodes.some(n => n.type === 'codeBlock')) { skippedHasCode++; continue }

  const lang = question.toLowerCase().includes('bash') || question.toLowerCase().includes('docker run') ? 'bash' : LANG
  const code = getCodeExample(question)
  const codeNode = { type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: code }] }

  const blockquoteIdx = nodes.findIndex(n => n.type === 'blockquote')
  const insertIdx = blockquoteIdx >= 0 ? blockquoteIdx : nodes.length
  const newNodes = [...nodes.slice(0, insertIdx), codeNode, ...nodes.slice(insertIdx)]

  await updateDoc(doc(db, 'learning_items', item.remoteId), {
    content: { ...existingContent, content: newNodes },
    lastModified: new Date().toISOString(),
  })

  console.log(`[${level}] Inserted code: ${question.slice(0, 70)}`)
  inserted++
}

console.log(`\nDone: ${inserted} inserted, ${skippedHasCode} skipped (had code), ${notFound} not found`)
process.exit(0)
