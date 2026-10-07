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
export const PLATFORMS_FALLBACK = [];
