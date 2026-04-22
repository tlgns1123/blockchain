// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice 플랫폼 수수료 계산 (고정 2.5%)
/// @dev calculate() 시그니처는 OpenAuction/BlindAuction 호환성 유지 (durationSeconds 무시)
contract InterestCalculator {
    uint256 public constant FEE_BPS = 250;         // 2.5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @param principal 거래 금액 (wei)
    /// @param  거래 기간 — 무시됨 (고정 수수료)
    /// @return fee 플랫폼 수수료 (wei)
    function calculate(uint256 principal, uint256 /*durationSeconds*/)
        external
        pure
        returns (uint256 fee)
    {
        fee = (principal * FEE_BPS) / BPS_DENOMINATOR;
    }
}
