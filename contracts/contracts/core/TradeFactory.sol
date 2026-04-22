// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../trading/DirectSale.sol";
import "../trading/OpenAuction.sol";
import "../trading/BlindAuction.sol";

interface IMarketplace {
    enum SaleType { DirectSale, OpenAuction, BlindAuction }
    function listItem(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        SaleType saleType,
        address tradeContract,
        address seller
    ) external returns (uint256);
}

/// @notice 거래 컨트랙트 배포 + 마켓플레이스 등록을 1 트랜잭션으로 처리
contract TradeFactory {
    address public immutable marketplace;
    address public immutable tokenAddr;
    address public immutable platformAddr;
    address public immutable interestCalcAddr;

    event DirectSaleCreated(address indexed seller, address indexed tradeContract, uint256 listingId);
    event OpenAuctionCreated(address indexed seller, address indexed tradeContract, uint256 listingId);
    event BlindAuctionCreated(address indexed seller, address indexed tradeContract, uint256 listingId);

    constructor(
        address _marketplace,
        address _token,
        address _platform,
        address _interestCalc
    ) {
        marketplace      = _marketplace;
        tokenAddr        = _token;
        platformAddr     = _platform;
        interestCalcAddr = _interestCalc;
    }

    function createDirectSale(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 price
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new DirectSale(price, msg.sender, tokenAddr, platformAddr, interestCalcAddr));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.DirectSale,
            tradeContract,
            msg.sender
        );
        emit DirectSaleCreated(msg.sender, tradeContract, listingId);
    }

    function createOpenAuction(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 reservePrice,
        uint256 durationSeconds
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new OpenAuction(reservePrice, durationSeconds, msg.sender, tokenAddr, platformAddr, interestCalcAddr));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.OpenAuction,
            tradeContract,
            msg.sender
        );
        emit OpenAuctionCreated(msg.sender, tradeContract, listingId);
    }

    function createBlindAuction(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 reservePrice,
        uint256 commitDuration,
        uint256 revealDuration
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new BlindAuction(reservePrice, commitDuration, revealDuration, msg.sender, tokenAddr, platformAddr, interestCalcAddr));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.BlindAuction,
            tradeContract,
            msg.sender
        );
        emit BlindAuctionCreated(msg.sender, tradeContract, listingId);
    }
}
