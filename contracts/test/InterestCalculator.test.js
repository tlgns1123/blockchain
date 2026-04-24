const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InterestCalculator", function () {
  let calc;

  beforeEach(async () => {
    const InterestCalculator = await ethers.getContractFactory("InterestCalculator");
    calc = await InterestCalculator.deploy();
  });

  it("calculates a fixed 2.5 percent fee", async () => {
    const principal = ethers.parseEther("1");
    const fee = await calc.calculate(principal, 365 * 24 * 3600);
    expect(fee).to.equal(ethers.parseEther("0.025"));
  });

  it("returns the same fee regardless of duration", async () => {
    const principal = ethers.parseEther("5");
    const shortFee = await calc.calculate(principal, 60);
    const longFee = await calc.calculate(principal, 365 * 24 * 3600);
    expect(shortFee).to.equal(longFee);
  });
});
