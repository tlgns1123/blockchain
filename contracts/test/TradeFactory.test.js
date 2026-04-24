const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradeFactory + Marketplace", function () {
  let seller;
  let platform;
  let attacker;
  let marketplace;
  let tradeFactory;
  let token;
  let interestCalc;

  beforeEach(async () => {
    [, seller, platform, attacker] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();

    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    interestCalc = await InterestCalculator.deploy();

    const BlockToken = await ethers.getContractFactory("BlockToken");
    token = await BlockToken.deploy();

    const TradeFactory = await ethers.getContractFactory("TradeFactory");
    tradeFactory = await TradeFactory.deploy(
      await marketplace.getAddress(),
      await token.getAddress(),
      platform.address,
      await interestCalc.getAddress()
    );
  });

  it("rejects direct listing from unauthorized creators", async () => {
    const DirectSale = await ethers.getContractFactory("DirectSale");
    const directSale = await DirectSale.deploy(
      ethers.parseEther("1"),
      attacker.address,
      await token.getAddress(),
      platform.address,
      await interestCalc.getAddress()
    );

    await expect(
      marketplace
        .connect(attacker)
        .listItem("title", "description", "hash", 0, await directSale.getAddress(), attacker.address)
    ).to.be.revertedWith("Not authorized creator");
  });

  it("registers a listing when the authorized factory creates a trade contract", async () => {
    await marketplace.setAuthorizedCreator(await tradeFactory.getAddress(), true);

    await tradeFactory
      .connect(seller)
      .createDirectSale("camera", "dslr", "ipfs://image", ethers.parseEther("1"));

    const listing = await marketplace.getListing(1);

    expect(listing.id).to.equal(1n);
    expect(listing.seller).to.equal(seller.address);
    expect(listing.title).to.equal("camera");
    expect(listing.tradeContract).to.properAddress;
    expect(listing.active).to.equal(true);
  });
});
