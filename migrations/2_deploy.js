var SmarcToken = artifacts.require("SmarcToken");
var LogiToken = artifacts.require("LogiToken");

module.exports = function(deployer) {
  deployer.deploy(SmarcToken);
  deployer.deploy(LogiToken);
};