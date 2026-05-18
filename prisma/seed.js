// const { PrismaClient } = require('@prisma/client');
// const bcrypt = require('bcryptjs');
// const prisma = new PrismaClient();

// async function main() {
//   const hashed = await bcrypt.hash("password123", 10);
//   await prisma.user.create({
//     data: {
//       name: "Khushi",
//       email: "khushi@example.com",
//       password: hashed,
//       role: "VENDOR",
//     },
//   });
//   console.log("Seeded DB ✅");
// }

// main()
//   .catch(e => console.error(e))
//   .finally(async () => await prisma.$disconnect());
