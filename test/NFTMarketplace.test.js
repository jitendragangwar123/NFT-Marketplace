const {expect}=require("chai");
const { ethers } = require("hardhat");

const toWei=(num)=>ethers.utils.parseEther(num.toString())//1 ether == 10**18 wei
const fromWei=(num)=> ethers.utils.formatEther(num)
describe("NFTMarketplace",function(){
    let deployer,add1,add2,nft,marketplace;
    let feePercent=1, URI="Sample URI";
    beforeEach(async function(){
    //get contract factories
    const NFT=await ethers.getContractFactory("NFT");
    const Marketplace=await ethers.getContractFactory("Marketplace");
    //get Signers
    [deployer,add1,add2]=await ethers.getSigners();
    //deploy contracts
    nft=await NFT.deploy();
    marketplace=await Marketplace.deploy(feePercent);
    });
    describe("Deployment",function(){
        it("Should track name and symbol of the nft collecton",async function(){
            expect(await nft.name()).to.equal("Guardian NFT");
            expect(await nft.symbol()).to.equal("GRD");
        })
        it("Should track feeAccount and feePercent of the nft collecton",async function(){
            expect(await marketplace.feeAccount()).to.equal(deployer.address);
            expect(await marketplace.feePercent()).to.equal(feePercent);
        })
    })
    describe("Miniting NFTs",function(){
        it("Should track each minted NFT",async function(){
            //add1 mints an NFT
            await nft.connect(add1).mint(URI)
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(add1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);

            //add2 mints an NFT
            await nft.connect(add2).mint(URI)
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(add2.address)).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);

        })
    })
    describe("Making Marketplace items",function(){
        beforeEach(async function(){
            //add1 mints an nft
            await nft.connect(add1).mint(URI)
            //add1 approves marketplace to spend nft
            await nft.connect(add1).setApprovalForAll(marketplace.address,true)
        })
        it("Should track new created item, transfer NFT from seller to marketplace and emit Offered event",async function(){
            //add1 offers their nft at a price of 1 ether
            await expect(marketplace.connect(add1).makeItem(nft.address,1,toWei(1)))
            .to.emit(marketplace,"Offered")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(1),
                add1.address
            )
            //Owner of NFT should now be the marketplace
            expect(await nft.ownerOf(1)).to.equal(marketplace.address)
            //item count should now equal to 1
            expect(await marketplace.itemCount()).to.equal(1)
            //get item from items mapping than check fields to ensure they are correct
            const item=await marketplace.items(1)
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(1))
            expect(item.sold).to.equal(false)
        })
        it("Should fail if price is set to Zero",async function(){
            await expect(
                marketplace.connect(add1).makeItem(nft.address,1,0)
            ).to.be.revertedWith("Price must be greater than zero");
        });
    });

    describe("Purchasing Marketplace Items",function(){
        let price=2;
        let totalPriceInWei;
        beforeEach(async function(){
            //add1 mints an nft
            await nft.connect(add1).mint(URI)
            //add1 approves marketplace to spend nft
            await nft.connect(add1).setApprovalForAll(marketplace.address,true);
            //add1  makes their nft a marketplace item
            await marketplace.connect(add1).makeItem(nft.address,1,toWei(price));
        })
        it("Should update item as sold ,pay seller,transfer NFT to buyer, charge fees and emit a Bought event",async function(){
            const sellerInitialEthBal=await add1.getBalance()
            const feeAccountInitialEthBal=await deployer.getBalance()
            //fetch items total price(market fees+item price)
            totalPriceInWei=await marketplace.getTotalPrice(1);
            //add2 purchases item
            await expect(marketplace.connect(add2).purchaseItem(1,{value: totalPriceInWei}))
            .to.emit(marketplace,"Bought")
            .withArgs(
                1,
                nft.address,
                1,
                toWei(price),
                add1.address,
                add2.address
            )
            const sellerFinalEthBal=await add1.getBalance()
            const feeAccountFinalEthBal=await deployer.getBalance()
            //seller should recieve payment for the price of the NFT sold
            expect(fromWei(sellerFinalEthBal)).to.equal(price ** fromWei(sellerInitialEthBal))
            //calculate the fee
            const fee=(feePercent/100)*price
            //feeAccount should recieve fee
            expect(fromWei(feeAccountFinalEthBal)).to.equal(fee ** fromWei(feeAccountInitialEthBal))
            //the buyer should now own the NFT
            expect(await nft.ownerOf(1)).to.equal(add2.address); 
            //Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true);   
        })
        it("Should fail for invalid item ids, sold item and when not enough ether is paid",async function(){
            //fails for invalid item ids
            await expect(
                marketplace.connect(add2).purchaseItem(2,{value: totalPriceInWei})
            ).to.be.revertedWith("Item does not exist");
            await expect(
                marketplace.connect(add2).purchaseItem(0,{value:totalPriceInWei})
            ).to.be.revertedWith("Item does not exist");
            //fails when not enough ether is paid with the transaction
            await expect(
                marketplace.connect(add2).purchaseItem(1,{value: toWei(price)})
            ).to.be.revertedWith("not enough ether to cover item price and market fee");
            //add2 purchases item 1
            await marketplace.connect(add2),purchaseItem(1,{value: totalPriceInWei})
            //deployer items purchasing item 1 after its been sold 
            await expect(
                marketplace.connect(deployer).purchaseItem(1,{value: totalPriceInWei})
            ).to.be.revertedWith("Item already sold");
        })
    })

})

