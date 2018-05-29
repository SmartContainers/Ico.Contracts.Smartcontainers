const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const expect = require('chai')
    .use(require('chai-bignumber')(web3.BigNumber))
    .expect;

const LogiToken = artifacts.require('LogiToken');

contract('LOGI', function(accounts) {

    const sid = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const charles = accounts[3];

    let logiToken;

    function tokens(amount) {
        return new web3.BigNumber(amount).shift(18);
    };

    function waitOneMonth() {
        const oneMonth = 60 * 60 * 24 * 31;
        const id = Date.now();
        web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [oneMonth], id: id });
        web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", id: id + 1 });
    };

    function latestTime() {
        return web3.eth.getBlock('latest').timestamp;
    };

    beforeEach(async function() {
        logiToken = await LogiToken.new();
        await logiToken.generateTokens(sid, tokens(100), { from: sid });
    });

    describe('finishMinting()', function() {
        it('should forbid generating new tokens', async function() {
            await logiToken.finishMinting();
            await expectRevertOrFail(logiToken.generateTokens(sid, tokens(1), { from: sid }));
        });

        it('should enable transfering', async function() {
            assert.isNotTrue(await logiToken.transfersEnabled.call());
            await expectRevertOrFail(logiToken.transfer(alice, tokens(1), { from: sid }));

            await logiToken.finishMinting();

            assert.isTrue(await logiToken.transfersEnabled.call());
            assert.isTrue(await logiToken.transfer.call(alice, tokens(1), { from: sid }))
        });
    });

    describe('setLocks(_holders, _lockups)', function() {
        it('should lock funds', async function() {
            await logiToken.generateTokens(alice, tokens(1), { from: sid });

            let timeout = latestTime() + (60 * 60 * 24 * 31);

            await logiToken.setLocks([alice], [timeout], { from: sid });
            await logiToken.finishMinting();

            await expectRevertOrFail(logiToken.transfer(bob, tokens(1), { from: alice }));
        });

        it('should unlock funds after timeout', async function() {
            await logiToken.generateTokens(alice, tokens(1), { from: sid });

            let timeout = latestTime() + (60 * 60 * 24 * 31);

            await logiToken.setLocks([alice], [timeout], { from: sid });
            await logiToken.finishMinting();

            waitOneMonth();

            assert.isTrue(await logiToken.transfer.call(bob, tokens(1), { from: alice }))
        });

        it('should fire LockedTokens event', async function() {
            let timeout = latestTime() + (60 * 60 * 24 * 31);
            let result = await logiToken.setLocks([alice], [timeout], { from: sid });
            var log = result.logs.find(log => log.event == "LockedTokens" && log.args._holder == alice && log.args._lockup == timeout);
            assert(!!log);
        });
    });
});