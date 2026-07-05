import Script from "next/script";

// Renders the GA4 loader + gtag config only when NEXT_PUBLIC_GA_MEASUREMENT_ID
// is set. Preview builds and local dev without the env var render nothing, so
// staging traffic doesn't pollute the prod property. Uses the afterInteractive
// strategy so it never blocks first paint but still starts before user idles.
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
