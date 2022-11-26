# asa-airdrop
Algorand ASA Airdrop

## Disclaimer
* This tool is provided as is. It is your responsibility to check everything before minting.
* I strongly suggest to test it on testnet to make sure the tool is working properly.

## You will need
* Node
* Visual Studio Code 

## Installation
Once Node and VS Code are installed, simply run below command:
```
npm install
```
Open the solution in VS Code.

There are several things to configure:
* .env
  * AIRDROP_MNEMONIC_MAINNET - your account mnemonic for mainnet (each word is space separated).
  * AIRDROP_ACCOUNT_MAINNET - your account address for mainnet.
  * AIRDROP_ASSET_MAINNET - your asset id for mainnet.
  * AIRDROP_MNEMONIC_TESTNET - your account mnemonic for testnet (each word is space separated).
  * AIRDROP_ACCOUNT_TESTNET - your account address for testnet.
  * AIRDROP_ASSET_TESTNET - your asset id for testnet.
  * AIRDROP_ASSET_MULTIPLIER - if your asset has any decimals set it to 1xxxxxxx where x is 0 for each decimal place. Eg. for 6 decimal places use 1000000.
  
* index.js - Line [188](https://github.com/1fatalix1/asa-airdrop/blob/main/index.js#:~:text=start(%27testnet%27%2C%20true%2C%20rule)%3B) is your entry point, which takes 3 parameters
  * network: **mainnet** or **testnet**
  * dryRun: **true** or **false**. If set to true, the script will run without sending any transactions.
  * scheduleType: **rule** or **cron**. Lines [163-166](https://github.com/1fatalix1/asa-airdrop/blob/main/index.js#:~:text=const%20rule%20%3D,%3D%200%3B) define rule type schedule. Line [169](https://github.com/1fatalix1/asa-airdrop/blob/main/index.js#:~:text=const%20cron%20%3D%20%27*/30%20*%20*%20*%20*%20*%27//%20every%2030%20seconds) defines cron type schedule.
  
* assets-mainnet.json - your mainnet list of assets
* assets-testnet.json - your mainnet list of assets

Once everything is set up, simply run it by executing below command in Command Prompt:
```
node index.js
```
The script will invoke airdrop process at defined intervals.

If you have any problems, feel free to get in touch with me.

Pull requests are welcome.

