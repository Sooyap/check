const withPwa = require("next-pwa");

const config = {
  i18n: {
    locales: ["en-CA"],
    defaultLocale: "en-CA",
  },
  images: {
    domains: ["lh3.googleusercontent.com", "firebasestorage.googleapis.com"],
  },
  modularizeImports: {
    "@mui/icons-material": {
      transform: "@mui/icons-material/{{member}}",
    },
    "@mui/lab": {
      transform: "@mui/lab/{{member}}",
    },
    "@mui/material": {
      transform: "@mui/material/{{member}}",
    },
  },
  reactStrictMode: true,
  swcMinify: true,
};

module.exports =
  process.env.NODE_ENV === "development"
    ? config
    : withPwa({
        ...config,
        pwa: {
          dest: "public",
          runtimeCaching: [
            {
              handler: "NetworkFirst",
              urlPattern: /.*/,
            },
          ],
        },
      });
