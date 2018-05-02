const LogiToken = artifacts.require('LogiToken');
const LogiVotingSample = artifacts.require('LogiVotingSample');
const MiniMeToken = artifacts.require('MiniMeToken');

const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

contract('LOGI voting sample', function(accounts) {

    const sid = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const charles = accounts[3];
    const yay = accounts[4];
    const nay = accounts[5];

    let logiToken, logiVotingController, logiVotingToken;

    function tokens(amount) {
        return new web3.BigNumber(amount).shift(18);
    };

    function waitTwoWeeks() {
        const twoWeeks = 2 * 7 * 24 * 60 * 60;
        web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [twoWeeks], id: 0 })
    };

    beforeEach(async function() {
        logiToken = await LogiToken.new();
        await logiToken.generateTokens(alice, tokens(1));
        await logiToken.generateTokens(bob, tokens(2));
        await logiToken.generateTokens(charles, tokens(3));
        await logiToken.finishMinting();

        logiVotingController = await LogiVotingSample.new(logiToken.address, 0, yay, nay);
        logiVotingToken = await MiniMeToken.at(await logiVotingController.votingToken.call());
    });

    describe('ctor', function() {
        it('should create voting token with correct balances', async function() {
            expect(await logiVotingToken.balanceOf.call(alice)).to.be.bignumber.equal(tokens(1));
            expect(await logiVotingToken.balanceOf.call(bob)).to.be.bignumber.equal(tokens(2));
            expect(await logiVotingToken.balanceOf.call(charles)).to.be.bignumber.equal(tokens(3));
        });

        it('should create voting token with transfers forbidden', async function() {
            assert.isNotTrue(await logiVotingToken.transfersEnabled.call());
            await expectRevertOrFail(logiVotingToken.transfer(yay, tokens(1), { from: alice }));
        });

        it('should set voting token controller', async function() {
            assert.equal(await logiVotingToken.controller.call(), logiVotingController.address);
        });
    });

    describe('vote(_vote)', function() {
        it('should transfer the tokens', async function() {
            expect(await logiVotingToken.balanceOf.call(yay)).to.be.bignumber.equal(0);
            expect(await logiVotingToken.balanceOf.call(nay)).to.be.bignumber.equal(0);
            expect(await logiVotingToken.balanceOf.call(alice)).to.be.bignumber.equal(tokens(1));
            expect(await logiVotingToken.balanceOf.call(bob)).to.be.bignumber.equal(tokens(2));

            await logiVotingController.vote(false, { from: alice });
            await logiVotingController.vote(true, { from: bob });

            expect(await logiVotingToken.balanceOf.call(yay)).to.be.bignumber.equal(tokens(2));
            expect(await logiVotingToken.balanceOf.call(nay)).to.be.bignumber.equal(tokens(1));
            expect(await logiVotingToken.balanceOf.call(alice)).to.be.bignumber.equal(tokens(0));
            expect(await logiVotingToken.balanceOf.call(bob)).to.be.bignumber.equal(0);
        });

        it('should not change balances on double-voting', async function() {
            await logiVotingController.vote(true, { from: bob });

            expect(await logiVotingToken.balanceOf.call(bob)).to.be.bignumber.equal(0);
            expect(await logiVotingToken.balanceOf.call(yay)).to.be.bignumber.equal(tokens(2));

            await logiVotingController.vote(true, { from: bob });

            expect(await logiVotingToken.balanceOf.call(bob)).to.be.bignumber.equal(0);
            expect(await logiVotingToken.balanceOf.call(yay)).to.be.bignumber.equal(tokens(2));
        });

        it('should revert on revoking', async function() {
            await expectRevertOrFail(logiVotingController.vote(false, { from: yay }));
            await expectRevertOrFail(logiVotingController.vote(true, { from: nay }));
        });

        it('should revert on voting after finish', async function() {
            waitTwoWeeks();
            await expectRevertOrFail(logiVotingController.vote(true, { from: bob }));
        });

        it('should revert on claiming before finish', async function() {
            await expectRevertOrFail(logiVotingController.doSomethingUsefulAfterVoting({ from: sid }));
        });

        it('should claim after finish', async function() {
            await logiVotingController.vote(true, { from: bob });

            waitTwoWeeks();

            await logiVotingController.doSomethingUsefulAfterVoting({ from: sid });
            let result = await logiVotingController.result.call();
            console.log(`Result: ${result}`);
        });
    });
});