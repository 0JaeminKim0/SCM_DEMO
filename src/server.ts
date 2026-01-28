import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index.js'

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './dist/public' }))

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`)
  console.log(`📊 한화오션 SCM 납기관리 AI Agent`)
  console.log(`🔗 API Endpoints:`)
  console.log(`   - GET /api/step1/po-extract`)
  console.log(`   - GET /api/step2/delivery-validation`)
  console.log(`   - GET /api/step3/pnd-changes`)
  console.log(`   - GET /api/step4/supply-requests`)
  console.log(`   - GET /api/step5/appropriateness`)
  console.log(`   - GET /api/step6/email-status`)
  console.log(`   - GET /api/step7/response-collection`)
  console.log(`   - GET /api/step8/comparison-analysis`)
  console.log(`   - GET /api/alerts`)
})
