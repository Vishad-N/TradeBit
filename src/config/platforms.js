// Fallback list for the "Trading Platforms" section.
//
// Normally the cards come from the admin area (Admin -> Reading -> Platforms) through the API, so you do NOT
// need to edit this file. It is only used when the API cannot be reached, so the section never breaks.
// Leave it empty to hide the section while the API is down.
//
// Shape of one platform (copy a block to add another):
//
//   {
//     slug: 'platform-one',                 // used in the /go/<slug> link
//     name: 'Platform One',
//     logo: '/platform-one.png',            // a file in /public, or an https image URL
//     description: 'Short platform description.',
//     category: 'Broker',                   // optional; filter chips appear when there are 2+ categories
//     referralUrl: 'https://platform.example/register?ref=YOUR_ID',   // the OFFICIAL referral URL, exactly as supplied
//     referralCode: '',                     // optional; shown with a copy button (a code cannot be auto-filled on another site)
//     websiteUrl: '',                       // only needed for a code-only platform: its normal registration page
//     ctaLabel: 'Sign Up',                  // optional
//     featured: false,
//   }
export const PLATFORMS_FALLBACK = [
  {
    slug: 'xm-global',
    name: 'XM Global',
    logo: '/platforms/xm.png',
    description: 'Get up to 100% deposit bonus when you open an account through our link.',
    category: 'Crypto & Gold',
    referralUrl: 'https://affs.click/YmATt',
    referralCode: '6RTFG',
  },
  {
    slug: 'elefin',
    name: 'Elefin',
    logo: '/platforms/elefin.png',
    description: 'Trade Crypto & Gold with our partner link and partner code.',
    category: 'Crypto & Gold',
    referralUrl: 'https://partners.elefin.com/go/WCAM-ETK5U8',
    referralCode: 'ETK5U8',
  },
  {
    slug: 'coindcx',
    name: 'CoinDCX',
    logo: '/platforms/coindcx.png',
    description: 'Get up to 50% discount on brokerage and fees.',
    category: 'FIU Registered',
    referralUrl: 'https://invite.coindcx.com/69946702',
  },
  {
    slug: 'delta-exchange-india',
    name: 'Delta Exchange India',
    logo: '/platforms/delta.png',
    description: 'Get up to 20% discount on brokerage and fees, plus free Algo access.',
    category: 'FIU Registered',
    referralUrl: 'https://www.delta.exchange/?code=UUQZHP',
  },
  {
    slug: 'exness',
    name: 'Exness',
    logo: '/platforms/exness.png',
    description: 'Trade Crypto & Gold with our partner link and partner code.',
    category: 'Crypto & Gold',
    referralUrl: 'https://one.exnessonelink.com/a/kcv6js6dnn',
    referralCode: 'kcv6js6dnn',
  },
  {
    slug: 'funded-now',
    name: 'Funded Now',
    logo: '/platforms/fundednow.png',
    description: 'Use code TRADEBIT and get 10% discount.',
    category: 'Prop Firm',
    referralUrl: 'https://www.fundednow.com/?refcode=TRADEBIT',
    referralCode: 'TRADEBIT',
  },
  {
    slug: 'tradingview',
    name: 'TradingView',
    logo: '/platforms/tradingview.png',
    description: 'Charting platform for market analysis. Sign up through our link.',
    category: 'Charting',
    referralUrl: 'https://in.tradingview.com/?aff_id=1172080',
  },
  {
    slug: 'gocharting',
    name: 'GoCharting',
    description: 'Advanced charting and order-flow platform. Sign up through our link.',
    category: 'Charting',
    referralUrl: 'https://gocharting.com/sign-up?utm_ref=RDWFUBXL',
    referralCode: 'RDWFUBXL',
  },
  {
    slug: 'coinglass',
    name: 'Coinglass',
    description: 'Crypto derivatives data: open interest, funding and liquidations.',
    category: 'Charting',
    referralUrl: 'https://www.coinglass.com/?ref_code=TRADEBIT',
    referralCode: 'TRADEBIT',
  },
];
