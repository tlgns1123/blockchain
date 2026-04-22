const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OpenAuction", function () {
  let auction, interestCalc, seller, platform, bidder1, bidder2;
  const RESERVE = ethers.parseEther("0.5");
  const DURATION = 3600; // 1 hour

  beforeEach(async () => {
    [seller, platform, bidder1, bidder2] = await ethers.getSigners();
    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const OpenAuction = await ethers.getContractFactory("OpenAuction", seller);
    auction = await OpenAuction.deploy(RESERVE, DURATION, platform.address, await interestCalc.getAddress());
  });

  it("입찰 시 이전 최고가 입찰자에게 환급 대기 설정", async () => {
    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.0") });
    await auction.connect(bidder2).bid({ value: ethers.parseEther("2.0") });
    expect(await auction.pendingReturns(bidder1.address)).to.equal(ethers.parseEther("1.0"));
  });

  it("기간 종료 후 경매 종료 가능", async () => {
    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.0") });
    await time.increase(DURATION + 1);
    await auction.endAuction();
    expect(await auction.state()).to.equal(1); // Ended
    expect(await auction.winner()).to.equal(bidder1.address);
  });

  it("낙찰자 수령 완료 시 판매자 정산", async () => {
    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.0") });
    await time.increase(DURATION + 1);
    await auction.endAuction();
    const before = await ethers.provider.getBalance(seller.address);
    await auction.connect(bidder1).confirmReceived();
    const after = await ethers.provider.getBalance(seller.address);
    expect(after).to.be.gt(before);
    expect(await auction.state()).to.equal(2); // Finalized
  });
});
