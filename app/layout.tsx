export const metadata = {  
  title: 'Data Quality Analyzer',  
  description: 'Analyze CSV data quality',  
}  
  
export default function RootLayout({  
  children,  
}: {  
  children: React.ReactNode  
}) {  
  return (  
    <html lang="en">  
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>  
        {children}  
      </body>  
    </html>  
  )  
}