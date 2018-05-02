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
});