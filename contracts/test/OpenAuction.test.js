const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OpenAuction", function () {
  let owner;
  let seller;
  let platform;
  let bidder1;
  let bidder2;
  let token;
  let interestCalc;
  let auction;

  const RESERVE = ethers.parseEther("1");
  const BID_ONE = ethers.parseEther("2");
  const BID_TWO = ethers.parseEther("3");
  const DURATION = 3600;

  beforeEach(async () => {
    [owner, seller, platform, bidder1, bidder2] = await ethers.getSigners();

    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const BlockToken = await ethers.getContractFactory("BlockToken");
    token = await BlockToken.deploy();
    await token.setExchange(owner.address);
    await token.mint(bidder1.address, ethers.parseEther("10"));
    await token.mint(bidder2.address, ethers.parseEther("10"));

    const OpenAuction = await ethers.getContractFactory("OpenAuction");
    auction = await OpenAuction.deploy(
      RESERVE,
      DURATION,
      seller.address,
      await token.getAddress(),
      platform.address,
      await interestCalc.getAddress()
    );

    await token.connect(bidder1).approve(await auction.getAddress(), ethers.MaxUint256);
    await token.connect(bidder2).approve(await auction.getAddress(), ethers.MaxUint256);
  });

  it("refunds the previous highest bidder immediately", async () => {
    await auction.connect(bidder1).bid(BID_ONE);
    expect(await token.balanceOf(bidder1.address)).to.equal(ethers.parseEther("8"));

    await auction.connect(bidder2).bid(BID_TWO);

    expect(await token.balanceOf(bidder1.address)).to.equal(ethers.parseEther("10"));
    expect(await auction.pendingReturns(bidder1.address)).to.equal(0n);
    expect(await auction.highestBidder()).to.equal(bidder2.address);
    expect(await auction.highestBid()).to.equal(BID_TWO);
  });

  it("records winner and winning amount after auction end", async () => {
    await auction.connect(bidder1).bid(BID_ONE);
    await time.increase(DURATION + 1);
    await auction.connect(seller).endAuction();

    expect(await auction.state()).to.equal(1);
    expect(await auction.winner()).to.equal(bidder1.address);
    expect(await auction.winningAmount()).to.equal(BID_ONE);
  });
  it("allows only seller or highest bidder to end the auction", async () => {
    await auction.connect(bidder1).bid(BID_ONE);
    await auction.connect(bidder2).bid(BID_TWO);
    await time.increase(DURATION + 1);

    await expect(auction.connect(owner).endAuction()).to.be.revertedWith("Not authorized to end");
    await expect(auction.connect(bidder1).endAuction()).to.be.revertedWith("Not authorized to end");

    await auction.connect(bidder2).endAuction();

    expect(await auction.state()).to.equal(1);
    expect(await auction.winner()).to.equal(bidder2.address);
    expect(await auction.winningAmount()).to.equal(BID_TWO);
  });

  it("allows seller to end an auction with no bids after expiry", async () => {
    await time.increase(DURATION + 1);

    await auction.connect(seller).endAuction();

    expect(await auction.state()).to.equal(1);
    expect(await auction.winner()).to.equal(ethers.ZeroAddress);
    expect(await auction.winningAmount()).to.equal(0n);
  });

  it("settles funds after winner confirms receipt", async () => {
    await auction.connect(bidder1).bid(BID_ONE);
    await time.increase(DURATION + 1);
    await auction.connect(seller).endAuction();
    await auction.connect(bidder1).confirmReceived();

    const fee = (BID_ONE * 250n) / 10000n;
    expect(await auction.state()).to.equal(2);
    expect(await token.balanceOf(seller.address)).to.equal(BID_ONE - fee);
    expect(await token.balanceOf(platform.address)).to.equal(fee);
  });
});

