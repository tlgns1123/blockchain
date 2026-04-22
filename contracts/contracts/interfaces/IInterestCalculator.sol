// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInterestCalculator {
    /// @param principal 거래 금액 (wei)
    /// @param durationSeconds 거래 기간 (초) — 구현체에 따라 무시될 수 있음
    /// @return fee 플랫폼이 수취할 수수료 (wei)
    function calculate(uint256 principal, uint256 durationSeconds) external pure returns (uint256 fee);
}
