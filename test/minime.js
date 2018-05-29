const toBigNumber = require("./helpers.js").toBigNumber;
const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const encodeBytes = require("./helpers.js").encodeBytes;

const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

const approveAndCallNotCompatible = artifacts.require("Empty");
const approveAndCallReceiver = artifacts.require("ApproveAndCallReceiver");

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

    let contract, approveAndCallReceiverContract, approveAndCallNotCompatibleContract, decimals, initialSupply, initialBalances, initialAllowances;

    async function credit(to, amount) {
        return await contract.transfer(to, amount, { from: sid });
    };

    function tokens(amount) {
        return new web3.BigNumber(amount).shift(decimals);
    };

    beforeEach(async function() {
        contract = await options.create();
        approveAndCallNotCompatibleContract = await approveAndCallNotCompatible.new();
        approveAndCallReceiverContract = await approveAndCallReceiver.new();
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

    describe('MiniMe', function() {
        describe('approveAndCall( _spender, _amount, _extraData)', function() {
            it('should approve', async function() {
                expect(await contract.allowance.call(sid, approveAndCallReceiverContract.address)).to.be.bignumber.equal(0);
                await contract.approveAndCall(approveAndCallReceiverContract.address, tokens(1), [], { from: sid });
                expect(await contract.allowance.call(sid, approveAndCallReceiverContract.address)).to.be.bignumber.equal(tokens(1));
            });

            it('should call the receiveApproval() after approvement', async function() {
                await contract.approveAndCall(approveAndCallReceiverContract.address, tokens(1), [], { from: sid });
                assert.isTrue(await approveAndCallReceiverContract.calledFallback.call());
                assert.equal(await approveAndCallReceiverContract.tokenOwner.call(), sid);
                expect(await approveAndCallReceiverContract.approvedAmount.call()).to.be.bignumber.equal(tokens(1));
            });

            it('should revert when trying to transfer to not-approveAndCall-compatible contract', async function() {
                await expectRevertOrFail(contract.approveAndCall(approveAndCallNotCompatibleContract.address, tokens(1), [], { from: sid }));
            });
        });
    });
} 