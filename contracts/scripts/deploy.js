require("dotenv").config();
const hre = require("hardhat");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const marketplaceAddress = requireEnv("MARKETPLACE_ADDRESS");
  const blockTokenAddress = requireEnv("BLOCK_TOKEN_ADDRESS");
  const platformAddress = requireEnv("PLATFORM_ADDRESS");
  const interestCalcAddress = requireEnv("INTEREST_CALCULATOR_ADDRESS");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  console.log("\nDeploying TradeFactory...");
  const TradeFactory = await hre.ethers.getContractFactory("TradeFactory");
  const factory = await TradeFactory.deploy(
    marketplaceAddress,
    blockTokenAddress,
    platformAddress,
    interestCalcAddress
  );
  await factory.waitForDeployment();

  const tradeFactoryAddress = await factory.getAddress();
  const marketplace = await hre.ethers.getContractAt("Marketplace", marketplaceAddress);
  const authTx = await marketplace.setAuthorizedCreator(tradeFactoryAddress, true);
  await authTx.wait();

  console.log("TradeFactory:", tradeFactoryAddress);
  console.log("Marketplace authorized TradeFactory:", tradeFactoryAddress);
  console.log(`NEXT_PUBLIC_TRADE_FACTORY_ADDRESS=${tradeFactoryAddress}`);
  console.log(`TRADE_FACTORY_ADDRESS=${tradeFactoryAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});