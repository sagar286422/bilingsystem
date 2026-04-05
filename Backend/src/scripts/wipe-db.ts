import { prisma } from "../db/prisma.js";

async function main() {
  // Wipe order matters due to foreign keys. Clears all app + Better Auth tables
  // (including sessions, accounts, verifications, users).
  await prisma.transaction.deleteMany({});
  await prisma.paymentPage.deleteMany({});
  await prisma.organizationRazorpayCredential.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.promoCode.deleteMany({});
  await prisma.customer.deleteMany({});

  await prisma.plan.deleteMany({});
  await prisma.price.deleteMany({});
  await prisma.product.deleteMany({});

  await prisma.apiKey.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.organization.deleteMany({});

  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.user.deleteMany({});
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("DB wipe completed.");
    process.exit(0);
  })
  .catch(async (e) => {
    try {
      await prisma.$disconnect();
    } finally {
      console.error("DB wipe failed:", e);
      process.exit(1);
    }
  });

