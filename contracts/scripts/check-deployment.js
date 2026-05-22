require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const marketplaceAddr = process.env.MARKETPLACE_ADDRESS;
  const tradeFactoryAddr = process.env.TRADE_FACTORY_ADDRESS;

  console.log("=== Sepolia 배포 확인 ===");
  console.log("Marketplace :", marketplaceAddr);
  console.log("TradeFactory:", tradeFactoryAddr);

  // 코드 존재 확인
  const mpCode = await hre.ethers.provider.getCode(marketplaceAddr);
  const tfCode = await hre.ethers.provider.getCode(tradeFactoryAddr);
  console.log("\n[코드 존재]");
  console.log("Marketplace :", mpCode !== "0x" ? "✅" : "❌ 없음");
  console.log("TradeFactory:", tfCode !== "0x" ? "✅" : "❌ 없음");

  const marketplace = await hre.ethers.getContractAt("Marketplace", marketplaceAddr);
  const factory = await hre.ethers.getContractAt("TradeFactory", tradeFactoryAddr);

  // TradeFactory가 Marketplace에서 authorized인지 확인
  const isAuthorized = await marketplace.isAuthorizedCreator(tradeFactoryAddr);
  console.log("\n[권한]");
  console.log("TradeFactory authorized in Marketplace:", isAuthorized ? "✅" : "❌ 미인증");

  // TradeFactory의 marketplace 주소 확인
  const tfMarketplace = await factory.marketplace();
  console.log("\n[TradeFactory 내부 주소]");
  console.log("marketplace():", tfMarketplace);
  console.log("일치:", tfMarketplace.toLowerCase() === marketplaceAddr.toLowerCase() ? "✅" : "❌ 불일치");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
