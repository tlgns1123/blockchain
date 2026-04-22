const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BlindAuction", function () {
  let auction, interestCalc, seller, platform, bidder1, bidder2, bidder3;
  const RESERVE = ethers.parseEther("0.5");
  const COMMIT_DURATION = 3600;  // 1 hour
  const REVEAL_DURATION = 1800;  // 30 min

  function makeCommitment(bidAmount, secret) {
    return ethers.solidityPackedKeccak256(
      ["uint256", "bytes32"],
      [bidAmount, secret]
    );
  }

  beforeEach(async () => {
    [seller, platform, bidder1, bidder2, bidder3] = await ethers.getSigners();
    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const BlindAuction = await ethers.getContractFactory("BlindAuction", seller);
    auction = await BlindAuction.deploy(
      RESERVE, COMMIT_DURATION, REVEAL_DURATION,
      platform.address, await interestCalc.getAddress()
    );
  });

  it("Vickrey: 최고가 낙찰, 2등 가격만 청구", async () => {
    const secret1 = ethers.encodeBytes32String("secret1");
    const secret2 = ethers.encodeBytes32String("secret2");
    const bid1 = ethers.parseEther("3.0");
    const bid2 = ethers.parseEther("2.0");

    // Commit
    await auction.connect(bidder1).commit(makeCommitment(bid1, secret1), { value: bid1 });
    await auction.connect(bidder2).commit(makeCommitment(bid2, secret2), { value: bid2 });

    // Reveal
    await time.increase(COMMIT_DURATION + 1);
    await auction.connect(bidder1).reveal(bid1, secret1);
    await auction.connect(bidder2).reveal(bid2, secret2);

    // Finalize
    await time.increase(REVEAL_DURATION + 1);
    await auction.finalizeAuction();

    expect(await auction.winner()).to.equal(bidder1.address);
    // 2등 가격 = bid2
    expect(await auction.winningAmount()).to.equal(bid2);
    // bidder2 는 환급 받음 (deposit 필드가 0 이어야 함)
    const commit2 = await auction.commits(bidder2.address);
    expect(commit2.deposit).to.equal(0n);
  });

  it("해시 불일치 시 reveal 실패", async () => {
    const secret = ethers.encodeBytes32String("secret");
    const bid = ethers.parseEther("1.0");
    await auction.connect(bidder1).commit(makeCommitment(bid, secret), { value: bid });
    await time.increase(COMMIT_DURATION + 1);
    await expect(
      auction.connect(bidder1).reveal(ethers.parseEther("2.0"), secret)
    ).to.be.revertedWith("Hash mismatch");
  });
});
