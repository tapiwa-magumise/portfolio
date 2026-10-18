// Everything the drawing knows. Positions are not stored: the engine lays out
// whatever branch is open, so the drawing only ever holds the route being explored.
(function () {
  var N = {
    you:  { label: 'You', sub: 'Visitor', icon: 'person', tint: 'person', children: ['edge'] },
    edge: { label: 'Start here', sub: 'Route 53 · CloudFront', icon: 'edge', tint: 'edge', children: ['org', 'certs'],
      note: 'My portfolio, drawn as AWS architecture. Each area of my work is its own AWS account. Open one to see its projects, then open a project to see how it is built.' },
    org:  { label: 'AWS Organization', sub: 'One account per area', icon: 'org', tint: 'security',
      children: ['acct-profile', 'acct-foundations', 'acct-data', 'acct-apps', 'acct-ai', 'acct-experience'] },

    certs: { label: 'Certifications', sub: 'Exams, diplomas, courses', icon: 'cert', tint: 'security', children: ['cert-aws', 'cert-alison', 'cert-anthropic'] },
    'cert-aws':       { label: 'AWS', sub: 'Exam', icon: 'cert', tint: 'security', children: ['saa', 'dva'] },
    'cert-alison':    { label: 'Alison', sub: 'CPD diploma', icon: 'cert', tint: 'storage', children: ['dip-mad', 'dip-ld'] },
    'cert-anthropic': { label: 'Anthropic', sub: 'Course certificate', icon: 'cert', tint: 'data', children: ['an-api', 'an-mcp', 'an-code'] },
    saa:      { label: 'Solutions Architect', sub: 'Associate', icon: 'cert', tint: 'security' },
    dva:      { label: 'Developer', sub: 'Associate', icon: 'cert', tint: 'security' },
    'dip-mad': { label: 'Modern Application Development', sub: 'Advanced Diploma · 24 October 2024', icon: 'cert', tint: 'storage', url: 'https://alison.com/certification/check/5b365f9f76' },
    'dip-ld':  { label: 'Learning and Development', sub: 'Diploma · 22 September 2024', icon: 'cert', tint: 'storage', url: 'https://alison.com/certification/check/109d9d1d0d' },
    'an-api':  { label: 'Building with the Claude API', sub: 'Anthropic', icon: 'cert', tint: 'data' },
    'an-mcp':  { label: 'Model Context Protocol', sub: 'Advanced Topics', icon: 'cert', tint: 'data' },
    'an-code': { label: 'Claude Code in Action', sub: 'Anthropic', icon: 'cert', tint: 'data' },

    // One AWS account per area, as a landing zone separates workloads
    'acct-profile':     { kind: 'account', label: 'Profile', note: 'Who I am, my CV and how to reach me. The CV and email are also in the title block.', children: ['about', 'cv', 'contact', 'site'] },
    'acct-foundations': { kind: 'account', label: 'Foundations and security', note: 'Setting AWS accounts up safely, moving systems onto AWS, and checking them for risk and waste.', children: ['landing-zone', 'hybrid-dr', 'security-review'] },
    'acct-data':        { kind: 'account', label: 'Data', note: 'Pipelines that turn raw files and logs into numbers a business can act on.', children: ['sales-pipeline', 'edge-analytics', 'retail-analytics'] },
    'acct-apps':        { kind: 'account', label: 'Applications', note: 'Backends that handle money and orders without losing or double-counting anything.', children: ['invoicing-api', 'event-orders'] },
    'acct-ai':          { kind: 'account', label: 'AI', note: 'An assistant that answers only from published documents, and cites them.', children: ['rag-assistant'] },
    'acct-experience':  { kind: 'account', label: 'Experience', note: 'Where I have worked, kept as records in a database.', children: ['career'] },

    about:   { label: 'About', sub: 'Who I am', icon: 'identity', tint: 'security' },
    cv:      { label: 'CV', sub: 'S3 object · PDF', icon: 'bucket', tint: 'storage' },
    contact: { label: 'Contact', sub: 'SNS topic · email', icon: 'message', tint: 'message' },
    site:    { label: 'This site', sub: 'SVG · plain JavaScript', icon: 'code', tint: 'compute', tags: ['JavaScript', 'SVG', 'Python', 'GitHub Pages'], children: ['f-site'] },

    'landing-zone':    { label: 'Landing Zone', sub: 'Organizations · SCPs', icon: 'org', tint: 'security', tags: ['Organizations', 'IAM Identity Center', 'CloudTrail', 'S3', 'GuardDuty', 'Security Hub', 'IAM Access Analyzer', 'Budgets', 'IAM', 'Terraform', 'GitHub Actions'], children: ['f-lz'] },
    'hybrid-dr':       { label: 'Migration and DR', sub: 'EC2 · RDS · two regions', icon: 'regions', tint: 'compute', tags: ['EC2', 'RDS', 'VPC', 'S3', 'Systems Manager', 'IAM', 'PostgreSQL', 'Docker', 'Terraform', 'GitHub Actions'], children: ['f-dr'] },
    'security-review': { label: 'Review Agent', sub: 'Security · cost · reliability', icon: 'review', tint: 'security', tags: ['S3', 'IAM', 'EC2', 'RDS', 'Lambda', 'DynamoDB', 'CloudTrail', 'CloudWatch', 'Bedrock', 'Python', 'Terraform', 'GitHub Actions'], children: ['f-review'] },
    'sales-pipeline':  { label: 'Sales Pipeline', sub: 'S3 · SQS · Lambda', icon: 'queue', tint: 'message', tags: ['S3', 'SQS', 'Lambda', 'Glue', 'Athena', 'SNS', 'DynamoDB', 'CloudWatch', 'Budgets', 'IAM', 'Terraform', 'GitHub Actions'], children: ['f-sales'] },
    'edge-analytics':  { label: 'Edge Analytics', sub: 'CloudFront · Glue · Athena', icon: 'chart', tint: 'data', tags: ['CloudFront', 'S3', 'Lambda', 'Glue', 'Athena', 'Lake Formation', 'Step Functions', 'EventBridge Scheduler', 'SNS', 'SQS', 'KMS', 'CloudWatch', 'Systems Manager', 'Budgets', 'IAM', 'Terraform', 'GitHub Actions'], children: ['f-edge'] },
    'retail-analytics':{ label: 'Retail Analytics', sub: 'DuckDB · Power BI', icon: 'bars', tint: 'data', tags: ['EC2', 'S3', 'Systems Manager', 'IAM', 'DuckDB', 'Python', 'Power BI', 'GitHub Actions'], children: ['f-retail'] },
    'invoicing-api':   { label: 'Invoicing API', sub: 'FastAPI · PostgreSQL', icon: 'receipt', tint: 'compute', tags: ['FastAPI', 'Python', 'PostgreSQL', 'Redis', 'Prometheus', 'Grafana', 'Jaeger', 'Docker', 'GitHub Actions'], children: ['f-inv'] },
    'event-orders':    { label: 'Order System', sub: 'Kafka · Kubernetes', icon: 'stream', tint: 'compute', tags: ['Kafka', 'Kubernetes', 'Helm', 'gRPC', 'NestJS', 'TypeScript', 'Spring Boot', 'Java', 'PostgreSQL', 'Jaeger', 'Docker', 'GitHub Actions'], children: ['f-orders'] },
    'rag-assistant':   { label: 'RAG Assistant', sub: 'Bedrock · pgvector', icon: 'spark', tint: 'data', tags: ['Bedrock', 'PostgreSQL', 'pgvector', 'FastAPI', 'Python', 'Docker', 'CloudWatch', 'Budgets', 'IAM', 'Terraform', 'GitHub Actions'], children: ['f-rag'] },
    career:            { label: 'Career records', sub: 'Database · two entries', icon: 'records', tint: 'data', children: ['f-exp'] }
  };

  // Drawn the way AWS draws architecture: services on solid squares, resources as bare glyphs,
  // inside the boundaries they really sit in. Item: [label, sub, icon, category, x, y, 'svc' | 'res'].
  // Line: [from, to, { step, label, dash, pts }]; pts are bends in the drawing's own coordinates.
  var A = {
    'f-lz': { label: 'AWS Organizations', sub: 'Terraform · four stacks', w: 1300, h: 760,
      note: 'Separate accounts per purpose, guardrails that bind even administrators, and one tamper-evident audit trail.',
      groups: [
        { id: 'gh', type: 'corp', label: 'GitHub', x: 10, y: 560, w: 220, h: 160 },
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 270, y: 10, w: 1020, h: 740 },
        { id: 'mgmt', type: 'account', label: 'Management account', x: 290, y: 50, w: 250, h: 680 },
        { id: 'root', type: 'org', label: 'Root · SCPs and tag policy on every account', x: 570, y: 50, w: 705, h: 680 },
        { id: 'ou-sec', type: 'generic', label: 'Security OU', x: 585, y: 80, w: 675, h: 170 },
        { id: 'a-log', type: 'account', label: 'log-archive', x: 600, y: 110, w: 310, h: 125 },
        { id: 'a-tool', type: 'account', label: 'security-tooling · delegated admin', x: 925, y: 110, w: 320, h: 125 },
        { id: 'ou-infra', type: 'generic', label: 'Infrastructure OU', x: 585, y: 265, w: 330, h: 170 },
        { id: 'a-shared', type: 'account', label: 'shared-services', x: 600, y: 295, w: 300, h: 125 },
        { id: 'ou-sand', type: 'generic', label: 'Sandbox OU', x: 930, y: 265, w: 330, h: 170 },
        { id: 'a-sand', type: 'account', label: 'sandbox', x: 945, y: 295, w: 300, h: 125 },
        { id: 'ou-work', type: 'generic', label: 'Workloads OU', x: 585, y: 450, w: 675, h: 170 },
        { id: 'a-prod', type: 'account', label: 'workloads-prod', x: 600, y: 480, w: 310, h: 125 },
        { id: 'a-nprod', type: 'account', label: 'workloads-nonprod', x: 925, y: 480, w: 320, h: 125 },
        { id: 'ou-susp', type: 'generic', label: 'Suspended OU · everything denied, for accounts being closed', x: 585, y: 640, w: 675, h: 70 }
      ],
      items: {
        'lz-trail':    ['CloudTrail', 'Organisation trail', 'log', 'management', 415, 158, 'svc'],
        'lz-org':      ['Organizations', 'SCPs · tag policy', 'org', 'management', 415, 330, 'svc'],
        'lz-sso':      ['IAM Identity Center', 'Groups · permission sets', 'identity', 'security', 415, 490, 'svc'],
        'lz-ci':       ['CI role', 'Can only validate policies', 'lock', 'security', 415, 640, 'res'],
        'lz-gh':       ['GitHub Actions', 'Every push', 'code', 'external', 120, 640, 'res'],
        'lz-bucket':   ['Trail bucket', 'Object Lock · versioned', 'bucket', 'storage', 755, 158, 'res'],
        'lz-analyzer': ['Access Analyzer', 'Organisation-wide', 'search', 'security', 1005, 158, 'res'],
        'lz-gd':       ['GuardDuty · Security Hub', 'Built, behind a switch', 'shield', 'security', 1165, 158, 'res'],
        'lz-shared':   ['Shared services', 'Networking and CI/CD', 'server', 'compute', 750, 343, 'res'],
        'lz-sand':     ['Experiments', '$5 budget · costly services denied', 'box', 'compute', 1095, 343, 'res'],
        'lz-prod':     ['Production apps', '$25 a month budget alert', 'box', 'compute', 755, 528, 'res'],
        'lz-nprod':    ['Development and test', '$10 a month budget alert', 'box', 'compute', 1085, 528, 'res']
      },
      lines: [
        ['lz-org', 'g:root', { step: 1, label: 'Guardrails' }],
        ['lz-sso', 'g:root', { step: 2, label: 'Sign-in' }],
        ['lz-trail', 'lz-bucket', { step: 3, label: 'Every API call', side: 'below' }],
        ['g:ou-work', 'lz-gd', { label: 'Findings', side: 'left', dash: true, pts: [[1282, 535], [1282, 158]] }],
        ['lz-gh', 'lz-ci', { label: 'OIDC, no stored keys' }]
      ] },

    'f-dr': { label: 'Office to AWS', sub: 'London, Ireland for recovery', w: 1300, h: 700,
      note: '501 rows and 61 files moved with every hash matched, after 94 seconds of frozen writes. Serving from Ireland 18 min 27 s after London went down.',
      groups: [
        { id: 'office', type: 'corp', label: 'Office · Docker Compose', x: 10, y: 130, w: 200, h: 230 },
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 250, y: 10, w: 1040, h: 680 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 270, y: 40, w: 760, h: 640 },
        { id: 'vpc', type: 'vpc', label: 'VPC · 10.20.0.0/16', x: 290, y: 80, w: 590, h: 490 },
        { id: 'aza', type: 'az', label: 'Availability Zone 1', x: 310, y: 115, w: 270, h: 440 },
        { id: 'azb', type: 'az', label: 'Availability Zone 2', x: 600, y: 115, w: 265, h: 440 },
        { id: 'pa', type: 'public', label: 'Public subnet', x: 325, y: 150, w: 240, h: 170 },
        { id: 'pb', type: 'public', label: 'Public subnet', x: 615, y: 150, w: 235, h: 170 },
        { id: 'qa', type: 'private', label: 'Private subnet', x: 325, y: 355, w: 240, h: 185 },
        { id: 'qb', type: 'private', label: 'Private subnet', x: 615, y: 355, w: 235, h: 185 },
        { id: 'ireland', type: 'region', label: 'eu-west-1 · Ireland', x: 1050, y: 40, w: 225, h: 640 }
      ],
      items: {
        'dr-office': ['Office server', 'Flask · PostgreSQL 17', 'server', 'external', 110, 235, 'svc'],
        'dr-igw':    ['Internet gateway', '', 'gateway', 'networking', 290, 235, 'res'],
        'dr-ec2':    ['App on EC2', 'Graviton t4g.micro · SSM', 'server', 'compute', 445, 235, 'svc'],
        'dr-rds':    ['RDS PostgreSQL', 'Single-AZ', 'records', 'database', 445, 450, 'svc'],
        'dr-s3':     ['Uploads', 'S3 · versioned', 'bucket', 'storage', 955, 235, 'res'],
        'dr-sec':    ['Secrets Manager', 'Database password', 'lock', 'security', 955, 580, 'svc'],
        'dr-files':  ['Files replica', 'S3 replication', 'bucket', 'storage', 1162, 235, 'res'],
        'dr-back':   ['Backup replica', 'Restored on failover', 'records', 'database', 1162, 450, 'res']
      },
      lines: [
        ['dr-office', 'dr-igw', { step: 1, label: 'Cutover' }],
        ['dr-igw', 'dr-ec2', {}],
        ['dr-office', 'dr-rds', { step: 2, label: 'Restore, hashes checked', pts: [[110, 450]] }],
        ['dr-ec2', 'dr-rds', { label: 'Port 5432 only' }],
        ['dr-ec2', 'dr-s3', { label: 'S3 gateway endpoint' }],
        ['dr-rds', 'dr-back', { step: 3, label: 'Backups and logs', dash: true }],
        ['dr-s3', 'dr-files', { step: 4, label: 'Replicate', dash: true }]
      ] },

    'f-review': { label: 'Review agent', sub: 'Python · 24 rules', w: 1180, h: 600,
      note: '24 rules mapped to Well-Architected, run on this portfolio\'s own code and AWS account. Each finding gives where, why it matters, and the fix.',
      groups: [
        { id: 'laptop', type: 'corp', label: 'Laptop', x: 10, y: 40, w: 520, h: 540 },
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 570, y: 10, w: 600, h: 580 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 590, y: 50, w: 560, h: 520 },
        { id: 'acct', type: 'account', label: 'Account under review', x: 610, y: 90, w: 300, h: 350 }
      ],
      items: {
        'rv-tf':     ['Terraform code', 'Source or plan JSON', 'code', 'external', 120, 150, 'res'],
        'rv-agent':  ['Review agent', '24 rules', 'review', 'compute', 360, 260, 'svc'],
        'rv-report': ['Report', 'Findings with fixes', 'receipt', 'external', 120, 400, 'res'],
        'rv-role':   ['Read-only role', 'SecurityAudit policy', 'lock', 'security', 760, 165, 'svc'],
        'rv-live':   ['Live resources', 'IAM · RDS · Lambda · more', 'cloud', 'management', 760, 335, 'res'],
        'rv-model':  ['Bedrock · Nova Lite', 'Summary · waiting on AWS', 'spark', 'ml', 1030, 470, 'svc']
      },
      lines: [
        ['rv-tf', 'rv-agent', { step: 1, label: 'Read', pts: [[360, 150]] }],
        ['rv-agent', 'rv-role', { step: 2, label: 'Assume role' }],
        ['rv-role', 'rv-live', { label: 'Describe, Get, List' }],
        ['rv-agent', 'rv-model', { step: 3, label: 'Summarise', pts: [[360, 470]] }],
        ['rv-agent', 'rv-report', { step: 4, label: 'Write', pts: [[240, 260], [240, 400]] }]
      ] },

    'f-sales': { label: 'Serverless pipeline', sub: 'Terraform · GitHub OIDC', w: 1200, h: 710,
      note: 'Every row checked within seconds of upload. Bad rows are kept with the reason they failed, and every file gets an audit record.',
      groups: [
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 10, y: 10, w: 1180, h: 690 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 30, y: 50, w: 1140, h: 630 }
      ],
      items: {
        'sp-raw':   ['Raw bucket', 'incoming/ CSVs', 'bucket', 'storage', 130, 150, 'res'],
        'sp-sqs':   ['Files queue', 'SQS', 'queue', 'integration', 350, 150, 'res'],
        'sp-fn':    ['Validator', 'Lambda · Python 3.13 · arm64', 'fn', 'compute', 570, 150, 'svc'],
        'sp-cur':   ['Curated bucket', 'Partitioned by day', 'bucket', 'storage', 790, 150, 'res'],
        'sp-ath':   ['Athena', 'Named queries', 'search', 'analytics', 1010, 150, 'svc'],
        'sp-dlq':   ['Dead-letter queue', 'SQS', 'queue', 'integration', 350, 380, 'res'],
        'sp-alarm': ['CloudWatch alarms', 'DLQ depth · errors', 'bell', 'management', 130, 380, 'svc'],
        'sp-ddb':   ['Audit table', 'DynamoDB', 'table', 'database', 570, 380, 'svc'],
        'sp-cat':   ['Glue Data Catalog', 'sales · rejected', 'table', 'analytics', 1010, 380, 'svc'],
        'sp-sns':   ['Alerts', 'SNS · email', 'message', 'integration', 130, 580, 'svc']
      },
      lines: [
        ['sp-raw', 'sp-sqs', { step: 1, label: 'File lands' }],
        ['sp-sqs', 'sp-fn', { step: 2 }],
        ['sp-sqs', 'sp-dlq', { label: 'After 3 tries', dash: true }],
        ['sp-fn', 'sp-cur', { step: 3, label: 'Valid and rejected' }],
        ['sp-fn', 'sp-ddb', { step: 4, label: 'Audit, once per file' }],
        ['sp-cur', 'sp-ath', { step: 5, label: 'Query' }],
        ['sp-ath', 'sp-cat', { label: 'Schema' }],
        ['sp-dlq', 'sp-alarm', { label: 'Depth', dash: true }],
        ['sp-alarm', 'sp-sns', { step: 6, label: 'Email someone' }]
      ] },

    'f-site': { label: 'How this site is built', sub: 'Published on GitHub Pages', w: 1300, h: 720,
      note: 'Plain JavaScript and SVG, no framework and no build step: about 1,000 lines draw, page and search everything. The console pages come from each project\'s own README and docs.',
      groups: [
        { id: 'laptop', type: 'corp', label: 'Laptop · content build', x: 10, y: 10, w: 460, h: 440 },
        { id: 'github', type: 'corp', label: 'GitHub', x: 500, y: 10, w: 270, h: 440 },
        { id: 'browser', type: 'generic', label: 'The visitor\'s browser', x: 800, y: 10, w: 490, h: 440 },
        { id: 'later', type: 'generic', label: 'Planned · after AWS account verification', x: 500, y: 490, w: 790, h: 220 }
      ],
      items: {
        'st-repos':  ['Nine project repos', 'READMEs · docs · diagrams', 'folder', 'external', 120, 110, 'res'],
        'st-build':  ['build_console.py', 'Markdown to console pages', 'terminal', 'compute', 350, 110, 'svc'],
        'st-cdata':  ['console-data.js', 'Generated', 'code', 'storage', 350, 320, 'res'],
        'st-data':   ['data.js', 'Drawing · details · tags', 'code', 'storage', 120, 320, 'res'],
        'st-repo':   ['Repository', 'portfolio', 'code', 'external', 635, 110, 'res'],
        'st-pages':  ['GitHub Pages', 'Static hosting', 'edge', 'networking', 635, 320, 'svc'],
        'st-app':    ['app.js', 'Layout · pen · camera', 'code', 'compute', 920, 110, 'svc'],
        'st-con':    ['console.js', 'Console pages', 'monitor', 'compute', 1170, 110, 'svc'],
        'st-search': ['search.js', 'Search · tags', 'search', 'compute', 920, 320, 'svc'],
        'st-cf':     ['CloudFront', 'In front of the site', 'edge', 'networking', 635, 590, 'svc'],
        'st-s3':     ['Site bucket', 'Origin access control', 'bucket', 'storage', 920, 590, 'res'],
        'st-edge':   ['Edge Analytics', 'The site\'s own logs', 'chart', 'analytics', 1170, 590, 'res']
      },
      lines: [
        ['st-repos', 'st-build', { step: 1, label: 'Read' }],
        ['st-build', 'st-cdata', { step: 2, label: 'Write' }],
        ['st-cdata', 'st-repo', { step: 3, label: 'Push', pts: [[480, 320], [480, 110]] }],
        ['st-data', 'st-repo', { pts: [[120, 420], [480, 420], [480, 110]] }],
        ['st-repo', 'st-pages', { step: 4, label: 'Publish' }],
        ['st-pages', 'st-app', { step: 5, label: 'HTML · JS · CSS', pts: [[780, 320], [780, 110]] }],
        ['st-app', 'st-con', { label: 'Opens pages' }],
        ['st-search', 'st-app', { label: 'Go to' }],
        ['st-pages', 'st-cf', { label: 'Moves to', dash: true }],
        ['st-cf', 'st-s3', { label: 'Origin', dash: true }],
        ['st-cf', 'st-edge', { label: 'Logs', dash: true, pts: [[635, 680], [1170, 680]] }]
      ] },

    'f-inv': { label: 'Containers', sub: 'Docker Compose · local', w: 1220, h: 540,
      note: '10,734 requests under load with 0 errors and payments p95 129 ms. Twenty retries of one payment created exactly one.',
      groups: [{ id: 'compose', type: 'corp', label: 'Docker Compose · runs locally, not on AWS', x: 10, y: 10, w: 1200, h: 520 }],
      items: {
        'iv-web':    ['Dashboard', 'React · TypeScript', 'monitor', 'external', 120, 170, 'res'],
        'iv-api':    ['API', 'FastAPI · idempotency keys', 'box', 'compute', 370, 170, 'svc'],
        'iv-pg':     ['PostgreSQL 17', 'Ledger · row locks', 'records', 'database', 640, 170, 'svc'],
        'iv-redis':  ['Redis', 'Rate limits · job queue', 'table', 'database', 370, 400, 'svc'],
        'iv-worker': ['Webhook worker', 'HMAC signed · retries', 'box', 'compute', 640, 400, 'svc'],
        'iv-jaeger': ['Jaeger', 'Traces', 'log', 'management', 900, 170, 'res'],
        'iv-prom':   ['Prometheus', 'Scrapes /metrics', 'chart', 'management', 900, 400, 'res'],
        'iv-graf':   ['Grafana', 'Dashboards', 'chart', 'management', 1110, 400, 'svc']
      },
      lines: [
        ['iv-web', 'iv-api', { step: 1, label: 'HTTPS' }],
        ['iv-api', 'iv-pg', { step: 2, label: 'One transaction' }],
        ['iv-api', 'iv-redis', { label: 'Count · enqueue' }],
        ['iv-redis', 'iv-worker', { step: 3, label: 'Jobs' }],
        ['iv-worker', 'iv-pg', { label: 'Due webhooks' }],
        ['iv-api', 'iv-jaeger', { label: 'OpenTelemetry', dash: true, pts: [[370, 70], [900, 70]] }],
        ['iv-prom', 'iv-graf', {}]
      ] },

    'f-orders': { label: 'Kubernetes cluster', sub: 'kind · local · Helm', w: 1260, h: 600,
      note: '40 orders raced for 10 monitors and exactly 10 were confirmed. With Kafka down, all 20 new orders were accepted, then confirmed.',
      groups: [
        { id: 'laptop', type: 'corp', label: 'Laptop · runs locally, not on AWS', x: 10, y: 10, w: 1240, h: 580 },
        { id: 'k8s', type: 'k8s', label: 'Kubernetes · kind · one control plane, two workers', x: 40, y: 50, w: 1180, h: 520 },
        { id: 'platform', type: 'generic', label: 'Helm chart · platform', x: 70, y: 345, w: 1120, h: 200 }
      ],
      items: {
        'or-orders': ['Orders', 'NestJS · two replicas', 'box', 'compute', 200, 170, 'svc'],
        'or-inv':    ['Inventory', 'Spring Boot · two replicas', 'box', 'compute', 900, 170, 'svc'],
        'or-db1':    ['Orders DB', 'PostgreSQL · outbox', 'records', 'database', 200, 440, 'svc'],
        'or-kafka':  ['Kafka', 'Events by order id', 'stream', 'integration', 550, 440, 'svc'],
        'or-db2':    ['Inventory DB', 'PostgreSQL · outbox', 'records', 'database', 900, 440, 'svc'],
        'or-jaeger': ['Jaeger', 'One trace per order', 'log', 'management', 1110, 440, 'res']
      },
      lines: [
        ['or-orders', 'or-inv', { step: 1, label: 'gRPC · stock check' }],
        ['or-orders', 'or-db1', { step: 2, label: 'Order and event' }],
        ['or-db1', 'or-kafka', { step: 3, label: 'Relay' }],
        ['or-kafka', 'or-inv', { step: 4, label: 'Consume', pts: [[550, 300], [900, 300]] }],
        ['or-inv', 'or-db2', { step: 5, label: 'Reserve stock', pts: [[1000, 170], [1000, 440]] }],
        ['or-db2', 'or-kafka', { label: 'Result', dash: true }]
      ] },

    'f-rag': { label: 'Answer pipeline', sub: 'Bedrock · PostgreSQL', w: 1240, h: 620,
      note: 'Answers UK procurement questions from 260 published documents. Every answer cites its passages, and weak matches are declined.',
      groups: [
        { id: 'laptop', type: 'corp', label: 'Laptop · Docker', x: 10, y: 40, w: 560, h: 560 },
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 610, y: 10, w: 620, h: 600 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 630, y: 50, w: 580, h: 540 },
        { id: 'bedrock', type: 'generic', label: 'Amazon Bedrock', x: 650, y: 90, w: 540, h: 480 }
      ],
      items: {
        'rg-web':   ['Web page', 'Question in', 'monitor', 'external', 110, 250, 'res'],
        'rg-api':   ['API', 'FastAPI · masks personal data', 'box', 'compute', 340, 250, 'svc'],
        'rg-pg':    ['PostgreSQL', 'pgvector · full text · audit', 'records', 'database', 340, 470, 'svc'],
        'rg-guard': ['Guardrails', 'Attacks · topics · grounding', 'shield', 'security', 800, 200, 'svc'],
        'rg-embed': ['Titan Embeddings v2', 'Question vector', 'spark', 'ml', 1050, 200, 'svc'],
        'rg-nova':  ['Nova Lite', 'Answers from six passages', 'spark', 'ml', 800, 430, 'svc'],
        'rg-logs':  ['Invocation logs', 'CloudWatch Logs', 'log', 'management', 1050, 430, 'res']
      },
      lines: [
        ['rg-web', 'rg-api', { step: 1, label: 'Question' }],
        ['rg-api', 'g:bedrock', { step: 2, label: 'Check, embed, answer, check' }],
        ['rg-api', 'rg-pg', { step: 3, label: 'Hybrid search · audit' }],
        ['rg-nova', 'rg-logs', { label: 'Logged', dash: true }]
      ] },

    'f-exp': { label: 'Experience', sub: 'Records', w: 640, h: 290,
      note: 'Open a record for what I did there.',
      groups: [{ id: 'db', type: 'generic', label: 'Experience database', x: 10, y: 10, w: 620, h: 270 }],
      items: {
        'ex-paperless': ['Paperless', 'Cloud Engineer · 2023 to 2026', 'records', 'database', 170, 120, 'svc'],
        'ex-paycanary': ['PayCanary', 'Founder · 2026', 'canary', 'database', 450, 120, 'svc']
      },
      lines: [] },
    'f-edge': { label: 'Log analytics', sub: 'Terraform · GitHub OIDC', w: 1300, h: 740,
      note: 'CloudFront logs nobody read, turned into answers: cost by region, slow pages and why, the homepage test, and bot traffic.',
      groups: [
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 130, y: 10, w: 1160, h: 725 },
        { id: 'use1', type: 'region', label: 'us-east-1', x: 165, y: 290, w: 165, h: 190 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 370, y: 40, w: 905, h: 680 },
        { id: 'wf', type: 'workflow', label: 'Step Functions · one day at a time', x: 600, y: 245, w: 410, h: 180 },
        { id: 'lake', type: 'lake', label: 'Data lake', x: 600, y: 475, w: 655, h: 225 }
      ],
      items: {
        'ea-users': ['Visitors', 'Worldwide', 'person', 'external', 60, 110, 'svc'],
        'ea-cf':    ['CloudFront', 'Two edge functions', 'edge', 'networking', 245, 110, 'svc'],
        'ea-logs':  ['Log delivery', 'Standard logging v2', 'log', 'management', 245, 375, 'res'],
        'ea-site':  ['Site bucket', 'Storefront · dashboard', 'bucket', 'storage', 480, 110, 'res'],
        'ea-raw':   ['Raw logs', 'KMS · deleted after 7 days', 'bucket', 'storage', 480, 330, 'res'],
        'ea-sched': ['EventBridge Scheduler', '05:00 UTC daily', 'clock', 'integration', 1150, 140, 'svc'],
        'ea-glue':  ['Glue Spark job', 'Parse · pseudonymise', 'gear', 'analytics', 700, 330, 'svc'],
        'ea-fn':    ['Pipeline function', 'SQL · reconcile · publish', 'fn', 'compute', 900, 330, 'res'],
        'ea-ath':   ['Athena', 'Star schema SQL', 'search', 'analytics', 1150, 330, 'svc'],
        'ea-lake':  ['Lake bucket', 'Iceberg · clean · curated', 'bucket', 'storage', 700, 580, 'res'],
        'ea-cat':   ['Glue Data Catalog', 'clean · curated', 'table', 'analytics', 920, 580, 'svc'],
        'ea-lf':    ['Lake Formation', 'Analysts never see visitor ids', 'lake', 'analytics', 1150, 580, 'svc'],
        'ea-sns':   ['Alerts', 'SNS topic · SQS queue', 'bell', 'integration', 480, 580, 'svc']
      },
      lines: [
        ['ea-users', 'ea-cf', { step: 1, label: 'HTTPS' }],
        ['ea-cf', 'ea-site', { step: 2, label: 'Origin access control' }],
        ['ea-cf', 'ea-logs', { step: 3, label: 'Every request', dash: true }],
        ['ea-logs', 'ea-raw', { dash: true, pts: [[400, 375], [400, 330]] }],
        ['ea-sched', 'g:wf', { step: 4, label: 'Start', pts: [[955, 140]] }],
        ['ea-raw', 'ea-glue', { step: 5, label: 'Read' }],
        ['ea-glue', 'ea-lake', { label: 'Iceberg' }],
        ['ea-fn', 'ea-ath', { step: 6, label: 'Run SQL' }],
        ['ea-ath', 'ea-lf', { label: 'Governed' }],
        ['ea-lf', 'ea-cat', { label: 'Columns' }],
        ['ea-lake', 'ea-cat', { label: 'Tables' }],
        ['ea-fn', 'ea-site', { step: 7, label: 'Publish dashboard', pts: [[900, 215], [480, 215]] }],
        ['g:wf', 'ea-sns', { label: 'On failure', side: 'left', dash: true, pts: [[560, 400], [560, 580]] }]
      ] },

    'f-retail': { label: 'Analysis pipeline', sub: 'Laptop and AWS', w: 1280, h: 720,
      note: 'A quarter of customers bring in 70% of revenue, and 842 former regulars who spent £1.46 million have gone quiet.',
      groups: [
        { id: 'laptop', type: 'corp', label: 'Laptop · macOS', x: 10, y: 20, w: 620, h: 420 },
        { id: 'cloud', type: 'cloud', label: 'AWS Cloud', x: 670, y: 20, w: 600, h: 690 },
        { id: 'london', type: 'region', label: 'eu-west-2 · London', x: 690, y: 60, w: 560, h: 630 },
        { id: 'vpc', type: 'vpc', label: 'Default VPC', x: 900, y: 140, w: 330, h: 370 },
        { id: 'pub', type: 'public', label: 'Public subnet', x: 915, y: 180, w: 300, h: 315 },
        { id: 'sg', type: 'sg', label: 'Security group', x: 930, y: 260, w: 270, h: 220 }
      ],
      items: {
        'rt-extract': ['Extract', 'UCI repository · 1,067,371 rows', 'code', 'external', 110, 110, 'res'],
        'rt-duck':    ['DuckDB', 'Cleaning rules in SQL', 'table', 'analytics', 320, 110, 'res'],
        'rt-py':      ['Python', 'Statistics', 'chart', 'analytics', 520, 110, 'res'],
        'rt-pbip':    ['Power BI project', 'Built and checked as code', 'bars', 'analytics', 520, 330, 'res'],
        'rt-report':  ['Report', 'RetailSales.pbix · PDF', 'receipt', 'external', 320, 330, 'res'],
        'rt-s3':      ['Transfer bucket', 'S3', 'bucket', 'storage', 790, 330, 'res'],
        'rt-ec2':     ['Windows Server 2022', 'm7i-flex.large · Power BI Desktop', 'server', 'compute', 1065, 330, 'svc'],
        'rt-ssm':     ['Systems Manager', 'Run Command · PowerShell', 'terminal', 'management', 790, 600, 'svc']
      },
      lines: [
        ['rt-extract', 'rt-duck', { step: 1, label: 'CSV' }],
        ['rt-duck', 'rt-py', { step: 2 }],
        ['rt-py', 'rt-pbip', { step: 3 }],
        ['rt-pbip', 'rt-s3', { step: 4, label: 'Upload' }],
        ['rt-s3', 'rt-ec2', { step: 5, label: 'Data and project' }],
        ['rt-ssm', 'rt-ec2', { step: 6, label: 'Drive Desktop', pts: [[1065, 600]] }],
        ['rt-ec2', 'rt-s3', { step: 7, label: 'Saved report', pts: [[1065, 240], [790, 240]] }],
        ['rt-s3', 'rt-report', { step: 8, label: 'Sync back', pts: [[790, 470], [320, 470]] }]
      ] }
  };

  Object.keys(A).forEach(function (fid) {
    var f = A[fid];
    N[fid] = { kind: 'frame', aws: true, type: 'aws', label: f.label, sub: f.sub, note: f.note, w: f.w, h: f.h, groups: f.groups, lines: f.lines, children: Object.keys(f.items) };
    Object.keys(f.items).forEach(function (cid) {
      var c = f.items[cid];
      N[cid] = { kind: 'comp', aws: true, label: c[0], sub: c[1], icon: c[2], cat: c[3], x: c[4], y: c[5], res: c[6] === 'res' };
    });
  });
  Object.keys(N).forEach(function (id) { (N[id].children || []).forEach(function (c) { N[c].parent = id; }); });

  window.DRAWING = { nodes: N, root: 'you' };
})();
