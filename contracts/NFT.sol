// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract NFT is ERC721URIStorage{
    //State variable which track the number of tokens
    uint public tokenCount;
    //Craete a constructor
    constructor()ERC721("Guardian NFT","GRD"){}
    function mint(string memory _tokenURI) external returns(uint){
        tokenCount+=1;
        //_safeMint is inherited function from ERC721URIStorage 
        _safeMint(msg.sender,tokenCount);
        //Set the metadata of NFT
        _setTokenURI(tokenCount, _tokenURI);
        return(tokenCount);
    }
}

