require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const marketplace = await hre.ethers.getContractAt("Marketplace", process.env.MARKETPLACE_ADDRESS);

  for (const id of [2, 3]) {
    const tx = await marketplace.delistItem(id);
    const receipt = await tx.wait();
    console.log(`listingId ${id} delist: ${receipt.status === 1 ? "✅" : "❌"}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
