const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InterestCalculator", function () {
  let calc;

  beforeEach(async () => {
    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    calc = await InterestCalculator.deploy();
  });

  it("연 5% 이자 계산 (1 ETH, 1년)", async () => {
    const principal = ethers.parseEther("1.0");
    const oneYear = 365 * 24 * 3600;
    const interest = await calc.calculate(principal, oneYear);
    // 1 ETH * 5% = 0.05 ETH
    expect(interest).to.equal(ethers.parseEther("0.05"));
  });

  it("짧은 기간 이자 계산", async () => {
    const principal = ethers.parseEther("1.0");
    const oneDay = 24 * 3600;
    const interest = await calc.calculate(principal, oneDay);
    expect(interest).to.be.gt(0n);
  });
});
