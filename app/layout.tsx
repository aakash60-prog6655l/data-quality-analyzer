import './globals.css'

export const metadata = {
  title: 'Data Quality Analyzer',
  description: 'Analyze CSV and Excel files for data quality issues',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
