const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

const SmarcToken = artifacts.require('SmarcToken');

contract('SMARC', function(accounts) {

    const sid = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const charles = accounts[3];
    const burnable = accounts[4];

    let smarcToken;

    function tokens(amount) {
        return new web3.BigNumber(amount).shift(18);
    };

    function waitOneMonth() {
        const oneMonth = 60 * 60 * 24 * 31;
        web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [oneMonth], id: 0 })
    };

    beforeEach(async function() {
        smarcToken = await SmarcToken.new();
        await smarcToken.generateTokens(sid, tokens(100), { from: sid });
    });

    describe('finishMinting()', function() {
        it('should forbid generating new tokens', async function() {
            await smarcToken.finishMinting(burnable);
            await expectRevertOrFail(smarcToken.generateTokens(sid, tokens(1), { from: sid }));
        });

        it('should enable transfering', async function() {
            assert.isNotTrue(await smarcToken.transfersEnabled.call());
            await expectRevertOrFail(smarcToken.transfer(alice, tokens(1), { from: sid }));

            await smarcToken.finishMinting(burnable);

            assert.isTrue(await smarcToken.transfersEnabled.call());
            assert.isTrue(await smarcToken.transfer.call(alice, tokens(1), { from: sid }))
        });
    });

    describe('setLocks(_holders, _lockups)', function() {
        it('should lock funds', async function() {
            await smarcToken.generateTokens(alice, tokens(1), { from: sid });

            let timeout = (Date.now() / 1000) + (60 * 60 * 24 * 31);

            await smarcToken.setLocks([alice], [timeout], { from: sid });
            await smarcToken.finishMinting(burnable);

            await expectRevertOrFail(smarcToken.transfer(bob, tokens(1), { from: alice }));
        });

        it('should unlock funds after timeout', async function() {
            await smarcToken.generateTokens(alice, tokens(1), { from: sid });

            let timeout = (Date.now() / 1000) + (60 * 60 * 24 * 31);

            await smarcToken.setLocks([alice], [timeout], { from: sid });
            await smarcToken.finishMinting(burnable);

            waitOneMonth();

            assert.isTrue(await smarcToken.transfer.call(bob, tokens(1), { from: alice }))
        });
    });

    describe('burn(_amount)', function() {
        it('should decrease burnable and totalSupply', async function() {
            await smarcToken.generateTokens(bob, tokens(20), { from: sid });
            await smarcToken.finishMinting(burnable);
            await smarcToken.transfer(burnable, tokens(50), { from: sid });
            await smarcToken.transfer(burnable, tokens(10), { from: bob });

            expect(await smarcToken.totalSupply.call()).to.be.bignumber.equal(tokens(120));
            expect(await smarcToken.balanceOf.call(burnable)).to.be.bignumber.equal(tokens(60));

            await smarcToken.burn(tokens(60), { from: sid });

            expect(await smarcToken.totalSupply.call()).to.be.bignumber.equal(tokens(60));
            expect(await smarcToken.balanceOf.call(burnable)).to.be.bignumber.equal(tokens(0));
        });

        it('should revert when trying to burn more than balance', async function() {
            await expectRevertOrFail(smarcToken.burn(tokens(1), { from: sid }));
        });

        it('should fire Transfer event', async function() {
            await smarcToken.finishMinting(burnable);
            await smarcToken.transfer(burnable, tokens(50), { from: sid });

            let result = await smarcToken.burn(tokens(50), { from: sid });
            var log = result.logs.find(log => log.event == "Transfer" && log.args._from == burnable && log.args._to == "0x0000000000000000000000000000000000000000");
            assert(!!log);
            expect(log.args._amount).to.be.bignumber.equal(tokens(50));
        });
    });
});