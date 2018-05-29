const minime = require('./minime');

const LogiToken = artifacts.require('LogiToken');

contract('LOGI', function(accounts) {
    minime({
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
