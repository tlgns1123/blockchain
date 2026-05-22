require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const mp = process.env.MARKETPLACE_ADDRESS;
  const tf = process.env.TRADE_FACTORY_ADDRESS;
  const bkt = process.env.BLOCK_TOKEN_ADDRESS;
  const platform = process.env.PLATFORM_ADDRESS;
  const interest = process.env.INTEREST_CALCULATOR_ADDRESS;

  const [deployer] = await hre.ethers.getSigners();
  const marketplace = await hre.ethers.getContractAt("Marketplace", mp);
  const factory = await hre.ethers.getContractAt("TradeFactory", tf);

  console.log("=== Sepolia 기능 검증 ===");
  console.log("Deployer:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ── 1. TradeFactory 내부 주소 검증 ──────────────────────────────
  console.log("[1] TradeFactory 내부 주소");
  const checks = [
    ["marketplace", await factory.marketplace(), mp],
    ["tokenAddr",   await factory.tokenAddr(),   bkt],
    ["platformAddr",await factory.platformAddr(), platform],
    ["interestCalcAddr", await factory.interestCalcAddr(), interest],
  ];
  let allOk = true;
  for (const [name, actual, expected] of checks) {
    const ok = actual.toLowerCase() === expected.toLowerCase();
    console.log(`  ${name}: ${ok ? "✅" : "❌"} ${actual}`);
    if (!ok) allOk = false;
  }

  // ── 2. Marketplace 현재 리스팅 수 확인 ──────────────────────────
  console.log("\n[2] Marketplace 현재 리스팅");
  const listings = await marketplace.getListings(0, 50);
  console.log(`  총 ${listings.length}개 등록됨`);
  const activeCount = listings.filter((l) => l.active).length;
  console.log(`  활성: ${activeCount}개 / 비활성: ${listings.length - activeCount}개`);

  // ── 3. createDirectSale 트랜잭션 테스트 ─────────────────────────
  console.log("\n[3] TradeFactory.createDirectSale() 실행");
  const price = hre.ethers.parseUnits("100000", 18); // 100,000 BKT
  const tx = await factory.createDirectSale(
    "[테스트] 시연용 상품",
    "약식 기능 테스트용 - 삭제 예정",
    "",
    price
  );
  console.log("  tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("  status:", receipt.status === 1 ? "✅ 성공" : "❌ 실패");

  // 이벤트에서 listingId, tradeContract 추출
  const iface = factory.interface;
  let newListingId, newTradeContract;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "DirectSaleCreated") {
        newTradeContract = parsed.args.tradeContract;
        newListingId = parsed.args.listingId;
        break;
      }
    } catch {}
  }
  console.log("  listingId:", newListingId?.toString());
  console.log("  tradeContract:", newTradeContract);

  // ── 4. Marketplace에서 등록 확인 ────────────────────────────────
  console.log("\n[4] Marketplace 등록 확인");
  const newListing = await marketplace.getListing(newListingId);
  console.log("  title:", newListing.title);
  console.log("  seller:", newListing.seller);
  console.log("  active:", newListing.active ? "✅" : "❌");
  console.log("  tradeContract 일치:", newListing.tradeContract.toLowerCase() === newTradeContract.toLowerCase() ? "✅" : "❌");

  // ── 5. createOpenAuction 트랜잭션 테스트 ────────────────────────
  console.log("\n[5] TradeFactory.createOpenAuction() 실행");
  const tx2 = await factory.createOpenAuction(
    "[테스트] 시연용 공개경매",
    "약식 기능 테스트용 - 삭제 예정",
    "",
    hre.ethers.parseUnits("50000", 18),
    60 * 60 * 24 // 1일
  );
  console.log("  tx:", tx2.hash);
  const receipt2 = await tx2.wait();
  console.log("  status:", receipt2.status === 1 ? "✅ 성공" : "❌ 실패");

  let auctionListingId, auctionTradeContract;
  for (const log of receipt2.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "OpenAuctionCreated") {
        auctionTradeContract = parsed.args.tradeContract;
        auctionListingId = parsed.args.listingId;
        break;
      }
    } catch {}
  }
  console.log("  listingId:", auctionListingId?.toString());
  console.log("  tradeContract:", auctionTradeContract);

  // ── 6. 최종 리스팅 수 확인 ──────────────────────────────────────
  console.log("\n[6] 최종 Marketplace 리스팅 수");
  const finalListings = await marketplace.getListings(0, 100);
  console.log(`  총 ${finalListings.length}개 (테스트 전 ${listings.length}개 → +2개)`);
  console.log(finalListings.length === listings.length + 2 ? "  ✅ 등록 정상" : "  ❌ 수 불일치");

  console.log("\n=== 검증 완료 ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
