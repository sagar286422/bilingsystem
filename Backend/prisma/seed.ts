import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** ISO 4217: code, English name, minor unit exponent, optional display symbol, sort hint. */
const CURRENCIES: readonly {
  code: string;
  name: string;
  minorUnits: number;
  symbol?: string;
  sortOrder: number;
}[] = [
  { code: "USD", name: "US Dollar", minorUnits: 2, symbol: "$", sortOrder: 0 },
  { code: "EUR", name: "Euro", minorUnits: 2, symbol: "€", sortOrder: 1 },
  { code: "GBP", name: "British Pound Sterling", minorUnits: 2, symbol: "£", sortOrder: 2 },
  { code: "INR", name: "Indian Rupee", minorUnits: 2, symbol: "₹", sortOrder: 3 },
  { code: "JPY", name: "Japanese Yen", minorUnits: 0, symbol: "¥", sortOrder: 4 },
  { code: "KRW", name: "South Korean Won", minorUnits: 0, symbol: "₩", sortOrder: 5 },
  { code: "CAD", name: "Canadian Dollar", minorUnits: 2, symbol: "CA$", sortOrder: 6 },
  { code: "AUD", name: "Australian Dollar", minorUnits: 2, symbol: "A$", sortOrder: 7 },
  { code: "CHF", name: "Swiss Franc", minorUnits: 2, sortOrder: 8 },
  { code: "SGD", name: "Singapore Dollar", minorUnits: 2, sortOrder: 9 },
  { code: "AED", name: "UAE Dirham", minorUnits: 2, sortOrder: 10 },
  { code: "SAR", name: "Saudi Riyal", minorUnits: 2, sortOrder: 11 },
  { code: "CNY", name: "Chinese Yuan", minorUnits: 2, symbol: "¥", sortOrder: 12 },
  { code: "HKD", name: "Hong Kong Dollar", minorUnits: 2, sortOrder: 13 },
  { code: "NZD", name: "New Zealand Dollar", minorUnits: 2, sortOrder: 14 },
  { code: "MXN", name: "Mexican Peso", minorUnits: 2, sortOrder: 15 },
  { code: "BRL", name: "Brazilian Real", minorUnits: 2, sortOrder: 16 },
  { code: "SEK", name: "Swedish Krona", minorUnits: 2, sortOrder: 17 },
  { code: "NOK", name: "Norwegian Krone", minorUnits: 2, sortOrder: 18 },
  { code: "DKK", name: "Danish Krone", minorUnits: 2, sortOrder: 19 },
  { code: "PLN", name: "Polish Zloty", minorUnits: 2, sortOrder: 20 },
  { code: "ZAR", name: "South African Rand", minorUnits: 2, sortOrder: 21 },
  { code: "TRY", name: "Turkish Lira", minorUnits: 2, sortOrder: 22 },
  { code: "BHD", name: "Bahraini Dinar", minorUnits: 3, sortOrder: 23 },
  { code: "KWD", name: "Kuwaiti Dinar", minorUnits: 3, sortOrder: 24 },
  { code: "OMR", name: "Omani Rial", minorUnits: 3, sortOrder: 25 },
  { code: "JOD", name: "Jordanian Dinar", minorUnits: 3, sortOrder: 26 },
];

async function main() {
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        name: c.name,
        minorUnits: c.minorUnits,
        symbol: c.symbol ?? null,
        active: true,
        sortOrder: c.sortOrder,
        metadata: {},
      },
      update: {
        name: c.name,
        minorUnits: c.minorUnits,
        symbol: c.symbol ?? null,
        active: true,
        sortOrder: c.sortOrder,
      },
    });
  }
}

main()
  .then(() => {
    console.log(`Seeded ${CURRENCIES.length} currencies.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
