const erc677 = require('./erc677');

const LogiToken = artifacts.require('LogiToken');

contract('LOGI', function(accounts) {
    erc677({
        accounts: accounts,
        create: async () => {
            return await LogiToken.new();
        },
        mint: async (contract, to, amount) => {
            await contract.generateTokens(to, amount, { from: accounts[0] });
            await contract.finishMinting({ from: accounts[0] });
        }
    });
});
