import BaseDocument, { Html, Head, Main, NextScript } from "next/document";
import { parseCookies } from "nookies";

export type DocumentProps = {
  renderType: string;
};

class Document extends BaseDocument<DocumentProps> {
  render() {
    return (
      <Html>
        <Head>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GANALYTICS_STREAM_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GANALYTICS_STREAM_ID}');`,
            }}
          />
          {/* <script
            src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_GRECAPTCHA_SITE_KEY}`}
          /> */}
          <meta name="application-name" content="Cheqii" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Cheqii" />
          <meta name="description" content="Split payment calculator" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#002d3f" />
          <meta name="render-type" content={this.props.renderType} />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#002d3f" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&amp;family=Fira+Code:wght@300..700&amp;display=swap"
          />
        </Head>
        <body>
          {/* <style>{`.grecaptcha-badge { visibility: hidden; }`}</style> */}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

Document.getInitialProps = async (context) => {
  const originalRenderPage = context.renderPage;

  context.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App: any) => (props) =>
        <App {...props} serverPaletteModeCookie={parseCookies(context).paletteMode} />,
    });

  const initialProps = await BaseDocument.getInitialProps(context);

  return {
    ...initialProps,
    renderType: context?.req?.headers && Object.keys(context.req.headers).length ? "SSR" : "SSG",
  };
};

export default Document;
