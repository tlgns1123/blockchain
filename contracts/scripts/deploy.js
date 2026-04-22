/**
 * TradeFactory 재배포 스크립트
 *
 * 사용법:
 *   cd contracts
 *   npx hardhat run scripts/deploy.js --network sepolia
 *
 * 완료 후 frontend/.env.local 에서 NEXT_PUBLIC_TRADE_FACTORY_ADDRESS 를 출력된 주소로 교체하세요.
 */

const hre = require("hardhat");

// ─── 기존 배포 주소 (contracts/.env 참고) ──────────────────────────────────
const MARKETPLACE      = "0x40e8D76112b27b0F6ee5e2985e10Ccfc9B31357e";
const BLOCK_TOKEN      = "0x31D47A45d4002F3c528aa467bfD3eA2504487D48";
const PLATFORM         = "0x2bF932102A9CC14D7afa1C3b91AFeDEe67D70E01";
const INTEREST_CALC    = "0x87E34545C63c10C78712bfbE7Bee9714Bbd11A2b";
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  console.log("\nDeploying TradeFactory...");
  const TradeFactory = await hre.ethers.getContractFactory("TradeFactory");
  const factory = await TradeFactory.deploy(
    MARKETPLACE,
    BLOCK_TOKEN,
    PLATFORM,
    INTEREST_CALC
  );
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log("✅ TradeFactory deployed:", addr);
  console.log("\nfrontend/.env.local 에 아래 값을 업데이트하세요:");
  console.log(`NEXT_PUBLIC_TRADE_FACTORY_ADDRESS=${addr}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
