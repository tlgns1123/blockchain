const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DirectSale", function () {
  let directSale, seller, buyer, other;
  const PRICE = ethers.parseEther("1.0");

  beforeEach(async () => {
    [seller, buyer, other] = await ethers.getSigners();
    const DirectSale = await ethers.getContractFactory("DirectSale", seller);
    directSale = await DirectSale.deploy(PRICE);
  });

  it("판매자 주소와 가격이 올바르게 설정되어야 함", async () => {
    expect(await directSale.seller()).to.equal(seller.address);
    expect(await directSale.price()).to.equal(PRICE);
  });

  it("정확한 ETH 전송으로 구매 가능", async () => {
    await expect(
      directSale.connect(buyer).purchase({ value: PRICE })
    ).to.emit(directSale, "Purchased");
    expect(await directSale.buyer()).to.equal(buyer.address);
    expect(await directSale.state()).to.equal(1); // Locked
  });

  it("잘못된 ETH 금액으로 구매 불가", async () => {
    await expect(
      directSale.connect(buyer).purchase({ value: ethers.parseEther("0.5") })
    ).to.be.revertedWith("Wrong ETH amount");
  });

  it("수령 완료 시 판매자에게 ETH 전송", async () => {
    await directSale.connect(buyer).purchase({ value: PRICE });
    const before = await ethers.provider.getBalance(seller.address);
    await directSale.connect(buyer).confirmReceived();
    const after = await ethers.provider.getBalance(seller.address);
    expect(after).to.be.gt(before);
    expect(await directSale.state()).to.equal(2); // Completed
  });

  it("구매 전 판매자가 취소 가능", async () => {
    await expect(directSale.connect(seller).cancel()).to.emit(directSale, "Cancelled");
    expect(await directSale.state()).to.equal(3); // Cancelled
  });
});
