const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DirectSale", function () {
  let owner;
  let seller;
  let buyer;
  let platform;
  let token;
  let interestCalc;
  let directSale;

  const PRICE = ethers.parseEther("1");
  const FEE = (PRICE * 250n) / 10000n;

  beforeEach(async () => {
    [owner, seller, buyer, platform] = await ethers.getSigners();

    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const BlockToken = await ethers.getContractFactory("BlockToken");
    token = await BlockToken.deploy();
    await token.setExchange(owner.address);
    await token.mint(buyer.address, ethers.parseEther("10"));

    const DirectSale = await ethers.getContractFactory("DirectSale");
    directSale = await DirectSale.deploy(
      PRICE,
      seller.address,
      await token.getAddress(),
      platform.address,
      await interestCalc.getAddress()
    );

    await token.connect(buyer).approve(await directSale.getAddress(), PRICE);
  });

  it("stores seller and price", async () => {
    expect(await directSale.seller()).to.equal(seller.address);
    expect(await directSale.price()).to.equal(PRICE);
  });

  it("allows buyer to purchase with BKT", async () => {
    await expect(directSale.connect(buyer).purchase()).to.emit(directSale, "Purchased");
    expect(await directSale.buyer()).to.equal(buyer.address);
    expect(await directSale.state()).to.equal(1);
    expect(await token.balanceOf(await directSale.getAddress())).to.equal(PRICE);
  });

  it("settles funds to seller and platform after confirm", async () => {
    await directSale.connect(buyer).purchase();
    await directSale.connect(buyer).confirmReceived();

    expect(await directSale.state()).to.equal(2);
    expect(await token.balanceOf(seller.address)).to.equal(PRICE - FEE);
    expect(await token.balanceOf(platform.address)).to.equal(FEE);
    expect(await token.balanceOf(await directSale.getAddress())).to.equal(0n);
  });

  it("lets the seller cancel while item is on sale", async () => {
    await expect(directSale.connect(seller).cancel()).to.emit(directSale, "Cancelled");
    expect(await directSale.state()).to.equal(3);
  });
});
