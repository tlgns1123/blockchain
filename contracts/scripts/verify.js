/**
 * Remix IDE로 Sepolia 배포 후 Etherscan 검증
 * 사용법: node scripts/verify.js
 * 환경변수: SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
 *
 * .env 에 배포된 컨트랙트 주소를 추가하고 아래 addresses 를 채워서 실행
 */
require("dotenv").config();
const { run } = require("hardhat");

const addresses = {
  InterestCalculator: process.env.INTEREST_CALCULATOR_ADDRESS,
  Marketplace: process.env.MARKETPLACE_ADDRESS,
  // DirectSale, OpenAuction, BlindAuction 은 거래마다 새로 배포되므로
  // 검증이 필요한 경우 개별적으로 추가
};

const constructorArgs = {
  InterestCalculator: [],
  Marketplace: [],
};

async function main() {
  for (const [name, address] of Object.entries(addresses)) {
    if (!address) {
      console.warn(`[SKIP] ${name}: address not set in .env`);
      continue;
    }
    try {
      await run("verify:verify", {
        address,
        constructorArguments: constructorArgs[name] || [],
      });
      console.log(`[OK] ${name} verified at ${address}`);
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
    }
  }
}

main();
