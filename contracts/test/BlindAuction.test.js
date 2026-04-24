const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BlindAuction", function () {
  let owner;
  let seller;
  let platform;
  let bidder1;
  let bidder2;
  let token;
  let interestCalc;
  let auction;

  const RESERVE = ethers.parseEther("1");
  const COMMIT_DURATION = 3600;
  const REVEAL_DURATION = 1800;

  function makeCommitment(bidAmount, secret) {
    return ethers.solidityPackedKeccak256(["uint256", "bytes32"], [bidAmount, secret]);
  }

  beforeEach(async () => {
    [owner, seller, platform, bidder1, bidder2] = await ethers.getSigners();

    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const BlockToken = await ethers.getContractFactory("BlockToken");
    token = await BlockToken.deploy();
    await token.setExchange(owner.address);
    await token.mint(bidder1.address, ethers.parseEther("10"));
    await token.mint(bidder2.address, ethers.parseEther("10"));

    const BlindAuction = await ethers.getContractFactory("BlindAuction");
    auction = await BlindAuction.deploy(
      RESERVE,
      COMMIT_DURATION,
      REVEAL_DURATION,
      seller.address,
      await token.getAddress(),
      platform.address,
      await interestCalc.getAddress()
    );

    await token.connect(bidder1).approve(await auction.getAddress(), ethers.MaxUint256);
    await token.connect(bidder2).approve(await auction.getAddress(), ethers.MaxUint256);
  });

  it("awards the item to the highest bidder and charges the second price", async () => {
    const secret1 = ethers.encodeBytes32String("secret1");
    const secret2 = ethers.encodeBytes32String("secret2");
    const bid1 = ethers.parseEther("3");
    const bid2 = ethers.parseEther("2");

    await auction.connect(bidder1).commit(makeCommitment(bid1, secret1), bid1);
    await auction.connect(bidder2).commit(makeCommitment(bid2, secret2), bid2);

    await time.increase(COMMIT_DURATION + 1);
    await auction.connect(bidder1).reveal(bid1, secret1);
    await auction.connect(bidder2).reveal(bid2, secret2);

    await time.increase(REVEAL_DURATION + 1);
    await auction.finalizeAuction();

    expect(await auction.winner()).to.equal(bidder1.address);
    expect(await auction.winningAmount()).to.equal(bid2);

    const winnerCommit = await auction.commits(bidder1.address);
    const loserCommit = await auction.commits(bidder2.address);
    expect(winnerCommit.deposit).to.equal(bid2);
    expect(loserCommit.deposit).to.equal(0n);
  });

  it("rejects reveal when deposit is lower than the revealed bid", async () => {
    const secret = ethers.encodeBytes32String("secret");
    const deposit = ethers.parseEther("1");
    const bid = ethers.parseEther("2");

    await auction.connect(bidder1).commit(makeCommitment(bid, secret), deposit);
    await time.increase(COMMIT_DURATION + 1);

    await expect(auction.connect(bidder1).reveal(bid, secret)).to.be.revertedWith("Deposit below bid");
  });
});
