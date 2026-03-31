# Data Quality Analyzer

A simple web app to analyze CSV and Excel files for data quality issues.

## Features

- Upload CSV or Excel files
- Detects duplicate rows
- Identifies missing values
- Validates email and phone formats
- Provides quality score (0-100)
- Clean, minimal UI

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Import project on Vercel
3. Deploy (automatic configuration)

OR

```bash
npm i -g vercel
vercel
```

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- PapaParse (CSV)
- SheetJS (Excel)

## File Structure

```
data-quality-analyzer/
├── app/
│   ├── page.tsx          # Main app logic
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Styles
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## License

MIT
