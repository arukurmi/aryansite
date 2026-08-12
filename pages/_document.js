import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Font Awesome — icons/logos used across the site */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          referrerPolicy="no-referrer"
        />

        {/* The site had no icon at all, so every tab and bookmark fell back to
            the browser's blank-page glyph. Declared as PNG because the source
            file is one, despite the .ico name it was stored under. */}
        <link rel="icon" type="image/png" href="/favicon.png" />

        {/* Matches the dark theme's page background so mobile browser chrome
            doesn't sit against it as a bright band. */}
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f6f9ff" media="(prefers-color-scheme: light)" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
