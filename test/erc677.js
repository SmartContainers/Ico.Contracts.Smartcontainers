const toBigNumber = require("./helpers.js").toBigNumber;
const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const encodeBytes = require("./helpers.js").encodeBytes;

const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

const erc677NotCompatible = artifacts.require("ERC677NotCompatible");
const erc677Receiver = artifacts.require("ERC677Receiver");

/**
 * The test suite configuration.
 * @typedef {Object} SuiteOptions
 * @property {string[]} accounts
 *   The unlocked accounts to test with (starting at index 1). At least 4 accounts are required.
 *   Contract owner is expected to be accounts[0].
 * @property {TokenCreateCallback} create
 *   Callback to create token contract with.
 * @property {TokenMintCallback} mint
 *   Callback to mint tokens with.
 */

/**
 * The token creation callback.
 * @callback TokenCreateCallback
 * @returns {Object} The deployed token contract.
 */

/**
 * The token purchase|mint callback.
 * @callback TokenMintCallback
 * @param {Object} contract The token created by TokenCreateCallback.
 * @param {string} to Account of the beneficiary.
 * @param {BigNumber|number} amount The amount of the tokens to mint.
 * @returns {BigNumber|number} The actual initial supply.
 */

/**
 * Function will test the given contract to fullfil ERC-677 token standard.
 * Expected to be called within mocha context.
 * @param {SuiteOptions} options
 */
module.exports = function(options) {

    const initialSupplyTokens = toBigNumber(100);
    const sid = options.accounts[0];
    const alice = options.accounts[1];
    const bob = options.accounts[2];
    const charles = options.accounts[3];

    let contract, erc677ReceiverContract, erc677NotCompatibleContract, decimals, initialSupply, initialBalances, initialAllowances;

    async function credit(to, amount) {
        return await contract.transfer(to, amount, { from: sid });
    };

    function tokens(amount) {
        return new web3.BigNumber(amount).shift(decimals);
    };

    beforeEach(async function() {
        contract = await options.create();
        erc677NotCompatibleContract = await erc677NotCompatible.new();
        erc677ReceiverContract = await erc677Receiver.new();
        decimals = contract.decimals ? await contract.decimals.call() : 0;
        initialSupply = tokens(initialSupplyTokens);
        await options.mint(contract, sid, initialSupply);
        initialBalances = [
            [sid, initialSupply]
        ];
        initialAllowances = [];
    });

    afterEach(async function() {
        contract = null;
        decimals = 0;
    })

    describe('ERC-677', function() {
        describe('transferAndCall(_to, _amount, _data)', function() {
            it('should transfer the tokens', async function() {
                expect(await contract.balanceOf.call(erc677ReceiverContract.address)).to.be.bignumber.equal(0);
                await contract.transferAndCall(erc677ReceiverContract.address, tokens(1), [], { from: sid });
                expect(await contract.balanceOf.call(erc677ReceiverContract.address)).to.be.bignumber.equal(tokens(1));
                expect(await contract.balanceOf.call(sid)).to.be.bignumber.equal(initialSupply.minus(tokens(1)));
            });

            it('should transfer the tokens to a regular wallet address', async function() {
                expect(await contract.balanceOf.call(bob)).to.be.bignumber.equal(0);
                await contract.transferAndCall(bob, tokens(1), [], { from: sid });
                expect(await contract.balanceOf.call(bob)).to.be.bignumber.equal(tokens(1));
                expect(await contract.balanceOf.call(sid)).to.be.bignumber.equal(initialSupply.minus(tokens(1)));
            });

            it('should call the tokenFallback() after transfer', async function() {
                await contract.transferAndCall(erc677ReceiverContract.address, tokens(1), [], { from: sid });
                assert.isTrue(await erc677ReceiverContract.calledFallback.call());
                assert.equal(await erc677ReceiverContract.tokenSender.call(), sid);
                expect(await erc677ReceiverContract.sentValue.call()).to.be.bignumber.equal(tokens(1));
            });

            it("should return true when the transfer succeeds", async () => {
                assert.isTrue(await contract.transferAndCall.call(erc677ReceiverContract.address, tokens(1), [], { from: sid }));
            });

            it('should revert when trying to transfer more than balance', async function() {
                await expectRevertOrFail(contract.transferAndCall(erc677ReceiverContract.address, tokens(1), [], { from: alice }));
                await expectRevertOrFail(contract.transferAndCall(erc677ReceiverContract.address, tokens(initialSupply.plus(1)), [], { from: sid }));
            });

            it('should revert when trying to transfer to not-ERC677-compatible contract', async function() {
                await expectRevertOrFail(contract.transferAndCall(erc677NotCompatibleContract.address, tokens(10), [], { from: alice }));
                await expectRevertOrFail(contract.transferAndCall(erc677NotCompatibleContract.address, tokens(initialSupply.plus(1)), [], { from: sid }));
            });

            it('should fire Transfer event with additional data', async function() {
                let result = await contract.transferAndCall(erc677ReceiverContract.address, tokens(1), [], { from: sid });
                var log = result.logs.find(log => log.event == "Transfer" && log.args._from == sid && log.args._to == erc677ReceiverContract.address && !!log.args._data);
                assert(!!log);
                expect(log.args._amount).to.be.bignumber.equal(tokens(1));
            });

            it('should fire Transfer event with additional data when transferring amount of 0', async function() {
                let result = await contract.transferAndCall(erc677ReceiverContract.address, 0, [], { from: sid });
                var log = result.logs.find(log => log.event == "Transfer" && log.args._from == sid && log.args._to == erc677ReceiverContract.address && !!log.args._data);
                assert(!!log);
                expect(log.args._amount).to.be.bignumber.equal(0);
            });
        });
    });
} 