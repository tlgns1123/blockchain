// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarketplace {
    enum SaleType { DirectSale, OpenAuction, BlindAuction }

    struct Listing {
        uint256 id;
        address seller;
        string title;
        string description;
        string imageHash; // IPFS hash
        SaleType saleType;
        address tradeContract; // DirectSale / OpenAuction / BlindAuction 컨트랙트 주소
        bool active;
    }

    event ItemListed(uint256 indexed listingId, address indexed seller, SaleType saleType);
    event ItemDelisted(uint256 indexed listingId);

    function listItem(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        SaleType saleType,
        address tradeContract
    ) external returns (uint256 listingId);

    function delistItem(uint256 listingId) external;

    function getListing(uint256 listingId) external view returns (Listing memory);
    function getListings(uint256 offset, uint256 limit) external view returns (Listing[] memory);
}
