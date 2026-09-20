/**
 * Pre-rendered reference stories shipped with the app. These back the starter playlist and
 * let the UI render instantly without waiting on a live generation.
 */
const SEED_EXPLAINERS = {
  'fed-warsh': {
    id: 'fed-warsh',
    matchKeys: [
      'fed raises rates a quarter point in first move of warsh era',
      'warsh era',
      'fed raises rates a quarter point'
    ],
    inputHeadline: 'Fed raises rates a quarter point in first move of Warsh era',
    sourceType: 'FOMC Policy Analysis / 8-Cut Documentary Story',
    categoryBadge: 'MONETARY REGIME',
    sentiment: '2S10S BEAR FLATTENING',
    sentimentScore: -1.8,
    headlineTitle: 'Warsh Opens FOMC Tenure With +25 bps Hike to 4.75%, Repricing Real Neutral Rates and Equity Duration',
    executiveThesis: 'In his inaugural FOMC decision, Chair Kevin Warsh raised the federal funds target range by 25 bps to 4.50%–4.75% alongside ongoing Quantitative Tightening (QT) and Agency MBS runoff. The move signals a higher equilibrium real neutral rate (r*), pushing 2-year TIPS real yields up +18 bps to 2.42% and compressing Nasdaq-100 forward P/E multiples from 27.8x to 24.3x.',
    videoUrl: '/videos/fed-warsh-stitched.mp4',
    audioUrl: '/audio/fed-warsh-30s.mp3',
    sourceImageUrl: '/images/source-fed-warsh.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: Federal Reserve Podium & Eccles Building',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + fal-ai/ltx-2.3/image-to-video/fast',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'In his inaugural FOMC decision as Federal Reserve Chair, Kevin Warsh raised the federal funds target range by 25 basis points to 4.75%, marking a structural departure from Powell-era gradualism. By pairing the rate hike with ongoing Quantitative Tightening and agency MBS runoff, the committee signaled that the real neutral rate has shifted permanently higher. On the chart, two-year real TIPS yields jump 18 basis points to 2.42%, driving a bear-flattening across the Treasury curve and compressing Nasdaq-100 forward price-to-earnings multiples from 27.8 times down to 24.3. Wider overnight index swap spreads strengthen the US dollar while rotating institutional capital from long-duration software into floating-rate credit and money-center banks.',
    scenes: [
      {
        act: 'PART 1 / POLICY SHIFT',
        title: 'Warsh Hikes +25 bps to 4.75% & Accelerates QT',
        overlayType: 'CATALYST_CARD',
        prompt: 'Realistic television news B-roll exterior shot of the marble Federal Reserve Eccles Building in Washington DC in natural daylight, handheld 35mm ENG broadcast camera, 4k.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: '2Y Real TIPS (2.42%) vs. NDX Multiple Compression (24.3x)',
        overlayType: 'LIVE_CHART',
        prompt: 'Realistic documentary television news B-roll of traders and market specialists working at multi-monitor desks on the New York Stock Exchange floor, 4k.'
      },
      {
        act: 'PART 3 / TRANSMISSION',
        title: 'OIS Spreads Widen; Capital Rotates to Floating Credit',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Close-up documentary shot of US Treasury yield curves on an institutional trading desk monitor, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: 'WARSH INAUGURAL FOMC: +25 BPS HIKE LIFTS TARGET RANGE TO 4.50%-4.75%', highlight: '+25 BPS TO 4.75%' },
      { start: 6.0, end: 12.0, text: 'ACTIVE QT AND MBS RUNOFF SIGNAL A HIGHER REAL NEUTRAL RATE (R*)', highlight: 'HIGHER REAL R*' },
      { start: 12.0, end: 18.0, text: '2-YEAR REAL TIPS YIELDS JUMP +18 BPS TO 2.42% (2S10S BEAR FLATTENING)', highlight: '2.42% REAL YIELD' },
      { start: 18.0, end: 24.0, text: 'HIGHER WACC DISCOUNT RATES COMPRESS NDX FORWARD P/E FROM 27.8x TO 24.3x', highlight: '27.8x TO 24.3x P/E' },
      { start: 24.0, end: 30.0, text: 'WIDER USD OIS SPREADS (+75 BPS VS ECB) ROTATE FLOWS TO FLOATING CREDIT', highlight: 'USD OIS +75 BPS' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut realistic ENG documentary sequence intercutting daylight Federal Reserve Eccles Building footage, NYSE floor specialists, and Ken Burns pans across source wire photography.',
      cameraChoreography: '35mm broadcast ENG shoulder-mount camera with natural focal transitions and 3.75-second editorial cuts.',
      lightingGrade: 'Rec.709 broadcast news color science with natural daylight and studio monitor contrast.',
      motionDynamics: '8 distinct 3.75-second documentary cuts across 30.0 seconds.',
      negativeConstraints: 'No sci-fi neon, no holograms, no static slideshow.',
      fullVideoPrompt: 'Realistic television news B-roll exterior shot of the marble Federal Reserve Eccles Building in Washington DC in natural overcast daylight, handheld 35mm ENG broadcast camera, photojournalism, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'Policy Regime', title: '+25 bps Hike + Balance Sheet Restraint', detail: 'Warsh ends the asymmetric Fed Put, prioritizing real neutral rate normalization (r* > 3.5%) and balance sheet discipline.' },
      { step: '02', stage: 'Curve Dynamics', title: '2s10s Bear Flattening & Real Yield Spike', detail: 'Front-end 2Y nominal and TIPS real yields reprice +14 to +18 bps higher as fed funds futures strip out near-term easing.' },
      { step: '03', stage: 'Equity WACC', title: 'Long-Duration Multiple Compression', detail: 'Every +25 bps increase in the real risk-free discount rate reduces the present value of distant software/tech cash flows by ~1.2x P/E.' }
    ],
    assetImpacts: [
      { asset: '2-Year US Treasury & TIPS Real Yield', ticker: 'US02Y', direction: 'UP', magnitude: '+18 bps', score: 2.6, rationale: 'Front-end yields reprice directly to a higher terminal fed funds path and reduced cut probability.' },
      { asset: 'Nasdaq-100 Long-Duration Equities', ticker: 'NDX', direction: 'DOWN', magnitude: '-1.6%', score: -2.2, rationale: 'Higher WACC discount rate compresses forward P/E multiples from 27.8x toward 24.3x.' },
      { asset: 'USD OIS Rate Differential / Dollar Index', ticker: 'DXY', direction: 'UP', magnitude: '+0.8%', score: 2.3, rationale: 'US overnight index swap spreads widen +75 bps against EUR and CAD, pulling carry inflows.' },
      { asset: 'Money-Center Banks & Senior Loans', ticker: 'KBE / BKLN', direction: 'UP', magnitude: '+0.9%', score: 1.5, rationale: 'Floating-rate loan portfolios capture higher SOFR reset coupons immediately.' }
    ],
    concepts: [
      {
        term: 'Real Neutral Rate (r*) & 2s10s Bear Flattening',
        tag: 'POLICY MECHANISM',
        definition: 'When the central bank raises overnight rates faster than long-term inflation expectations, 2-year yields rise faster than 10-year yields (bear flattening), lifting the real cost of capital across all risk assets.'
      }
    ],
    chartData: {
      title: '2-Year Real TIPS Yield (%) vs. Nasdaq-100 Forward P/E Multiple (x)',
      subtitle: 'As 2-year real TIPS yields climb to 2.42% (lime line), Nasdaq-100 12M forward P/E multiples compress from 27.8x to 24.3x (rose line).',
      xLabels: ['3M Ago', '2M Ago', '1M Ago', 'FOMC Move', '+1 Mo', '+3 Mos', '+6 Mos', '+12 Mos'],
      eventIndex: 3,
      annotation: '+18 bps Real Yield Shift Compresses NDX Multiple by -3.5x Turns',
      seriesA: {
        name: '2Y Real TIPS Yield (%)',
        unit: '%',
        color: '#e2ffa0',
        values: [1.85, 1.92, 2.04, 2.28, 2.42, 2.50, 2.45, 2.38]
      },
      seriesB: {
        name: 'NDX 12M Forward P/E (x)',
        unit: 'x',
        color: '#faa1d5',
        values: [27.8, 27.5, 27.1, 25.6, 24.8, 24.3, 24.6, 25.1]
      }
    },
    followUps: [
      {
        id: 'fed-followup-1',
        question: 'How does active Fed MBS runoff affect primary-secondary mortgage spreads and housing turnover?',
        badge: 'WATCH 30S STORY',
        preRenderedId: 'fed-followup'
      },
      {
        id: 'fed-followup-2',
        question: 'How does a bear-flattening yield curve affect regional bank net interest margins vs. money-center banks?',
        badge: 'CREATE 30S STORY'
      }
    ]
  },

  'fed-followup': {
    id: 'fed-followup',
    matchKeys: [
      'how does warsh’s hike impact 30-year mortgage rates and the us housing market?',
      'how does active fed mbs runoff affect primary-secondary mortgage spreads'
    ],
    inputHeadline: 'How does active Fed MBS runoff affect primary-secondary mortgage spreads and housing turnover?',
    sourceType: 'Fixed Income & Housing Story / 8-Cut B-Roll',
    categoryBadge: 'MBS & HOUSING',
    sentiment: '260 BPS MBS SPREAD',
    sentimentScore: -2.0,
    headlineTitle: 'Agency MBS Convexity Widens 30Y Mortgage Spreads to 260 bps, Freezing Resale Supply at 3.6M SAAR',
    executiveThesis: 'Thirty-year fixed mortgages price off the 10-year Treasury yield plus the primary-secondary Agency MBS spread. Ending Fed MBS reinvestment widens prepayment convexity risk premiums to +260 bps, pushing 30Y mortgage rates to 7.12% and locking 70%+ of existing homeowners into legacy <5% loans.',
    videoUrl: '/videos/fed-followup-stitched.mp4',
    audioUrl: '/audio/fed-followup-30s.mp3',
    sourceImageUrl: '/images/source-fed-followup.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: US Residential Inventory & MBS Desk',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + Ken Burns Wire Photo Stitch',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'The Federal Reserve’s quarter-point hike and hawkish balance-sheet stance transmit directly into residential real estate through the Agency Mortgage-Backed Securities market. Because thirty-year fixed mortgages price off the ten-year Treasury yield plus a prepayment convexity spread, reduced Fed reinvestment keeps the primary-secondary mortgage spread elevated near 260 basis points. As the chart demonstrates, thirty-year mortgage rates moving past 7.12% push annualized existing home sales down 11% to 3.6 million units. With over 70% of outstanding US mortgages locked in below 5%, existing supply remains frozen, allowing large public homebuilders using captive 5% rate buydowns to capture market share.',
    scenes: [
      {
        act: 'PART 1 / MBS SPREAD',
        title: 'Agency MBS Runoff Widens Spread to +260 bps',
        overlayType: 'CATALYST_CARD',
        prompt: 'Close-up documentary dolly shot of US Treasury and MBS yield curves on an institutional monitor, 4k.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: '30Y Mortgage Rate (7.12%) vs. Existing Sales (3.6M SAAR)',
        overlayType: 'LIVE_CHART',
        prompt: 'Realistic documentary B-roll of traders on the New York Stock Exchange floor, 4k.'
      },
      {
        act: 'PART 3 / BIFURCATION',
        title: '70% Lock-In Below 5% Freezes Resale; Builders Use Buydowns',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Realistic ENG exterior B-roll of residential housing inventory at dusk, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: '30Y FIXED MORTGAGES PRICE OFF 10Y TREASURIES PLUS AGENCY MBS SPREADS', highlight: 'AGENCY MBS SPREAD' },
      { start: 6.0, end: 12.0, text: 'REDUCED FED REINVESTMENT KEEPS MORTGAGE SPREAD NEAR +260 BPS', highlight: '+260 BPS SPREAD' },
      { start: 12.0, end: 18.0, text: '30Y RATES AT 7.12% PUSH EXISTING HOME SALES DOWN 11% TO 3.6M SAAR', highlight: '3.6M SAAR TURNOVER' },
      { start: 18.0, end: 24.0, text: 'OVER 70% OF OUTSTANDING MORTGAGES ARE LOCKED IN BELOW 5.0%', highlight: '70% LOCKED <5%' },
      { start: 24.0, end: 30.0, text: 'PUBLIC HOMEBUILDERS DEPLOY 5.25% CAPTIVE RATE BUYDOWNS TO GAIN SHARE', highlight: 'CAPTIVE BUYDOWNS' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut realistic news sequence combining residential inventory wire photography with NYSE fixed-income trading floor B-roll.',
      cameraChoreography: '35mm ENG broadcast lens, 3.75s documentary cuts.',
      lightingGrade: 'Natural daylight and broadcast studio Rec.709.',
      motionDynamics: '8 cuts across 30.0 seconds.',
      negativeConstraints: 'No static frames.',
      fullVideoPrompt: 'Close-up documentary shot of US Treasury bond yield curves shifting on a monitor with residential housing B-roll, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'MBS Runoff', title: 'Negative Convexity Risk Premium Widens', detail: 'Without the Fed absorbing duration risk, private MBS buyers demand +260 bps over 10Y Treasuries.' },
      { step: '02', stage: 'Rate Lock-In', title: '70% of Borrowers Hold <5% Mortgages', detail: 'Trading a 3.5% legacy mortgage for a 7.12% loan increases monthly carrying costs by ~42%, freezing resale listings.' },
      { step: '03', stage: 'Builder Arbitrage', title: 'Captive Finance Arms Subsidize 5.25% Rates', detail: 'Large public builders (DHI, LEN) sacrifice 100 bps of gross margin to fund rate buydowns that existing sellers cannot match.' }
    ],
    assetImpacts: [
      { asset: 'Agency MBS Option-Adjusted Spread', ticker: 'MTGE-OAS', direction: 'UP', magnitude: '+14 bps', score: -1.9, rationale: 'Private fixed-income accounts require wider compensation for prepayment extension risk.' },
      { asset: 'Multifamily Residential REITs', ticker: 'EQR / AVB', direction: 'UP', magnitude: '+1.1%', score: 1.8, rationale: 'Elevated purchase financing hurdles keep tenant retention high and apartment vacancy low.' },
      { asset: 'Resale Transaction Brokerages', ticker: 'OPEN / RMAX', direction: 'DOWN', magnitude: '-2.8%', score: -2.5, rationale: 'Existing home turnover remains pinned near 3.6M SAAR cycle lows.' }
    ],
    concepts: [
      {
        term: 'MBS Negative Convexity & Lock-In',
        tag: 'FIXED INCOME',
        definition: 'When interest rates rise, fewer homeowners refinance or move, extending the duration of mortgage bonds right when bond prices are falling.'
      }
    ],
    chartData: {
      title: '30-Year Fixed Mortgage Rate (%) vs. Existing Home Sales (Millions SAAR)',
      subtitle: 'As 30Y fixed rates reach 7.12% (lime line), annualized existing home sales drop to 3.6M SAAR (rose line).',
      xLabels: ['3M Ago', '2M Ago', '1M Ago', 'MBS Shift', '+1 Mo', '+3 Mos', '+6 Mos', '+12 Mos'],
      eventIndex: 3,
      annotation: '7.12% Mortgage Rate Compresses Existing Home Turnover to 3.6M SAAR',
      seriesA: {
        name: '30Y Fixed Mortgage Rate (%)',
        unit: '%',
        color: '#e2ffa0',
        values: [6.65, 6.72, 6.84, 7.12, 7.24, 7.18, 7.05, 6.92]
      },
      seriesB: {
        name: 'Existing Home Sales (M SAAR)',
        unit: 'M',
        color: '#faa1d5',
        values: [4.15, 4.10, 4.02, 3.84, 3.68, 3.62, 3.70, 3.82]
      }
    },
    followUps: [
      {
        id: 'fed-f-next1',
        question: 'How does frozen resale inventory affect Owners’ Equivalent Rent (OER) in the CPI calculation?',
        badge: 'CREATE 30S STORY'
      }
    ]
  },

  'retail-sales': {
    id: 'retail-sales',
    matchKeys: [
      'retail sales last month surged by the most since march, when a spike in gasoline prices and a boost from tax refunds helped account for higher spending totals.',
      'retail sales last month surged by the most since march',
      'spike in gasoline prices and a boost from tax refunds'
    ],
    inputHeadline: 'Retail sales last month surged by the most since March, when a spike in gasoline prices and a boost from tax refunds helped account for higher spending totals.',
    sourceType: 'Census Bureau Macro Analysis / 8-Cut B-Roll',
    categoryBadge: 'NOMINAL VS REAL',
    sentiment: 'CONTROL GROUP +0.1%',
    sentimentScore: 0.4,
    headlineTitle: 'Census Retail Sales Rise +0.9% Nominal on +4.2% Gas Station Surge, Masking +0.1% Real Control Group Volume',
    executiveThesis: 'US Census Bureau Advance Retail Sales rose +0.9% MoM in nominal dollars, propelled by a $0.38/gal spike in regular unleaded gasoline (+4.2% service-station receipts) and $48B in IRS tax refund disbursements. However, the Retail Control Group (ex-autos, gas, building materials, and food services)—which feeds directly into BEA GDP Personal Consumption Expenditures—grew just +0.1% in real inflation-adjusted terms.',
    videoUrl: '/videos/retail-sales-stitched.mp4',
    audioUrl: '/audio/retail-sales-30s.mp3',
    sourceImageUrl: '/images/source-retail-sales.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: US Fuel Pump Surge & Retail Checkout',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + Ken Burns Wire Photo Stitch',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'According to the Census Bureau Advance Retail Sales report, headline US spending rose 0.9% month-over-month, the largest nominal gain since March. However, decomposing the underlying feed reveals a divergence between nominal dollar receipts and real inflation-adjusted volume. A 38 cent per gallon surge in regular unleaded gasoline lifted service-station dollar sales by 4.2%, while 48 billion dollars in IRS tax refund disbursements temporarily boosted checking balances. When economists strip out autos, gasoline, and building materials to measure the Retail Control Group—which feeds directly into Q2 GDP personal consumption—real unit volume rose just 0.1%, favoring Gulf Coast refiners and off-price retailers over specialty apparel.',
    scenes: [
      {
        act: 'PART 1 / CENSUS PRINT',
        title: '+0.9% Nominal Surge Driven by +4.2% Gas Receipts & $48B Refunds',
        overlayType: 'CATALYST_CARD',
        prompt: 'Realistic television news B-roll close-up of a motorist pumping unleaded gasoline as the digital dollar counter ticks higher, 4k ENG footage.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: 'Nominal Headline (+0.9%) vs. Real Control Group (+0.1%)',
        overlayType: 'LIVE_CHART',
        prompt: 'Realistic documentary B-roll of shoppers pushing carts through a busy warehouse club checkout lane, 4k.'
      },
      {
        act: 'PART 3 / SECTOR SPLIT',
        title: '3-2-1 Crack Spread Refiners & Off-Price Retail Outperform',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Realistic documentary B-roll of market specialists on the NYSE floor analyzing consumer tickers, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: 'CENSUS ADVANCE RETAIL SALES ROSE +0.9% MOM IN NOMINAL DOLLARS', highlight: '+0.9% NOMINAL GAIN' },
      { start: 6.0, end: 12.0, text: '$0.38/GAL GASOLINE SPIKE LIFTED SERVICE-STATION RECEIPTS BY +4.2%', highlight: '+4.2% GAS RECEIPTS' },
      { start: 12.0, end: 18.0, text: '$48B IN IRS TAX REFUNDS PROVIDED A ONE-TIME CHECKING ACCOUNT BOOST', highlight: '$48B TAX REFUNDS' },
      { start: 18.0, end: 24.0, text: 'RETAIL CONTROL GROUP (BEA GDP PCE INPUT) GREW ONLY +0.1% IN REAL TERMS', highlight: '+0.1% REAL CONTROL GROUP' },
      { start: 24.0, end: 30.0, text: 'INELASTIC FUEL SPEND CROWDS OUT SOFTLINES; REFINERS & OFF-PRICE LEAD', highlight: 'REFINERS & OFF-PRICE' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut ENG documentary sequence intercutting daylight gasoline nozzle/meter footage, supermarket checkout wire photos, and NYSE floor reaction.',
      cameraChoreography: '35mm ENG broadcast lens, 8 cuts at 3.75s intervals.',
      lightingGrade: 'Natural daylight and clean interior store lighting.',
      motionDynamics: '8 documentary cuts across 30.0 seconds.',
      negativeConstraints: 'No static frames.',
      fullVideoPrompt: 'Realistic television news B-roll close-up of a motorist pumping unleaded gasoline at a suburban station in daylight as the digital counter ticks higher, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'Inelastic Fuel Tax', title: '+$0.38/gal Pump Spike Lifts Nominal Receipts +4.2%', detail: 'Because short-run price elasticity of gasoline demand is near -0.15, higher pump prices inflate top-line retail dollar totals.' },
      { step: '02', stage: 'GDP Accounting', title: 'Retail Control Group Strips Out Gas, Autos & Building Materials', detail: 'BEA economists use the Control Group to calculate real PCE Goods Consumption (~30% of GDP), which rose only +0.1%.' },
      { step: '03', stage: 'Margin Bifurcation', title: 'Crack Spreads & Off-Price Trade-Down Win', detail: 'Refiners capture wider 3-2-1 gasoline crack spreads while households allocate refund cash to Walmart, Costco, and TJX.' }
    ],
    assetImpacts: [
      { asset: 'Downstream Refiners & Energy (3-2-1 Crack Spread)', ticker: 'XLE / VLO', direction: 'UP', magnitude: '+1.4%', score: 2.2, rationale: 'Captures higher retail gasoline margins and inelastic summer driving demand.' },
      { asset: 'Off-Price & Warehouse Club Retail', ticker: 'WMT / TJX', direction: 'UP', magnitude: '+0.8%', score: 1.7, rationale: 'Captures middle-income trade-down traffic and IRS tax refund check cashing.' },
      { asset: 'Specialty Apparel & Mall Department Stores', ticker: 'XRT', direction: 'DOWN', magnitude: '-0.7%', score: -1.4, rationale: 'Higher household fuel outlays crowd out discretionary wardrobe purchases.' }
    ],
    concepts: [
      {
        term: 'Retail Control Group vs. Headline Nominal Sales',
        tag: 'BEA GDP INPUT',
        definition: 'Census Advance Retail Sales are not adjusted for inflation. The Control Group removes volatile gas stations, auto dealers, and building materials to isolate core consumer goods demand for GDP.'
      }
    ],
    chartData: {
      title: 'Nominal Headline Retail Index (+0.9%) vs. Real Control Group Volume (+0.1%)',
      subtitle: 'Gasoline inflation and tax refunds lift nominal register dollars (lime line), while real inflation-adjusted Control Group volume plateaus (rose line).',
      xLabels: ['Jan', 'Feb', 'Mar', 'Census Print', 'May (E)', 'Jun (E)', 'Jul (E)', 'Aug (E)'],
      eventIndex: 3,
      annotation: '80 bps Divergence Between Nominal Headline Dollars (+0.9%) and Real Volume (+0.1%)',
      seriesA: {
        name: 'Nominal Headline Retail Index',
        unit: ' idx',
        color: '#e2ffa0',
        values: [100.0, 100.2, 100.9, 101.8, 102.1, 102.3, 102.5, 102.7]
      },
      seriesB: {
        name: 'Real Control Group Volume Index',
        unit: ' idx',
        color: '#faa1d5',
        values: [100.0, 99.9, 100.1, 100.2, 100.1, 100.0, 100.1, 100.2]
      }
    },
    followUps: [
      {
        id: 'retail-f1',
        question: 'How does a +0.1% Real Control Group print affect the Atlanta Fed GDPNow Q2 tracking estimate?',
        badge: 'CREATE 30S STORY'
      }
    ]
  },

  'eu-canada': {
    id: 'eu-canada',
    matchKeys: [
      'eu chief floats associate membership for canada after u.s. trade attacks',
      'associate membership for canada',
      'eu chief floats associate membership'
    ],
    inputHeadline: 'EU chief floats associate membership for Canada after U.S. trade attacks',
    sourceType: 'Geoeconomic Trade Analysis / 8-Cut B-Roll',
    categoryBadge: 'CETA & CBAM PACT',
    sentiment: 'MONOPSONY DISCOUNT -50%',
    sentimentScore: 0.8,
    headlineTitle: 'Brussels Floats EU Associate Membership for Canada, Granting CBAM Exemption and Compressing WCS/Mineral Discounts',
    executiveThesis: 'With 77% of Canadian goods exports historically dependent on US buyers, Canadian energy and minerals have traded at a structural single-buyer monopsony discount. Upgrading CETA into an EU Associate Membership grants Canada sovereign equivalence under the EU Carbon Border Adjustment Mechanism (CBAM) and access to the €150B European Defense Industrial Programme (EDIP).',
    videoUrl: '/videos/eu-canada-stitched.mp4',
    audioUrl: '/audio/eu-canada-30s.mp3',
    sourceImageUrl: '/images/source-eu-canada.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: Port of Montreal & Brussels Berlaymont',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + Ken Burns Wire Photo Stitch',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'Following escalated US Section 232 and USMCA tariff disputes, European Commission officials floated an Associate EU Membership framework for Canada to upgrade the existing CETA trade pact. With 77% of Canadian merchandise exports historically dependent on US buyers, Canadian crude and minerals have suffered a structural monopsony price discount. Aligning Ottawa with the European single market grants Canadian producers a sovereign exemption from the EU Carbon Border Adjustment Mechanism and access to the 150 billion euro European Defense Industrial Programme. As the chart shows, doubling Europe’s share of Canadian exports from 9.4% toward 20% compresses the resource discount in half, benefiting Saskatchewan potash, Athabasca uranium, and East Coast rail corridors.',
    scenes: [
      {
        act: 'PART 1 / CETA UPGRADE',
        title: 'EU Associate Pact & CBAM Carbon Exemption for Ottawa',
        overlayType: 'CATALYST_CARD',
        prompt: 'Realistic television news B-roll of gantry cranes lifting steel shipping containers onto a cargo vessel at the Port of Montreal in sunlight, 4k.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: 'EU Export Share (9.4% -> 20.4%) Halves Monopsony Discount',
        overlayType: 'LIVE_CHART',
        prompt: 'Sweeping documentary drone shot over a Canadian freight train carrying potash and LNG containers toward an Atlantic port, 4k.'
      },
      {
        act: 'PART 3 / WINNERS',
        title: 'Saskatchewan Potash, Uranium & Class I Atlantic Rail Lead',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Realistic documentary B-roll of global commodities traders on the NYSE floor, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: 'BRUSSELS PROPOSES ASSOCIATE EU MEMBERSHIP FRAMEWORK TO UPGRADE CETA', highlight: 'ASSOCIATE EU PACT' },
      { start: 6.0, end: 12.0, text: 'CANADA SEEKS TO DIVERSIFY AWAY FROM 77% SINGLE-BUYER US EXPORT RELIANCE', highlight: '77% US EXPORT SHARE' },
      { start: 12.0, end: 18.0, text: 'PACT GRANTS CBAM CARBON BORDER EXEMPTION & €150B EDIP DEFENSE ACCESS', highlight: 'CBAM & €150B EDIP' },
      { start: 18.0, end: 24.0, text: 'EU SHARE OF CANADIAN EXPORTS DOUBLES FROM 9.4% TO 20.4% ON THE CHART', highlight: '9.4% TO 20.4% SHARE' },
      { start: 24.0, end: 30.0, text: 'RESOURCE MONOPSONY DISCOUNT HALVES TO 7.2%, LIFTING POTASH & URANIUM', highlight: 'DISCOUNT HALVES TO 7.2%' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut realistic news sequence combining Port of Montreal gantry cranes, Brussels Berlaymont wire photos, and coastal mineral rail corridors.',
      cameraChoreography: '35mm ENG broadcast camera + stabilized aerial gimbal.',
      lightingGrade: 'Natural morning maritime sunlight.',
      motionDynamics: '8 cuts across 30.0 seconds.',
      negativeConstraints: 'No static frames.',
      fullVideoPrompt: 'Realistic television news B-roll of red gantry cranes lifting shipping containers onto a cargo vessel at the Port of Montreal in morning sunlight, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'Monopsony Risk', title: '77% US Export Concentration Creates Price Discount', detail: 'North-South pipeline and rail bottlenecks historically forced Canadian producers to accept a 14%+ discount to global benchmarks.' },
      { step: '02', stage: 'Regulatory Alignment', title: 'CBAM Carbon Equivalence & €150B Defense Eligibility', detail: 'Mutual recognition of Canadian federal carbon pricing exempts Canadian aluminum, steel, and fertilizer from EU CBAM border tariffs.' },
      { step: '03', stage: 'Offtake Re-Routing', title: 'Atlantic Rail & Deepwater Ports Arbitrage the Spread', detail: 'Long-term European utility contracts for Athabasca uranium, Saskatchewan potash, and LNG compress the single-buyer discount to 7.2%.' }
    ],
    assetImpacts: [
      { asset: 'Athabasca Uranium & Saskatchewan Potash', ticker: 'CCJ / NTR', direction: 'UP', magnitude: '+2.4%', score: 2.5, rationale: 'Duty-free CBAM-exempt entry into European utility and agricultural supply chains.' },
      { asset: 'Canadian Class I Atlantic Railroads', ticker: 'CNR / CPKC', direction: 'UP', magnitude: '+1.3%', score: 1.9, rationale: 'Increased eastbound intermodal and bulk haulage to Halifax, Saint John, and Montreal ports.' },
      { asset: 'US Midwest Auto & Aluminum Buyers', ticker: 'GM / F / XLI', direction: 'DOWN', magnitude: '-0.8%', score: -1.4, rationale: 'Competing European offtake bids raise Midwest transaction premiums for Canadian primary aluminum.' }
    ],
    concepts: [
      {
        term: 'CBAM Exemption & Monopsony Arbitrage',
        tag: 'TRADE POLICY',
        definition: 'The EU Carbon Border Adjustment Mechanism taxes carbon-intensive imports. Sovereign equivalence lets Canadian metals and fertilizers enter Europe tariff-free, giving Canada a second major bidder.'
      }
    ],
    chartData: {
      title: 'EU Share of Canadian Exports (%) vs. Canadian Resource Monopsony Discount (%)',
      subtitle: 'Doubling the EU export corridor to 20.4% (lime line) compresses the Canadian resource price discount from 14.5% to 7.2% (rose line).',
      xLabels: ['2024', '2025', 'Pre-Pact', 'EU Pact', 'Late 26', '2027', '2028', '2029'],
      eventIndex: 3,
      annotation: 'EU Export Share Doubles to 20.4% -> Monopsony Discount Narrows by 50%',
      seriesA: {
        name: 'EU Share of Canadian Exports (%)',
        unit: '%',
        color: '#e2ffa0',
        values: [8.2, 8.8, 9.4, 11.5, 13.8, 16.2, 18.5, 20.4]
      },
      seriesB: {
        name: 'Canadian Resource Discount (%)',
        unit: '%',
        color: '#faa1d5',
        values: [14.5, 14.0, 13.6, 11.2, 9.8, 8.5, 7.8, 7.2]
      }
    },
    followUps: [
      {
        id: 'eu-f1',
        question: 'How would CBAM equivalence affect Canadian primary aluminum shipments to Rotterdam vs. the US Midwest?',
        badge: 'CREATE 30S STORY'
      }
    ]
  },

  'wsj-ai': {
    id: 'wsj-ai',
    matchKeys: [
      'https://www.wsj.com/cio-journal/why-companies-are-unlikely-to-hit-pause-on-ai-9a4f6818',
      'why-companies-are-unlikely-to-hit-pause-on-ai',
      'why companies are unlikely to hit pause on ai'
    ],
    inputHeadline: 'https://www.wsj.com/cio-journal/why-companies-are-unlikely-to-hit-pause-on-ai-9a4f6818',
    sourceType: 'WSJ CIO Journal Deep Analysis / 8-Cut B-Roll',
    categoryBadge: 'CIO CAPEX SURVEY',
    sentiment: 'AI SHARE 24% OF IT',
    sentimentScore: 2.3,
    headlineTitle: 'WSJ CIO Survey: Fortune 500 Triples AI Spend to 24% of IT Budgets by De-Provisioning 18% of Legacy Seat SaaS',
    executiveThesis: 'The Wall Street Journal CIO Journal survey reveals an oligopolistic Prisoner’s Dilemma: delaying agentic workflow orchestration and RAG pipelines risks a permanent 300 bps SG&A unit-cost disadvantage. While overall IT budgets grow a disciplined +4.2% YoY, CIOs are tripling AI allocation to 24% of IT spend by cutting 15%–20% of legacy per-seat SaaS licenses (compressing SaaS Net Dollar Retention from 112% to 95.8%).',
    videoUrl: '/videos/wsj-ai-stitched.mp4',
    audioUrl: '/audio/wsj-ai-30s.mp3',
    sourceImageUrl: '/images/source-wsj-ai.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: Enterprise Server Fiber & Hyperscale Transformers',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + Ken Burns Wire Photo Stitch',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'Analysis from the Wall Street Journal CIO Journal survey shows why Fortune 500 technology chiefs refuse to pause artificial intelligence spending despite scrutiny over near-term returns. Corporate boards face an oligopolistic Prisoner’s Dilemma: delaying agentic workflow automation and retrieval-augmented generation pipelines risks a permanent 300 basis point unit-cost disadvantage against competitors. Rather than expanding total IT budgets above 4% annual growth, CIOs are tripling AI compute and inference allocation to 24% of spend by de-provisioning 15 to 20% of legacy per-seat SaaS licenses. On the chart, legacy software net dollar retention compresses below 96%, while capital locks into Blackwell GPU clusters, custom ASIC interconnects, and behind-the-meter nuclear power agreements.',
    scenes: [
      {
        act: 'PART 1 / CIO SURVEY',
        title: '300 bps Unit-Cost Prisoner’s Dilemma Prevents AI Pause',
        overlayType: 'CATALYST_CARD',
        prompt: 'Realistic television news B-roll of a network engineer inspecting fiber optic patch cables inside a bright enterprise server room aisle, 4k.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: 'AI Spend Triples to 24% IT as Legacy SaaS NRR Drops to 95.8%',
        overlayType: 'LIVE_CHART',
        prompt: 'High-contrast macro documentary shot of silicon wafer inspection in a semiconductor facility, 4k.'
      },
      {
        act: 'PART 3 / ALLOCATION',
        title: 'Blackwell GPUs, Custom XPUs & Nuclear PPAs Capture Spend',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Realistic documentary B-roll of traders on the NYSE floor tracking technology tickers, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: 'WSJ CIO JOURNAL: FORTUNE 500 REFUSE TO PAUSE PRODUCTION AI ROLLOUTS', highlight: 'WSJ CIO SURVEY' },
      { start: 6.0, end: 12.0, text: 'DELAYING AGENTIC RAG PIPELINES RISKS A 300 BPS SG&A COST DISADVANTAGE', highlight: '300 BPS COST GAP' },
      { start: 12.0, end: 18.0, text: 'TOTAL IT BUDGETS GROW +4.2% WHILE AI ALLOCATION TRIPLES TO 24% SHARE', highlight: '24% OF IT SPEND' },
      { start: 18.0, end: 24.0, text: 'CIOS SELF-FUND AI BY DE-PROVISIONING 15%-20% OF PER-SEAT SAAS LICENSES', highlight: 'SAAS NRR 95.8%' },
      { start: 24.0, end: 30.0, text: 'CAPITAL LOCKS INTO GPU CLUSTERS (NVDA), CUSTOM ASICS (AVGO) & NUCLEAR PPAS', highlight: 'NVDA / AVGO / VST' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut realistic ENG sequence combining enterprise server room technicians, Virginia electrical substation wire photos, and silicon wafer fabrication.',
      cameraChoreography: '35mm broadcast ENG camera, 8 cuts across 30.0s.',
      lightingGrade: 'Clean realistic industrial and newsroom lighting.',
      motionDynamics: '8 documentary cuts across 30.0 seconds.',
      negativeConstraints: 'No sci-fi holograms, no static frames.',
      fullVideoPrompt: 'Realistic television news B-roll of a network engineer inspecting fiber optic patch cables inside a clean enterprise server room aisle, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'Game Theory', title: '300 bps SG&A Unit-Cost Prisoner’s Dilemma', detail: 'In automated customer service, code generation, and ERP reconciliation, unilateral CapEx restraint cedes permanent margin share.' },
      { step: '02', stage: 'Self-Funding Mechanism', title: 'Legacy Seat-Based SaaS NRR Compresses (112% -> 95.8%)', detail: 'CIOs consolidate per-seat CRM and workflow licenses as agentic automation reduces required human seat counts by 15%–20%.' },
      { step: '03', stage: 'Compute Lock-In', title: 'Shift to 24/7 Production Inference & Baseload PPAs', detail: 'Production token throughput scales linearly with enterprise transactions, locking in multi-year GPU, custom XPU, and nuclear power backlog.' }
    ],
    assetImpacts: [
      { asset: 'AI Compute & Custom Silicon Interconnects', ticker: 'NVDA / AVGO', direction: 'UP', magnitude: '+2.1%', score: 2.7, rationale: 'Captures the direct reallocation of enterprise IT capital into inference clusters.' },
      { asset: 'Hyperscale Cloud & Vector Data Platforms', ticker: 'MSFT / GOOGL', direction: 'UP', magnitude: '+1.5%', score: 2.3, rationale: 'Enterprise RAG pipelines lock proprietary corporate data into cloud API consumption.' },
      { asset: 'Behind-the-Meter Nuclear & Grid Utilities', ticker: 'VST / CEG', direction: 'UP', magnitude: '+1.8%', score: 2.1, rationale: '24/7 enterprise inference requires uninterrupted gigawatt baseload power contracts.' },
      { asset: 'Per-Seat Legacy Application SaaS', ticker: 'IGV-SEAT', direction: 'DOWN', magnitude: '-1.4%', score: -1.8, rationale: 'Seat-count consolidation pushes net dollar retention below 96%.' }
    ],
    concepts: [
      {
        term: 'Per-Seat SaaS Cannibalization vs. Token Consumption',
        tag: 'BUSINESS MODEL SHIFT',
        definition: 'Legacy software vendors charge per human login seat. As AI agents automate tier-1 support and back-office tasks, CIOs reduce seat licenses and redirect those exact budget dollars into per-token AI inference.'
      }
    ],
    chartData: {
      title: 'AI Compute Share of IT Budget (%) vs. Legacy Seat-SaaS Net Dollar Retention (%)',
      subtitle: 'Enterprise AI budget share triples to 24.0% (lime line) funded by legacy seat-SaaS Net Dollar Retention compressing to 95.8% (rose line).',
      xLabels: ['2024', '2025', 'Q1 26', 'WSJ Survey', 'Q4 26', '2027', '2028', '2029'],
      eventIndex: 3,
      annotation: 'AI Share Triples to 24% of IT Spend as Seat-SaaS NRR Compresses to 95.8%',
      seriesA: {
        name: 'AI Share of Enterprise IT Spend (%)',
        unit: '%',
        color: '#e2ffa0',
        values: [6.5, 9.8, 12.4, 15.6, 18.2, 21.5, 24.0, 26.8]
      },
      seriesB: {
        name: 'Legacy Seat-SaaS Net Retention (%)',
        unit: '%',
        color: '#faa1d5',
        values: [112.0, 108.5, 105.0, 101.8, 99.5, 97.8, 96.5, 95.8]
      }
    },
    followUps: [
      {
        id: 'ai-followup-1',
        question: 'How does 24/7 agentic inference impact TSMC CoWoS wafer allocation, HBM3e memory, and 120kW liquid-cooled power racks?',
        badge: 'WATCH 30S STORY',
        preRenderedId: 'ai-followup'
      }
    ]
  },

  'ai-followup': {
    id: 'ai-followup',
    matchKeys: [
      'how does continuous enterprise ai inference impact semiconductor wafer demand and hyperscaler power bottlenecks?',
      'how does 24/7 agentic inference impact tsmc cowos wafer allocation'
    ],
    inputHeadline: 'How does 24/7 agentic inference impact TSMC CoWoS wafer allocation, HBM3e memory, and 120kW liquid-cooled power racks?',
    sourceType: 'Semiconductor & Grid Supply Chain / 8-Cut B-Roll',
    categoryBadge: 'COWOS & HBM3E',
    sentiment: '48 GW LOAD / 115K WAFERS',
    sentimentScore: 2.5,
    headlineTitle: 'Agentic Reasoning Multiplies Token Compute 10x, Locking Up TSMC CoWoS (115k/mo), HBM3e & 48 GW Baseload Power',
    executiveThesis: 'Multi-step reasoning agents execute 15–40 internal verification passes per enterprise query, multiplying HBM3e memory bandwidth and CoWoS wafer packaging demand by 10x over single-shot chat. Rack thermal densities exceeding 120kW per cabinet force mandatory adoption of direct-to-chip liquid cooling and 20-year nuclear Power Purchase Agreements.',
    videoUrl: '/videos/ai-followup-stitched.mp4',
    audioUrl: '/audio/ai-followup-30s.mp3',
    sourceImageUrl: '/images/source-ai-followup.jpg',
    sourceImageCaption: 'Source Feed Wire Photo: 300mm CoWoS Wafer & Hyperscale Substation',
    ttsModelUsed: 'ElevenLabs Turbo v2.5 (30s Deep Story)',
    videoModelUsed: '8-Cut ENG B-Roll + Ken Burns Wire Photo Stitch',
    durationSec: 30.0,
    resolution: '1920x1080 (16:9 / 30.0s / 8 Cuts)',
    narrationScript: 'As enterprise artificial intelligence transitions from episodic model training to continuous 24/7 production inference, the primary constraint moves from software algorithms to physical supply chains. Multi-step reasoning agents execute dozens of background database and code-verification passes per query, multiplying token throughput and memory-bandwidth requirements by tenfold. The chart tracks US hyperscale data center electrical load climbing past 48 gigawatts alongside a doubling in TSMC Chip-on-Wafer-on-Substrate packaging to 115,000 wafers per month. With rack thermal densities exceeding 120 kilowatts per cabinet, operators are replacing air chillers with direct-to-chip liquid cooling and signing 20-year baseload nuclear PPAs, concentrating pricing power in foundries, HBM3e memory, and grid switchgear.',
    scenes: [
      {
        act: 'PART 1 / TOKEN MULTIPLIER',
        title: 'Multi-Step Agentic Reasoning Multiplies Compute 10x',
        overlayType: 'CATALYST_CARD',
        prompt: 'High-contrast documentary macro shot of 300mm silicon wafer inspection in a cleanroom, 4k.'
      },
      {
        act: 'PART 2 / THE CHART',
        title: '48 GW Hyperscale Load vs. 115k/mo CoWoS Wafer Allocation',
        overlayType: 'LIVE_CHART',
        prompt: 'Realistic television news B-roll of a network engineer inspecting fiber optic cables in a server room, 4k.'
      },
      {
        act: 'PART 3 / BOTTLENECKS',
        title: '120kW Liquid Cooling (VRT), HBM3e (MU) & Foundries (TSM)',
        overlayType: 'ASSET_SCORECARD',
        prompt: 'Realistic documentary B-roll of electrical grid transformers and NYSE trading desks, 4k.'
      }
    ],
    captions: [
      { start: 0.0, end: 6.0, text: 'AGENTIC REASONING LOOPS MULTIPLY TOKEN COMPUTE & MEMORY BANDWIDTH 10X', highlight: '10X TOKEN COMPUTE' },
      { start: 6.0, end: 12.0, text: 'INFERENCE LATENCY IS BOUND BY HBM3E MEMORY STACKS & COWOS PACKAGING', highlight: 'HBM3E & COWOS' },
      { start: 12.0, end: 18.0, text: 'US AI DATA CENTER LOAD CLIMBS PAST 48 GW AS COWOS HITS 115K WAFERS/MO', highlight: '48 GW / 115K WAFERS' },
      { start: 18.0, end: 24.0, text: '120KW CABINET DENSITIES MANDATE DIRECT-TO-CHIP LIQUID COOLING RETROFITS', highlight: '120KW LIQUID COOLING' },
      { start: 24.0, end: 30.0, text: 'PRICING POWER ACCRUES TO TSMC (TSM), MICRON (MU) & GRID SWITCHGEAR (VRT)', highlight: 'TSM / MU / VRT' }
    ],
    promptEngineering: {
      visualMetaphor: '8-cut realistic news sequence combining 300mm CoWoS wafer photography, server room fiber engineering, and Virginia power grid substations.',
      cameraChoreography: '35mm ENG broadcast lens, 8 cuts across 30.0s.',
      lightingGrade: 'Clean industrial and broadcast Rec.709.',
      motionDynamics: '8 cuts across 30.0 seconds.',
      negativeConstraints: 'No static frames.',
      fullVideoPrompt: 'High-contrast macro documentary shot of silicon wafer inspection in a cleanroom intercut with server room fiber technicians, 4k.'
    },
    causalChain: [
      { step: '01', stage: 'Test-Time Compute', title: 'Multi-Step Agentic Verification Loops', detail: 'Autonomous enterprise agents generate 10x–30x more internal reasoning tokens per query than standard chat.' },
      { step: '02', stage: 'Packaging & Memory Wall', title: 'TSMC CoWoS-L & HBM3e Booked Through 2027', detail: 'Every AI accelerator package requires 8 to 12 stacks of High-Bandwidth Memory bonded onto a silicon interposer.' }
    ],
    assetImpacts: [
      { asset: 'Leading-Edge Foundry & CoWoS Packaging', ticker: 'TSM', direction: 'UP', magnitude: '+2.3%', score: 2.8, rationale: 'Sole-source supplier for N3/N2 logic and CoWoS-L wafer-level packaging.' },
      { asset: 'HBM3e / HBM4 High-Bandwidth Memory', ticker: 'MU', direction: 'UP', magnitude: '+2.0%', score: 2.4, rationale: 'Memory bandwidth is the primary bottleneck for low-latency token generation.' },
      { asset: '120kW Liquid Cooling & Medium-Voltage Switchgear', ticker: 'VRT / ETN', direction: 'UP', magnitude: '+1.9%', score: 2.2, rationale: 'Mandatory thermal management retrofits for next-generation GPU racks.' }
    ],
    concepts: [
      {
        term: 'CoWoS (Chip-on-Wafer-on-Substrate) & The Memory Wall',
        tag: 'SEMICONDUCTOR PHYSICS',
        definition: 'AI processors compute faster than data can travel across standard circuit boards. CoWoS places the GPU and HBM memory stacks microns apart on a single silicon interposer.'
      }
    ],
    chartData: {
      title: 'US Hyperscale AI Power Load (GW) vs. TSMC CoWoS Wafer Allocation (k/mo)',
      subtitle: 'Hyperscale electrical load climbs past 48 GW (lime line) alongside TSMC CoWoS capacity doubling to 115k wafers/mo (rose line).',
      xLabels: ['2024', '2025', 'Q1 26', 'Current', 'Q4 26', '2027', '2028', '2029'],
      eventIndex: 3,
      annotation: 'AI Power Load Reaches 48 GW as CoWoS Wafer Capacity Doubles to 115k/mo',
      seriesA: {
        name: 'US AI Data Center Load (GW)',
        unit: ' GW',
        color: '#e2ffa0',
        values: [18.0, 24.5, 31.0, 36.8, 42.5, 51.0, 62.0, 74.5]
      },
      seriesB: {
        name: 'TSMC CoWoS Allocation (k Wafers/Mo)',
        unit: 'k',
        color: '#faa1d5',
        values: [32.0, 48.0, 65.0, 80.0, 95.0, 115.0, 135.0, 155.0]
      }
    },
    followUps: [
      {
        id: 'ai-f-next1',
        question: 'How do co-packaged optics (CPO) reduce power consumption inside 100,000-GPU clusters?',
        badge: 'CREATE 30S STORY'
      }
    ]
  }
};

module.exports = { SEED_EXPLAINERS };
