"use strict";angular.module("owsWalletPlugin",["gettext","ionic","ngLodash","owsWalletPluginClient","owsWalletPlugin.api","owsWalletPlugin.controllers","owsWalletPlugin.services"]),angular.module("owsWalletPlugin.api",[]),angular.module("owsWalletPlugin.controllers",[]),angular.module("owsWalletPlugin.services",[]),angular.module("owsWalletPlugin").config(function($pluginConfigProvider){$pluginConfigProvider.router.routes([{path:"/accounts/:accountId",method:"GET",handler:"getAccounts"},{path:"/accounts/:accountId/addresses",method:"POST",handler:"createAddress"},{path:"/accounts/:accountId/buys",method:"POST",handler:"requestBuy"},{path:"/accounts/:accountId/sells",method:"POST",handler:"requestSell"},{path:"/currencies",method:"GET",handler:"getAvailableCurrencies"},{path:"/payment-methods",method:"GET",handler:"getPaymentMethods"},{path:"/prices",method:"GET",handler:"getPriceInfo"},{path:"/prices/buy/:currency",method:"GET",handler:"getBuyPrice"},{path:"/prices/historic/:currencyPair/:period",method:"GET",handler:"getHistoricPrice"},{path:"/prices/sell/:currency",method:"GET",handler:"getSellPrice"},{path:"/prices/spot",method:"GET",handler:"getSpotPrice"},{path:"/service",method:"PUT",handler:"service"},{path:"/transactions/pending",method:"GET",handler:"getPendingTransactions"},{path:"/transactions/pending",method:"POST",handler:"savePendingTransactions"},{path:"/urls",method:"GET",handler:"getUrls"},{path:"/user",method:"GET",handler:"getUser"}])}).run(function(){owswallet.Plugin.ready(function(){})}),angular.module("owsWalletPlugin").run(["gettextCatalog",function(gettextCatalog){}]),angular.module("owsWalletPlugin.services").factory("coinbaseService",function($rootScope,$log,lodash,Http,Session,Storage,Settings,Host){function setCredentials(config){credentials.NETWORK="livenet/btc",credentials.SCOPE="wallet:accounts:read,wallet:addresses:read,wallet:addresses:create,wallet:user:read,wallet:user:email,wallet:buys:read,wallet:buys:create,wallet:sells:read,wallet:sells:create,wallet:transactions:read,wallet:transactions:send,wallet:payment-methods:read",credentials.REDIRECT_URI=isCordova?config.redirect_uri.mobile:config.redirect_uri.desktop,credentials.NETWORK.indexOf("testnet")>=0?(credentials.HOST=config.sandbox.host,credentials.API=config.sandbox.api,credentials.CLIENT_ID=config.sandbox.client_id,credentials.CLIENT_SECRET=config.sandbox.client_secret):(credentials.HOST=config.production.host,credentials.API=config.production.api,credentials.CLIENT_ID=config.production.client_id,credentials.CLIENT_SECRET=config.production.client_secret),credentials.API_VERSION="2017-10-31",createCoinbaseHostProvider()}function createCoinbaseHostProvider(){coinbaseHost=new Http(credentials.HOST,{headers:{"Content-Type":"application/json",Accept:"application/json"}})}function createCoinbaseApiProvider(accessToken){coinbaseApi=new Http(credentials.API+"/v2/",{headers:{"Content-Type":"application/json",Accept:"application/json","CB-VERSION":credentials.API_VERSION,Authorization:"Bearer "+accessToken}})}function getToken(oauthCode){return new Promise(function(resolve,reject){var data={grant_type:"authorization_code",code:oauthCode,client_id:credentials.CLIENT_ID,client_secret:credentials.CLIENT_SECRET,redirect_uri:credentials.REDIRECT_URI};coinbaseHost.post("oauth/token/",data).then(function(response){var data=response.data;if(!(data&&data.access_token&&data.refresh_token))return reject("Could not get the access token");saveToken(data.access_token,data.refresh_token,function(){return resolve()})}).catch(function(error){return reject("Could not get the access token: "+error.status+", "+getErrorsAsString(error.data))})})}function getTokenFromStorage(){return new Promise(function(resolve,reject){storage.getAccessToken().then(function(accessToken){createCoinbaseApiProvider(accessToken),resolve(accessToken)}).catch(function(error){reject(error)})})}function saveToken(accessToken,refreshToken,cb){storage.setAccessToken(accessToken).then(function(){return storage.setRefreshToken(refreshToken)}).then(function(){return createCoinbaseApiProvider(accessToken),cb()}).catch(function(error){return $log.error("Coinbase: saveToken "+error.status+". "+getErrorsAsString(error.data)),cb(error)})}function refreshToken(){return new Promise(function(resolve,reject){storage.getRefreshToken().then(function(refreshToken){var data={grant_type:"refresh_token",client_id:credentials.CLIENT_ID,client_secret:credentials.CLIENT_SECRET,redirect_uri:credentials.REDIRECT_URI,refresh_token:refreshToken};coinbaseHost.post("oauth/token/",data).then(function(response){var data=response.data;if(!(data&&data.access_token&&data.refresh_token))return reject("Could not get the access token");saveToken(data.access_token,data.refresh_token,function(){return resolve()})}).catch(function(error){return reject("Could not get the access token: "+error.status+", "+getErrorsAsString(error.data))})}).catch(function(error){return reject("Could not get refresh token from storage: "+error)})})}function getUrls(){return{oauthCodeUrl:credentials.HOST+"/oauth/authorize?response_type=code&client_id="+credentials.CLIENT_ID+"&redirect_uri="+credentials.REDIRECT_URI+"&state=SECURE_RANDOM&scope="+credentials.SCOPE+"&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=day",signupUrl:credentials.HOST+"/signup",supportUrl:"https://support.coinbase.com/"}}function getAvailableCurrencies(settings){var currencies=[];return settings.networks[root.getNetwork()].alternativeIsoCode,currencies.push("USD"),currencies}function doGetAccount(){return new Promise(function(resolve,reject){getAccountId(function(err,accountId){return err?reject(err):accountId?void root.getAccount(accountId).then(function(accountData){return resolve(accountData)}):resolve()})})}function getMainAccountId(){return new Promise(function(resolve,reject){root.getAccounts().then(function(accounts){for(var i=0;i<accounts.length;i++)if(accounts[i].primary&&"wallet"==accounts[i].type&&accounts[i].currency&&"BTC"==accounts[i].currency.code)return resolve(accounts[i].id);root.logout(),reject("Your primary account should be a BTC wallet. Set your BTC wallet account as primary and try again.")}).catch(function(error){return reject(error)})})}function updatePendingTransactions(obj){for(var i=1;i<arguments.length;i++)for(var prop in arguments[i]){var val=arguments[i][prop];"object"==typeof val?updatePendingTransactions(obj[prop],val):obj[prop]=val||obj[prop]}return obj}function fetchPendingTransactions(){return lodash.throttle(function(){$log.debug("Updating coinbase pending transactions...");var pendingTransactions={data:{}};root.getPendingTransactions(pendingTransactions)},2e4)}function refreshTransactions(pendingTransactions){storage.getTxs().then(function(txs){txs=txs?JSON.parse(txs):{},pendingTransactions.data=lodash.isEmpty(txs)?null:txs}).catch(function(error){$log.error(error)})}function sellPending(tx,accountId,pendingTransactions,cb){var data=tx.amount;data.payment_method=tx.payment_method||null,data.commit=!0,root.sellRequest(accountId,data).then(function(res){res.data&&!res.data.transaction?root.savePendingTransaction(tx,{status:"error",error:{errors:[{message:"Sell order: transaction not found."}]}},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions),cb(pendingTransactions)}):root.getTransaction(accountId,res.data.transaction.id).then(function(updatedTx){root.savePendingTransaction(tx,{remove:!0},function(err){root.savePendingTransaction(updatedTx.data,{},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions),cb(pendingTransactions)})})}).catch(function(error){root.savePendingTransaction(tx,{status:"error",error:err},function(err){err&&$log.error(err),refreshTransactions(pendingTransactions),cb(pendingTransactions)})})}).catch(function(error){root.savePendingTransaction(tx,{status:"error",error:err},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions),cb(pendingTransactions)})})}function sendToWallet(tx,accountId,pendingTransactions){var desc=Host.nameCase+" Wallet";getNetAmount(tx.amount.amount,function(err,amountBTC,feeBTC){if(err)return void root.savePendingTransaction(tx,{status:"error",error:{errors:[{message:err}]}},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)});var data={to:tx.toAddr,amount:amountBTC,currency:tx.amount.currency,description:desc,fee:feeBTC};root.sendTo(accountId,data).then(function(res){if(res.data&&!res.data.id)return void root.savePendingTransaction(tx,{status:"error",error:{errors:[{message:"Transactions not found in Coinbase.com"}]}},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)});root.getTransaction(accountId,res.data.id).then(function(sendTx){root.savePendingTransaction(tx,{remove:!0},function(err){err&&$log.error(err),root.savePendingTransaction(sendTx.data,{},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)})})})}).catch(function(error){root.savePendingTransaction(tx,{status:"error",error:err},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)})})})}function getNetAmount(amount,cb){feeService.getFeeRate("btc","livenet","normal",function(err,feePerKb){if(err)return cb("Could not get fee rate");var feeBTC=(.45*feePerKb/1e8).toFixed(8);return cb(null,amount-feeBTC,feeBTC)})}function getErrorsAsString(data){var errData;try{if(data&&data.errors)errData=data.errors;else{if(!data||!data.error)return"Unknown error";errData=data.error_description}if(!lodash.isArray(errData))return errData=errData&&errData.message?errData.message:errData;if(lodash.isArray(errData)){for(var errStr="",i=0;i<errData.length;i++)errStr=errStr+errData[i].message+". ";return errStr}return JSON.stringify(errData)}catch(e){$log.error(e)}}var storage,coinbaseApi,coinbaseHost,root={},isCordova=owswallet.Plugin.isCordova(),session=Session.getInstance(),credentials={},currencies=[{pair:"BTC-USD",label:"Bitcoin"},{pair:"BCH-USD",label:"Bitcoin Cash"},{pair:"ETH-USD",label:"Ether"},{pair:"LTC-USD",label:"Litecoin"}];owswallet.Plugin.onEvent("incoming-data",function(event){if(!(event.data&&event.data.indexOf("://coinbase")<0)){var oauthCode=System.getUrlParameterByName(event.data,"code");oauthCode&&oauthCode.length>0&&getToken(oauthCode).then(function(){return session.broadcastEvent("coinbase.oauth",{status:"SUCCESS"})}).catch(function(error){return session.broadcastEvent("coinbase.oauth",{status:"ERROR",message:error})})}}),owswallet.Plugin.onEvent("host.new-block",function(event){var network=lodash.get(event,"event.n.data.network");"NewBlock"==event.type&&"livenet"==network&&fetchPendingTransactions()}),root.init=function(config,oauthCode){return new Promise(function(resolve,reject){setCredentials(config),storage=new Storage(["access-token","account-id","refresh-token","txs"],root.getNetwork()),Settings.get().then(function(settings){var info={};info.availableCurrencies=getAvailableCurrencies(settings),info.urls=getUrls(),oauthCode?getToken(oauthCode).then(function(){return doGetAccount()}).then(function(accountData){return resolve({accountData:accountData,info:info})}):doGetAccount().then(function(accountData){return resolve({accountData:accountData,info:info})})}).catch(function(error){$log.error("Could not initialize API service: "+error),reject(error)})})},root.logout=function(){return new Promise(function(resolve,reject){storage.removeAccessToken().then(function(){return storage.removeRefreshToken()}).then(function(){return storage.removeAccountId()}).then(function(){return storage.removeTxs()}).then(function(){resolve()}).catch(function(error){$log.error("Could not logout: "+error),reject(error)})})},root.getStorage=function(){return storage},root.getNetwork=function(){return credentials.NETWORK},root.getAccounts=function(){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/").then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getAccounts "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getAccount=function(accountId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getAccount "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getCurrentUser=function(){return new Promise(function(resolve,reject){coinbaseApi.get("user/").then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getCurrentUser "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getBuyOrder=function(accountId,buyId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId+"/buys/"+buyId).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getBuyOrder "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getTransaction=function(accountId,transactionId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId+"/transactions/"+transactionId).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getTransaction "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getTransactions=function(accountId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId+"/transactions").then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getTransactions "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.sellPrice=function(currency){return new Promise(function(resolve,reject){coinbaseApi.get("prices/sell?currency="+currency).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: sellPrice "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.buyPrice=function(currency){return new Promise(function(resolve,reject){coinbaseApi.get("prices/buy?currency="+currency).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: buyPrice "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.spotPrice=function(){return new Promise(function(resolve,reject){var count=currencies.length,result={};lodash.forEach(currencies,function(c){coinbaseApi.get("prices/"+c.pair+"/spot").then(function(response){result[c.pair]=response.data.data,result[c.pair].label=c.label,0==--count&&resolve(result)}).catch(function(error){$log.error("Coinbase: spotPrice "+error.status+". "+getErrorsAsString(error.data)),result[c.pair]={},result[c.pair].error=error,0==--count&&resolve(result)})})})},root.historicPrice=function(currencyPair,period){return new Promise(function(resolve,reject){coinbaseApi.get("prices/"+currencyPair+"/historic?period="+period).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: historicPrice "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getPaymentMethods=function(){return new Promise(function(resolve,reject){coinbaseApi.get("payment-methods/").then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: getPaymentMethods "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.sellRequest=function(accountId,data){return new Promise(function(resolve,reject){var data={amount:data.amount,currency:data.currency,payment_method:data.payment_method||null,commit:data.commit||!1,quote:data.quote||!1};coinbaseApi.post("accounts/"+accountId+"/sells",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: sellRequest "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.buyRequest=function(accountId,data){return new Promise(function(resolve,reject){var data={amount:data.amount,currency:data.currency,payment_method:data.payment_method||null,commit:data.commit||!1,quote:data.quote||!1};coinbaseApi.post("accounts/"+accountId+"/buys",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: buyRequest "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.createAddress=function(accountId,data){return new Promise(function(resolve,reject){var data={name:data.name};coinbaseApi.post("accounts/"+accountId+"/addresses",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: buyCommit "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.sendTo=function(accountId,data){return new Promise(function(resolve,reject){var data={type:"send",to:data.to,amount:data.amount,currency:data.currency,description:data.description};coinbaseApi.post("accounts/"+accountId+"/transactions",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(error){$log.error("Coinbase: sendTo "+error.status+". "+getErrorsAsString(error.data)),reject(error.data)})})},root.getPendingTransactions=function(pendingTransactions){return new Promise(function(resolve,reject){storage.getTxs().then(function(txs){return txs=txs?JSON.parse(txs):{},pendingTransactions.data=lodash.isEmpty(txs)?null:txs,lodash.forEach(pendingTransactions.data,function(dataFromStorage,txId){"sell"==dataFromStorage.type&&"completed"==dataFromStorage.status||"buy"==dataFromStorage.type&&"completed"==dataFromStorage.status||"error"==dataFromStorage.status||"send"==dataFromStorage.type&&"completed"==dataFromStorage.status||root.getTransaction(accountId,txId,function(err,tx){if(err||lodash.isEmpty(tx)||tx.data&&tx.data.error)return void root.savePendingTransaction(dataFromStorage,{status:"error",error:tx.data&&tx.data.error?tx.data.error:err},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)});if(updatePendingTransactions(dataFromStorage,tx.data),pendingTransactions.data[txId]=dataFromStorage,"send"==tx.data.type&&"completed"==tx.data.status&&tx.data.from)root.sellPrice(dataFromStorage.sell_price_currency).then(function(s){var newSellPrice=s.data.amount;Math.abs((newSellPrice-dataFromStorage.sell_price_amount)/dataFromStorage.sell_price_amount*100)<dataFromStorage.price_sensitivity.value?sellPending(dataFromStorage,accountId,pendingTransactions,function(pendingTransactions){}):root.savePendingTransaction(dataFromStorage,{status:"error",error:{errors:[{message:"Price falls over the selected percentage"}]}},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)})}).catch(function(error){root.savePendingTransaction(dataFromStorage,{status:"error",error:error},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)})});else{if("buy"==tx.data.type&&"completed"==tx.data.status&&tx.data.buy)return void(dataFromStorage&&sendToWallet(dataFromStorage,accountId,pendingTransactions));root.savePendingTransaction(dataFromStorage,{},function(err){err&&$log.debug(err),refreshTransactions(pendingTransactions)})}})}),resolve(pendingTransactions)})})},root.savePendingTransaction=function(ctx,opts,cb){storage.getTxs().then(function(oldTxs){lodash.isString(oldTxs)&&(oldTxs=JSON.parse(oldTxs)),lodash.isString(ctx)&&(ctx=JSON.parse(ctx));var tx=oldTxs||{};return tx[ctx.id]=ctx,opts&&(opts.error||opts.status)&&(tx[ctx.id]=lodash.assign(tx[ctx.id],opts)),opts&&opts.remove&&delete tx[ctx.id],tx=JSON.stringify(tx),storage.setTxs(tx)}).catch(function(error){return cb(err)})};var getAccountId=lodash.throttle(function(cb){$log.debug("Accessing Coinbase account..."),getTokenFromStorage().then(function(accessToken){if(!accessToken)return $log.warn("No access token while trying to access account"),cb();getMainAccountId().then(function(accountId){return storage.setAccountId(accountId)}).then(function(accountId){return cb(null,accountId)}).catch(function(error){if(!error.errors||error.errors&&!lodash.isArray(error.errors))return cb("Could not get account id: "+error);for(var expiredToken,revokedToken,invalidToken,i=0;i<error.errors.length;i++)expiredToken="expired_token"==error.errors[i].id,revokedToken="revoked_token"==error.errors[i].id,invalidToken="invalid_token"==error.errors[i].id;if(!expiredToken)return revokedToken?($log.debug("Token revoked, logging out"),root.logout(),cb()):invalidToken?($log.debug("Token invalid, logging out"),root.logout(),cb()):cb("Unexpected error getting account id: "+getErrorsAsString(error));$log.debug("Refreshing access token"),refreshToken().then(function(){return getMainAccountId()}).then(function(accountId){return storage.setAccountId(accountId)}).then(function(accountId){return cb(null,accountId)}).catch(function(error){return cb("Could not refresh access token: "+error)})})}).catch(function(error){return cb("Unexpected error getting account id: "+getErrorsAsString(error))})},1e4);return root}),angular.module("owsWalletPlugin.api").service("createAddress",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required account id."}},callback(message);coinbaseService.createAddress(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:account},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getAccounts",function(coinbaseService){var root={};return root.respond=function(message,callback){message.request.params.accountId?coinbaseService.getAccounts().then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)}):coinbaseService.getAccounts().then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:404,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getAvailableCurrencies",function(coinbaseService){var root={};return root.respond=function(message,callback){coinbaseService.getAvailableCurrencies().then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getBuyPrice",function(coinbaseService){var root={};return root.respond=function(message,callback){var currency=message.request.params.currency;if(!currency)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required currency."}},callback(message);coinbaseService.buyPrice(currency).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getCurrentUser",function(coinbaseService){var root={};return root.respond=function(message,callback){coinbaseService.getCurrentUser().then(function(response){return message.response={statusCode:200,statusText:"OK",data:account},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getHistoricPrice",function(coinbaseService){var root={};return root.respond=function(message,callback){var currencyPair=message.request.params.currencyPair,period=message.request.params.period;if(!currencyPair)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required currency pair."}},callback(message);coinbaseService.historicPrice(currencyPair,period).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getPaymentMethods",function(coinbaseService){var root={};return root.respond=function(message,callback){coinbaseService.getPaymentMethods(accountId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:txs},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getPendingTransactions",function(coinbaseService){var root={};return root.respond=function(message,callback){var pendingTransactions={data:{}};coinbaseService.getPendingTransactions(pendingTransactions).then(function(pendingTransactions){return message.response={statusCode:200,statusText:"OK",data:pendingTransactions},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getSellPrice",function(coinbaseService){var root={};return root.respond=function(message,callback){var currency=message.request.params.currency;if(!currency)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required currency."}},callback(message);coinbaseService.sellPrice(currency).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getSpotPrice",function(coinbaseService){var root={};return root.respond=function(message,callback){coinbaseService.spotPrice().then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getTransactions",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,transactionId=message.request.params.transactionId;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required account id or pending."}},callback(message);transactionId?coinbaseService.getTransaction(accountId,transactionId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)}):coinbaseService.getTransactions(accountId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("getUrls",function(coinbaseService){var root={};return root.respond=function(message,callback){return message.response={statusCode:200,statusText:"OK",data:coinbaseService.getUrls()},callback(message)},root}),angular.module("owsWalletPlugin.api").service("requestBuy",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required account id."}},callback(message);coinbaseService.requestBuy(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:account},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("requestSell",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required account id."}},callback(message);coinbaseService.requestSell(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:account},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}),angular.module("owsWalletPlugin.api").service("savePendingTransaction",function(coinbaseService){var root={};return root.respond=function(message,callback){var tx=message.request.data.tx,options=message.request.data.options;if(!tx)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required transaction."}},callback(message);coinbaseService.savePendingTransaction(tx,options,function(error){return error?(message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)):(message.response={statusCode:200,statusText:"OK",data:{}},callback(message))})},root}),angular.module("owsWalletPlugin.api").service("service",function(coinbaseService){var root={};return root.respond=function(message,callback){var state=message.request.data.state,oauthCode=message.request.data.oauthCode,pluginConfig=message.request.data.config;if(!state)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required state."}},callback(message);switch(state){case"initialize":if(!pluginConfig)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required configuration."}},callback(message);coinbaseService.init(pluginConfig,oauthCode).then(function(data){return message.response={statusCode:200,statusText:"OK",data:data},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error}},callback(message)});break;case"logout":coinbaseService.logout().then(function(){return message.response={statusCode:200,statusText:"OK",data:{}},callback(message)}).catch(function(error){return message.response={statusCode:500,statusText:"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)});break;default:return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Unrecognized state."}},callback(message)}},root});