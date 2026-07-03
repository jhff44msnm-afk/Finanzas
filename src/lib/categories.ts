const CATEGORY_RULES: [string[], string][] = [
  [
    [
      // Fast food & restaurants
      "MCDONALD", "BURGER KING", "WHATABURGER", "WHATA", "CHICK-FIL", "TACO BELL",
      "SUBWAY ", "DOMINO", "PIZZA HUT", "LITTLE CAESAR", "SONIC ", "CHIPOTLE",
      "PANDA EXPRESS", "PANERA", "POPEYES", "POPEYE", "WINGSTOP", "RAISING CANE",
      "JACK IN THE BOX", "DEL TACO", "IN-N-OUT", "BRAUM", "CHURCH'S CHICKEN",
      "KFC ", "APPLEBEE", "IHOP ", "DENNY", "WAFFLE HOUSE", "CRACKER BARREL",
      "OLIVE GARDEN", "CHILI'S", "OUTBACK", "TEXAS ROADHOUSE", "GOLDEN CORRAL",
      "STARBUCKS", "DUNKIN", "DUTCH BROS", "SMOOTHIE KING", "JAMBA",
      // Existing
      "DAIRY QUEEN", "TORTAS", "UBER *EATS", "SENOR SUSHI", "SUPERCENTER", "WAL-MART",
      "BEST CHICKEN", "CHAPA PRIME", "EL TACO", "SORIANA", "OXXO", "MACU CAF",
      "CARNICERIA", "SUPERETTE", "S MART", "SMART ", "REST ",
      "MATSURI", "STEAK", "GROCERY", "FOOD",
      // Grocers
      "H-E-B", "HEB ", "KROGER", "ALBERTSONS", "WHOLE FOODS", "TRADER JOE",
      "ALDI ", "PUBLIX", "SAFEWAY", "WINN DIXIE", "LUCKY SUPERM", "FIESTA MART",
      "SAM'S CLUB", "COSTCO",
      // Generic
      "BAKERY", "CAFE ", "COFFEE", "DONUTS", "DONUT", "BOBA", "SUSHI", "TAQUERIA",
      "CARNITAS", "PIZZ", "BURGER", "WINGS ", "GRILL ", "KITCHEN", "CANTINA",
    ],
    "Food & Dining",
  ],
  [
    [
      // Rideshare
      "UBER *TRIP", "LYFT", "DIDI RIDES", "DLO*DIDI", "DLO DIDI",
      // Gas stations
      "SHELL OIL", "SHELL ", "CHEVRON", "EXXON", "MOBIL ", "VALERO", "TEXACO",
      "CONOCO", "BP GAS", "CIRCLE K", "QUIKTRIP", "QT ", "WAWA ", "CASEY'S",
      "SPEEDWAY", "RACETRAC", "MAVERIK", "PILOT TRVL", "FLYING J",
      "LOVES TRAVEL", "LOVE'S", "SUNOCO", "MARATHON GAS", "KWIK TRIP",
      "7-ELEVEN GAS", "AMPM ", "PARKER'S", "ROADRUNNER", "HOLIDAY STATION",
      // Highway/toll
      "ALON DK", "TX429", "TOLL ", "TOLLWAY", "SUNPASS", "TXDOT", "NTTA",
      // Parking
      "PARKING", "PARKMOBILE", "PAYBYPHONE", "SPOTHERO", "BESTPARK", "LAZ PARK",
      // Car rental
      "ENTERPRISE RENT", "HERTZ ", "AVIS ", "BUDGET RENT", "NATIONAL CAR",
      "ALAMO RENT", "DOLLAR RENT",
      // Transit
      "GREYHOUND", "AMTRAK", "MEGABUS", "FLIXBUS",
      // Generic
      "FUEL", "GAS STA",
    ],
    "Transportation",
  ],
  [
    [
      // Streaming
      "SPOTIFY", "NETFLIX", "DISNEY PLUS", "DISNEY+", "HULU ", "HBO ", "HBOMAX",
      "PEACOCK", "PARAMOUNT+", "SLING TV", "ESPN PLUS", "ESPN+",
      "YOUTUBE PREMIUM", "TWITCH", "CRUNCHYROLL", "FUNIMATION", "APPLE TV+",
      // Gaming
      "STEAM ", "PLAYSTATION", "XBOX ", "NINTENDO ESHOP", "APPLE ARCADE",
      "GOOGLE PLAY", "EA GAMES", "ACTIVISION", "EPIC GAMES", "ROBLOX",
      // Cinemas
      "AMC THEATRE", "REGAL ", "CINEMARK", "ALAMO DRAFTHOUSE", "MOVIE TICKET",
      // Events
      "TICKETMASTER", "EVENTBRITE", "STUBHUB", "SEATGEEK", "VIVID SEATS",
      // Books/learning
      "AUDIBLE", "KINDLE ", "SCRIBD", "DUOLINGO", "SKILLSHARE", "MASTERCLASS",
      // AI/apps
      "CHATGPT", "OPENAI", "CLAUDE",
      // Existing
      "TODOMODA", "SHEIN", "TIPSY CHAT",
    ],
    "Entertainment",
  ],
  [
    [
      // Online retail
      "AMAZON", "AMZN", "EBAY ", "ETSY ", "WAYFAIR", "WISH ", "ALIEXPRESS",
      // Big box
      "TARGET ", "BEST BUY", "HOME DEPOT", "LOWE'S", "LOWES",
      // Dollar/discount
      "DOLLAR TREE", "FAMILY DOLLAR", "DOLLAR GENERAL", "FIVE BELOW",
      // Clothing
      "TJ MAXX", "TJMAXX", "MARSHALLS", "ROSS STORES", "OLD NAVY", "GAP ",
      "H&M ", "FOREVER 21", "FASHION NOVA", "ZARA ", "UNIQLO",
      "VICTORIA SECRET", "BATH AND BODY",
      // Beauty
      "ULTA ", "SEPHORA",
      // Pharmacy/health retail
      "WALGREENS", "CVS ", "CVS/", "RITE AID",
      // Home/hobbies
      "IKEA ", "MICHAELS ", "HOBBY LOBBY", "JOANN ", "PETCO ", "PETSMART",
      // Existing
      "AUTOZONE", "TOSKA", "TOP BELLEZA", "CIBER FLY", "FERRETERIA",
      "MERCADO PAGO", "POCKETS",
    ],
    "Shopping",
  ],
  [
    [
      // Mobile/internet
      "T-MOBILE", "AT&T ", "VERIZON", "SPRINT ", "COMCAST", "XFINITY",
      "SPECTRUM", "DISH ", "DIRECTV", "CENTURYLINK", "FRONTIER COMM",
      "WINDSTREAM", "OPTIMUM ", "COX COMM",
      // Cloud storage
      "GOOGLE*ONE", "GOOGLE ONE", "ICLOUD", "ONEDRIVE", "DROPBOX",
      // Software
      "ADOBE ", "MICROSOFT 365", "MICROSOFT", "ZOOM ", "SLACK ",
      "NORTON ", "MCAFEE", "BITDEFENDER",
      // Security/misc subscriptions
      "NORDVPN", "EXPRESSVPN", "1PASSWORD", "LASTPASS",
      // Existing
      "RMTLY*", "APPLE.COM BILL", "APPLE CASH",
    ],
    "Bills & Subscriptions",
  ],
  [
    ["PROGRESSIVE INSU", "GEICO ", "STATE FARM", "ALLSTATE", "USAA INS",
     "NATIONWIDE INS", "FARMERS INS", "LIBERTY MUTUAL"],
    "Insurance",
  ],
  [
    ["TRNSFER FRM SV", "TRANSFER TO SV", "TRNSFER TO SV",
     "PAGO CUENTA DE TERCERO", "SPEI RECIBIDO",
     "ZELLE ", "VENMO ", "CASHAPP", "CASH APP", "PAYPAL TRANSFER", "PAYPAL INST"],
    "Transfers",
  ],
  [
    ["FOREIGN TRANSACTION FEE", "COMISION", "OVERDRAFT FEE", "NSF FEE",
     "LATE FEE", "MONTHLY FEE", "ANNUAL FEE", "SERVICE FEE", "ATM FEE",
     "MAINTENANCE FEE", "WIRE FEE"],
    "Fees",
  ],
  [
    ["PROV CR FRAUD", "REV PROV CR FRAUD", "MM PROV CR FRAUD",
     "CREDIT ADJUSTMENT", "REFUND ", "RETURN CREDIT"],
    "Adjustments",
  ],
  [
    ["PMT Credit", "DEPOSITO", "PAYMENT THANK", "PAYMENT RECEIVED",
     "LOAN PAYMENT", "AUTO PAYMENT"],
    "Payment",
  ],
  [
    ["RETIRO CAJERO", "ATM WITHDRAWAL", "ATM ", "CASH WITHDRAWAL", "CAJERO"],
    "ATM",
  ],
  [
    ["DIRECT DEP", "PAYROLL", "GUSTO ", "ADP ", "PAYCHEX", "INTUIT PAYROLL",
     "SQUARE PAYROLL", "TAX REFUND", "IRS TREAS", "TREASURY 310",
     "SOCIAL SECURITY", "SSA TREAS", "NOMINA", "DEPOSITO NOMINA",
     "TRNSFER FRM SV"],
    "Income",
  ],
];

export function categorizeTransaction(description: string): string {
  const upper = description.toUpperCase();
  for (const [keywords, category] of CATEGORY_RULES) {
    if (keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return category;
    }
  }
  return "Other";
}

/**
 * Extract a stable vendor key from a description by stripping store numbers,
 * transaction IDs, and trailing codes. Used for learned-category matching.
 * e.g. "MCDONALD'S #12345 EL PASO" → "MCDONALD'S"
 *      "UBER *EATS TX1234ABC"      → "UBER *EATS"
 */
export function vendorPattern(description: string): string {
  return description
    .toUpperCase()
    .replace(/#\S+/g, "")             // remove store codes like #12345
    .replace(/\s\d{4,}\S*/g, " ")     // remove long numeric codes and anything attached
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 22)
    .trim();
}

/**
 * Categorize using learned rules first, then built-in rules.
 * learned is a map of {vendorPattern → category}.
 */
export function applyLearnedCategories(
  description: string,
  learned: Record<string, string>
): string {
  const upper = description.toUpperCase();
  for (const [pattern, category] of Object.entries(learned)) {
    if (upper.includes(pattern)) return category;
  }
  return categorizeTransaction(description);
}

export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills & Subscriptions",
  "Insurance",
  "Transfers",
  "Fees",
  "Adjustments",
  "Payment",
  "ATM",
  "Income",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#C4756E",
  Transportation: "#D4A76A",
  Entertainment: "#9B7EB5",
  Shopping: "#C48B9F",
  "Bills & Subscriptions": "#7C8C6E",
  Insurance: "#6BA3A0",
  Transfers: "#8B8578",
  Fees: "#A89585",
  Adjustments: "#8B9F6B",
  Payment: "#6B9B7A",
  ATM: "#8B7355",
  Income: "#6B9B7A",
  Other: "#B5AFA6",
};
