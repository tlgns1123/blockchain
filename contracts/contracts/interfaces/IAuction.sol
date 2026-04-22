// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAuction {
    enum AuctionState { Active, Ended, Finalized }

    event AuctionStarted(uint256 indexed auctionId, address indexed seller, uint256 endTime);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event Finalized(uint256 indexed auctionId);

    function endTime() external view returns (uint256);
    function state() external view returns (AuctionState);
    function winner() external view returns (address);
    function winningAmount() external view returns (uint256);

    /// 낙찰자가 수령 완료 시 호출 → 판매자에게 정산
    function confirmReceived() external;
}
