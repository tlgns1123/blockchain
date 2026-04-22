/**
 * npx hardhat compile 후 실행:
 * node scripts/export-abi.js
 *
 * artifacts/ 에서 ABI JSON을 frontend/src/abi/ 로 복사
 */
const fs = require("fs");
const path = require("path");

const contracts = [
  "Marketplace",
  "TradeFactory",
  "DirectSale",
  "OpenAuction",
  "BlindAuction",
  "InterestCalculator",
];

const artifactsDir = path.join(__dirname, "../artifacts/contracts");
const abiOutDir = path.join(__dirname, "../../frontend/src/abi");

if (!fs.existsSync(abiOutDir)) {
  fs.mkdirSync(abiOutDir, { recursive: true });
}

for (const name of contracts) {
  // Hardhat artifacts 경로를 재귀적으로 탐색
  const found = findArtifact(artifactsDir, `${name}.json`);
  if (!found) {
    console.warn(`[WARN] Artifact not found for: ${name}`);
    continue;
  }
  const artifact = JSON.parse(fs.readFileSync(found, "utf8"));
  const out = path.join(abiOutDir, `${name}.json`);
  fs.writeFileSync(out, JSON.stringify(artifact.abi, null, 2));
  console.log(`[OK] ${name}.json → frontend/src/abi/`);
}

function findArtifact(dir, filename) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = findArtifact(full, filename);
      if (result) return result;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
}
