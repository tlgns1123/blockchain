// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAuction.sol";
import "../interfaces/IInterestCalculator.sol";

/// @notice 블라인드 경매 (Vickrey) - BKT 토큰 결제
contract BlindAuction is IAuction, ReentrancyGuard {
    struct CommitData {
        bytes32 commitment;
        uint256 deposit;
        bool revealed;
    }

    IERC20 public immutable token;
    address public immutable platform;
    IInterestCalculator public immutable interestCalc;

    address public immutable seller;
    uint256 public override endTime;
    uint256 public revealEndTime;
    AuctionState public override state;
    address public override winner;
    uint256 public override winningAmount;
    uint256 public highestBid;
    uint256 public secondHighestBid;
    address public highestBidder;
    uint256 public reservePrice;

    mapping(address => CommitData) public commits;
    address[] public bidders;

    event CommitSubmitted(address indexed bidder);
    event BidRevealed(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 chargedAmount);

    constructor(
        uint256 _reservePrice,
        uint256 _commitDuration,
        uint256 _revealDuration,
        address _seller,
        address _token,
        address _platform,
        address _interestCalc
    ) {
        seller = _seller;
        reservePrice = _reservePrice;
        endTime = block.timestamp + _commitDuration;
        revealEndTime = endTime + _revealDuration;
        token = IERC20(_token);
        platform = _platform;
        interestCalc = IInterestCalculator(_interestCalc);
        state = AuctionState.Active;
        emit AuctionStarted(0, _seller, endTime);
    }

    function commit(bytes32 commitment, uint256 deposit) external nonReentrant {
        require(msg.sender != seller, "Seller cannot bid");
        require(state == AuctionState.Active, "Not in commit phase");
        require(block.timestamp < endTime, "Commit phase ended");
        require(deposit >= reservePrice, "Deposit below reserve");
        require(commits[msg.sender].deposit == 0, "Already committed");
        require(token.transferFrom(msg.sender, address(this), deposit), "Token transfer failed");

        commits[msg.sender] = CommitData({ commitment: commitment, deposit: deposit, revealed: false });
        bidders.push(msg.sender);

        emit CommitSubmitted(msg.sender);
    }

    function reveal(uint256 bidAmount, bytes32 secret) external nonReentrant {
        require(block.timestamp >= endTime, "Commit phase not ended");
        require(block.timestamp < revealEndTime, "Reveal phase ended");

        CommitData storage c = commits[msg.sender];
        require(c.deposit > 0, "No commit found");
        require(!c.revealed, "Already revealed");
        require(keccak256(abi.encodePacked(bidAmount, secret)) == c.commitment, "Hash mismatch");
        require(c.deposit >= bidAmount, "Deposit below bid");

        c.revealed = true;
        emit BidRevealed(msg.sender, bidAmount);

        if (bidAmount > highestBid) {
            secondHighestBid = highestBid;
            highestBid = bidAmount;
            highestBidder = msg.sender;
        } else if (bidAmount > secondHighestBid) {
            secondHighestBid = bidAmount;
        }
    }

    function finalizeAuction() external nonReentrant {
        require(block.timestamp >= revealEndTime, "Reveal not ended");
        require(state == AuctionState.Active, "Already finalized");
        state = AuctionState.Ended;

        if (highestBidder == address(0) || highestBid < reservePrice) {
            winner = address(0);
            winningAmount = 0;
            emit AuctionEnded(0, address(0), 0);

            for (uint256 i = 0; i < bidders.length; i++) {
                address bidder = bidders[i];
                uint256 refund = commits[bidder].deposit;
                if (refund > 0) {
                    commits[bidder].deposit = 0;
                    require(token.transfer(bidder, refund), "Refund failed");
                }
            }

            return;
        }

        winner = highestBidder;
        winningAmount = secondHighestBid >= reservePrice ? secondHighestBid : reservePrice;
        emit AuctionEnded(0, winner, winningAmount);

        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            if (bidder == winner) continue;

            uint256 refund = commits[bidder].deposit;
            if (refund > 0) {
                commits[bidder].deposit = 0;
                require(token.transfer(bidder, refund), "Refund failed");
            }
        }

        if (commits[winner].deposit > winningAmount) {
            uint256 excess = commits[winner].deposit - winningAmount;
            commits[winner].deposit = winningAmount;
            require(token.transfer(winner, excess), "Excess refund failed");
        }
    }

    function confirmReceived() external override nonReentrant {
        require(state == AuctionState.Ended, "Not ended");
        require(winner != address(0), "No winner");
        require(msg.sender == winner, "Not winner");

        state = AuctionState.Finalized;
        emit Finalized(0);

        uint256 fee = interestCalc.calculate(winningAmount, 0);
        uint256 sellerAmount = winningAmount > fee ? winningAmount - fee : 0;

        if (fee > 0) require(token.transfer(platform, fee), "Platform fee failed");
        if (sellerAmount > 0) require(token.transfer(seller, sellerAmount), "Seller transfer failed");

        emit AuctionFinalized(winner, winningAmount);
    }
}