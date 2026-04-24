// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAuction.sol";
import "../interfaces/IInterestCalculator.sol";

/// @notice 공개 경매 (English Auction) - BKT 토큰 결제
contract OpenAuction is IAuction, ReentrancyGuard {
    IERC20 public immutable token;
    address public immutable platform;
    IInterestCalculator public immutable interestCalc;

    address public immutable seller;
    uint256 public override endTime;
    AuctionState public override state;
    address public override winner;
    uint256 public override winningAmount;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public reservePrice;

    mapping(address => uint256) public pendingReturns;

    event BidPlaced(address indexed bidder, uint256 amount);
    event BidRefunded(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 amount);

    constructor(
        uint256 _reservePrice,
        uint256 _durationSeconds,
        address _seller,
        address _token,
        address _platform,
        address _interestCalc
    ) {
        seller = _seller;
        reservePrice = _reservePrice;
        endTime = block.timestamp + _durationSeconds;
        token = IERC20(_token);
        platform = _platform;
        interestCalc = IInterestCalculator(_interestCalc);
        state = AuctionState.Active;
        emit AuctionStarted(0, _seller, endTime);
    }

    function bid(uint256 amount) external nonReentrant {
        require(msg.sender != seller, "Seller cannot bid");
        require(state == AuctionState.Active, "Auction not active");
        require(block.timestamp < endTime, "Auction ended");
        require(amount > highestBid, "Bid too low");
        require(amount >= reservePrice, "Below reserve");
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        if (highestBidder != address(0) && highestBid > 0) {
            bool refunded = token.transfer(highestBidder, highestBid);
            if (!refunded) {
                pendingReturns[highestBidder] += highestBid;
            }
            emit BidRefunded(highestBidder, highestBid);
        }

        highestBidder = msg.sender;
        highestBid = amount;
        emit BidPlaced(msg.sender, amount);
    }

    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingReturns[msg.sender] = 0;
        emit BidRefunded(msg.sender, amount);
        require(token.transfer(msg.sender, amount), "Refund failed");
    }

    function endAuction() external nonReentrant {
        require(state == AuctionState.Active, "Not active");
        require(block.timestamp >= endTime, "Not ended yet");
        require(msg.sender == seller || msg.sender == highestBidder, "Not authorized to end");
        state = AuctionState.Ended;
        winner = highestBidder;
        winningAmount = highestBid;
        emit AuctionEnded(0, winner, winningAmount);
    }

    function confirmReceived() external override nonReentrant {
        require(state == AuctionState.Ended, "Not ended");
        require(winner != address(0), "No winner");
        require(msg.sender == winner, "Not winner");

        state = AuctionState.Finalized;
        emit Finalized(0);
        emit AuctionFinalized(winner, winningAmount);

        uint256 fee = interestCalc.calculate(winningAmount, 0);
        uint256 sellerAmount = winningAmount > fee ? winningAmount - fee : 0;

        if (fee > 0) require(token.transfer(platform, fee), "Platform fee failed");
        if (sellerAmount > 0) require(token.transfer(seller, sellerAmount), "Seller transfer failed");
    }
}

