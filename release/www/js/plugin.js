"use strict";angular.module("owsWalletPlugin",["gettext","ngLodash","owsWalletPluginClient","owsWalletPlugin.apiHandlers","owsWalletPlugin.services"]),angular.module("owsWalletPlugin.apiHandlers",[]),angular.module("owsWalletPlugin.services",[]),angular.module("owsWalletPlugin").config(["$pluginConfigProvider",function($pluginConfigProvider){$pluginConfigProvider.router.routes([{path:"/accounts/:accountId?",method:"GET",handler:"getAccounts"},{path:"/accounts/:accountId/addresses",method:"POST",handler:"createAddress"},{path:"/accounts/:accountId/buys",method:"POST",handler:"requestBuy"},{path:"/accounts/:accountId/buys/:buyId/commit",method:"POST",handler:"commitBuy"},{path:"/accounts/:accountId/sells",method:"POST",handler:"requestSell"},{path:"/accounts/:accountId/sells/:sellId/commit",method:"POST",handler:"commitSell"},{path:"/accounts/:accountId/transactions",method:"GET",handler:"getTransactions"},{path:"/accounts/:accountId/transactions",method:"POST",handler:"sendTo"},{path:"/exchange-rates/:currency?",method:"GET",handler:"getExchangeRates"},{path:"/paymentMethods/:paymentMethodId?",method:"GET",handler:"getPaymentMethods"},{path:"/prices",method:"GET",handler:"getPriceInfo"},{path:"/prices/buy/:currency",method:"GET",handler:"getBuyPrice"},{path:"/prices/historic/:currencyPair/:period",method:"GET",handler:"getHistoricPrice"},{path:"/prices/sell/:currency",method:"GET",handler:"getSellPrice"},{path:"/prices/spot",method:"GET",handler:"getSpotPrice"},{path:"/service",method:"PUT",handler:"service"},{path:"/urls",method:"GET",handler:"getUrls"},{path:"/user",method:"GET",handler:"getCurrentUser"},{path:"/wallet/:id/transactions/pending",method:"GET",handler:"getPendingTransactions"}])}]).run(function(){owswallet.Plugin.ready(function(){})}),angular.module("owsWalletPlugin").run(["gettextCatalog",function(gettextCatalog){}]),angular.module("owsWalletPlugin.services").factory("backgroundService",function(){function refreshState(){var s=!1;lodash.forEach(Object.keys(active),function(k){s=s||active[k]}),state=s,owswallet.Plugin.runInBackground(state)}var root={},active={},state=!1;return $rootScope.$on("Local/MonitorActive",function(event,active){active.monitor=active,refreshState()}),root}),angular.module("owsWalletPlugin.services").factory("coinbaseService",["$rootScope","$log","lodash","owsWalletPluginClient.api.Host","owsWalletPluginClient.api.Http","owsWalletPluginClient.api.Session","owsWalletPluginClient.api.Settings","owsWalletPluginClient.api.Storage","owsWalletPluginClient.api.Transaction",function($rootScope,$log,lodash,Host,Http,Session,Settings,Storage,Transaction){function setCredentials(config){credentials.SCOPE="wallet:accounts:read,wallet:addresses:read,wallet:addresses:create,wallet:user:read,wallet:user:email,wallet:buys:read,wallet:buys:create,wallet:sells:read,wallet:sells:create,wallet:transactions:read,wallet:transactions:send,wallet:payment-methods:read,wallet:payment-methods:limits",credentials.REDIRECT_URI=isCordova?config.redirect_uri.mobile:config.redirect_uri.desktop,credentials.HOST=config.production.host,credentials.API=config.production.api,credentials.CLIENT_ID=config.production.client_id,credentials.CLIENT_SECRET=config.production.client_secret,credentials.API_VERSION="2018-01-06",createCoinbaseHostProvider()}function createCoinbaseHostProvider(){coinbaseHost=new Http(credentials.HOST,{headers:{"Content-Type":"application/json",Accept:"application/json"}})}function createCoinbaseApiProvider(accessToken){coinbaseApi=new Http(credentials.API+"/v2/",{headers:{"Content-Type":"application/json",Accept:"application/json","CB-VERSION":credentials.API_VERSION,Authorization:"Bearer "+accessToken}},oauthRefresh)}function updateCoinbaseApiProviderAuthorization(apiProvider,accessToken){apiProvider.setHeaders({Authorization:"Bearer "+accessToken})}function oauthRefresh(httpProvider,response){return new Promise(function(resolve,reject){var error=response.data;if(!error.errors||error.errors&&!lodash.isArray(error.errors))return reject(response);var oauthError=lodash.intersectionWith(oauthErrors,error.errors,function(val1,val2){return val1.coinbaseId==val2.id});if(!(oauthError.length>0))return reject(response);switch(oauthError=oauthError[0],oauthError.coinbaseId){case"expired_token":$log.info(oauthError.message+": refreshing access token"),refreshToken().then(function(newAccessToken){return updateCoinbaseApiProviderAuthorization(httpProvider,newAccessToken),resolve()}).catch(function(error){return $log.warn("Failed to refresh token, logging out"),root.logout(oauthError.statusText),reject({data:{errors:[{id:oauthError.coinbaseId,message:oauthError.message+": "+error,statusCode:oauthError.statusCode,statusText:oauthError.statusText}]}})});break;case"revoked_token":case"invalid_token":case"invalid_grant":return $log.warn(oauthError.message+": logging out"),root.logout(oauthError.statusText),reject({data:{errors:[{id:oauthError.coinbaseId,message:oauthError.message,statusCode:oauthError.statusCode,statusText:oauthError.statusText}]}});default:return reject(response)}})}function getToken(oauthCode){return new Promise(function(resolve,reject){var data={grant_type:"authorization_code",code:oauthCode,client_id:credentials.CLIENT_ID,client_secret:credentials.CLIENT_SECRET,redirect_uri:credentials.REDIRECT_URI};coinbaseHost.post("oauth/token/",data).then(function(response){var data=response.data;if(!(data&&data.access_token&&data.refresh_token))return reject(getError("No access token in response","getToken"));saveToken(data.access_token,data.refresh_token,function(error,accessToken){return error?reject(getError("Could not save the access token","getToken")):(createCoinbaseApiProvider(accessToken),resolve(accessToken))})}).catch(function(response){reject(getError(response,"getToken"))})})}function getTokenFromStorage(){return new Promise(function(resolve,reject){storage.getAccessToken().then(function(accessToken){resolve(accessToken)}).catch(function(error){reject(getError(response,"getTokenFromStorage"))})})}function saveToken(accessToken,refreshToken,cb){storage.setAccessToken(accessToken).then(function(){return storage.setRefreshToken(refreshToken)}).then(function(){return cb(null,accessToken)}).catch(function(error){return $log.error("Coinbase: saveToken "+error),cb(error)})}function refreshToken(){return new Promise(function(resolve,reject){storage.getRefreshToken().then(function(refreshToken){var data={grant_type:"refresh_token",client_id:credentials.CLIENT_ID,client_secret:credentials.CLIENT_SECRET,redirect_uri:credentials.REDIRECT_URI,refresh_token:refreshToken};coinbaseHost.post("oauth/token/",data).then(function(response){var data=response.data;if(!(data&&data.access_token&&data.refresh_token))return reject(getError("Could not get the access token","refreshToken"));saveToken(data.access_token,data.refresh_token,function(error,accessToken){return error?reject(getError("Could not save the access token","refreshToken")):($log.info("Successfully refreshed token from Coinbase"),resolve(accessToken))})}).catch(function(response){return reject(getError(response,"refreshToken"))})}).catch(function(error){return reject(getError("Could not get refresh token from storage: "+error),"refreshToken")})})}function getUrls(){return{oauthCodeUrl:credentials.HOST+"/oauth/authorize?response_type=code&account=all&client_id="+credentials.CLIENT_ID+"&redirect_uri="+credentials.REDIRECT_URI+"&state=SECURE_RANDOM&scope="+credentials.SCOPE+"&meta[send_limit_amount]=1&meta[send_limit_currency]=USD&meta[send_limit_period]=day",signupUrl:"https://www.coinbase.com/signup",supportUrl:"https://support.coinbase.com",privacyUrl:"https://www.coinbase.com/legal/user_agreement"}}function getError(response,callerId){if(response.message)return{id:"unexpected_error",message:response.message};$log.error("Coinbase: "+callerId+" - "+getErrorsAsString(response.data));var error;return response.status&&response.status<=0?error={id:"network_error",message:"Network error"}:response.data.error?error={id:response.data.error,message:response.data.error_description}:response.data.errors&&lodash.isArray(response.data.errors)?error=response.data.errors[0]:response.data?error=response.data:("object"==typeof response&&(response=JSON.stringify(response)),error={id:"unexpected_error",message:response.toString()}),error}function getErrorsAsString(data){var errData;try{if(data&&data.errors)errData=data.errors;else{if(!data||!data.error)return"Unknown error";errData=data.error_description}if(lodash.isArray(errData)){for(var errStr="",i=0;i<errData.length;i++)errStr=errStr+errData[i].message+". ";errData=errStr}else errData=errData&&errData.message?errData.message:errData;return errData}catch(e){$log.error(e)}}var storage,coinbaseApi,coinbaseHost,root={},isCordova=owswallet.Plugin.isCordova(),session=Session.getInstance(),credentials={},currencies=[{pair:"BTC-USD",label:"Bitcoin"},{pair:"BCH-USD",label:"Bitcoin Cash"},{pair:"ETH-USD",label:"Ether"},{pair:"LTC-USD",label:"Litecoin"}],oauthErrors=[{coinbaseId:"expired_token",message:"Token expired",statusCode:401,statusText:"UNAUTHORIZED_EXPIRED"},{coinbaseId:"revoked_token",message:"Token revoked",statusCode:401,statusText:"UNAUTHORIZED_REVOKED"},{coinbaseId:"invalid_token",message:"Token invalid",statusCode:401,statusText:"UNAUTHORIZED_INVALID"},{coinbaseId:"invalid_grant",message:"Authorization grant is invalid",statusCode:401,statusText:"UNAUTHORIZED_GRANT"}];return root.init=function(clientId,config,oauthCode){return new Promise(function(resolve,reject){if(!config){var error="Could not initialize API service: no plugin configuration provided";$log.error(error),reject(error)}setCredentials(config),storage=new Storage(["access-token","refresh-token","txs"],clientId);var info={};info.urls=getUrls(),oauthCode?getToken(oauthCode).then(function(accessToken){return createCoinbaseApiProvider(accessToken),resolve({info:info,authenticated:!!accessToken})}).catch(function(error){var oauthError=lodash.intersectionWith(oauthErrors,[error],function(val1,val2){return val1.coinbaseId==val2.id});return oauthError.length>0?(oauthError=oauthError[0],reject({id:oauthError.coinbaseId,message:oauthError.message,statusCode:oauthError.statusCode,statusText:oauthError.statusText})):reject(error)}):getTokenFromStorage().then(function(accessToken){return createCoinbaseApiProvider(accessToken),resolve({info:info,authenticated:!!accessToken})})})},root.logout=function(reason){return new Promise(function(resolve,reject){storage.removeAccessToken().then(function(){return storage.removeRefreshToken()}).then(function(){return storage.removeTxs()}).then(function(){$log.info("Logged out of Coinbase."),session.broadcastEvent({name:"coinbase.logout",data:{reason:reason||"USER_REQUESTED"}}),resolve()}).catch(function(error){$log.error("Could not logout: "+error),reject(error)})})},root.getExchangeRates=function(currency){return new Promise(function(resolve,reject){coinbaseApi.get("exchange-rates?currency="+currency).then(function(response){var data=response.data.data.rates;resolve(data)}).catch(function(response){reject(getError(response,"getExchangeRates"))})})},root.getAccounts=function(accountId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+(accountId||"")).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getAccounts"))})})},root.getCurrentUser=function(){return new Promise(function(resolve,reject){coinbaseApi.get("user/").then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getCurrentUser"))})})},root.getUserAuth=function(){return new Promise(function(resolve,reject){coinbaseApi.get("user/auth").then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getUserAuth"))})})},root.getBuyOrder=function(accountId,buyId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId+"/buys/"+buyId).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getBuyOrder"))})})},root.getTransactions=function(accountId,transactionId){return new Promise(function(resolve,reject){coinbaseApi.get("accounts/"+accountId+"/transactions/"+transactionId).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getTransactions"))})})},root.sellPrice=function(currency){return new Promise(function(resolve,reject){coinbaseApi.get("prices/sell?currency="+currency).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"sellPrice"))})})},root.buyPrice=function(currency){return new Promise(function(resolve,reject){coinbaseApi.get("prices/buy?currency="+currency).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"buyPrice"))})})},root.spotPrice=function(){return new Promise(function(resolve,reject){var count=currencies.length,result={};lodash.forEach(currencies,function(c){coinbaseApi.get("prices/"+c.pair+"/spot").then(function(response){result[c.pair]=response.data.data,result[c.pair].label=c.label,0==--count&&resolve(result)}).catch(function(response){getError(response,"spotPrice"),result[c.pair]={},result[c.pair].error=error.message,0==--count&&resolve(result)})})})},root.historicPrice=function(currencyPair,period){return new Promise(function(resolve,reject){coinbaseApi.get("prices/"+currencyPair+"/historic?period="+period).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"historicPrice"))})})},root.getPaymentMethods=function(paymentMethodId){return new Promise(function(resolve,reject){coinbaseApi.get("payment-methods/"+(paymentMethodId||"")).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getPaymentMethods"))})})},root.createAddress=function(accountId,addressData){return new Promise(function(resolve,reject){var data={name:addressData.name};coinbaseApi.post("accounts/"+accountId+"/addresses",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"createAddress"))})})},root.getTime=function(){return new Promise(function(resolve,reject){coinbaseApi.get("time/").then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"getTime"))})})},root.sellRequest=function(accountId,requestData){return new Promise(function(resolve,reject){requestData.walletId&&(requestData.commit=!1,requestData.quote=!1);var data={amount:requestData.amount,currency:requestData.currency,payment_method:requestData.paymentMethodId||null,commit:requestData.commit||!1,quote:requestData.quote||!1};coinbaseApi.post("accounts/"+accountId+"/sells",data).then(function(response){var data=response.data.data;data.walletId=requestData.walletId,resolve(data)}).catch(function(response){reject(getError(response,"sellRequest"))})})},root.sellCommit=function(accountId,sellId){return new Promise(function(resolve,reject){coinbaseApi.post("accounts/"+accountId+"/sells/"+sellId+"/commit").then(function(response){var data=response.data;resolve(data)}).catch(function(response){reject(getError(response,"sellCommit"))})})},root.sellCommitFromWallet=function(accountId,walletId,amount,monitorData){return new Promise(function(resolve,reject){root.createAddress(accountId,{name:"Funds to sell from wallet"}).then(function(address){return new Transaction({walletId:walletId,urlOrAddress:address,amount:amount}).send()}).then(function(tx){monitorService.addMonitor({accountId:accountId,walletId:walletId,txHash:tx.id,priceStopLimitAmount:monitorData.priceStopLimitAmount,pluginId:monitorData.pluginId,action:"sell"})}).catch(function(){reject(getError(error,"sellCommit"))})})},root.buyRequest=function(accountId,requestData){return new Promise(function(resolve,reject){var data={amount:requestData.amount,currency:requestData.currency,paymentMethodId:requestData.paymentMethodId||null,commit:requestData.commit||!1,quote:requestData.quote||!1};coinbaseApi.post("accounts/"+accountId+"/buys",data).then(function(response){var data=response.data.data;data.walletId=requestData.walletId,resolve(data)}).catch(function(response){reject(getError(response,"buyRequest"))})})},root.buyCommit=function(accountId,buyId){return new Promise(function(resolve,reject){coinbaseApi.post("accounts/"+accountId+"/buys/"+buyId+"/commit").then(function(response){var data=response.data;resolve(data)}).catch(function(response){reject(getError(response,"buyCommit"))})})},root.buyCommitFromWallet=function(accountId,walletId,buyId,monitorData){return new Promise(function(resolve,reject){coinbaseApi.post("accounts/"+accountId+"/buys/"+buyId+"/commit").then(function(response){var data=response.data;monitorService.addMonitor({accountId:accountId,walletId:walletId,txId:data.id,priceStopLimitAmount:monitorData.priceStopLimitAmount,pluginId:monitorData.pluginId,action:"buy"}),resolve(data)}).catch(function(response){reject(getError(response,"buyCommit"))})})},root.sendTo=function(accountId,sendData){return new Promise(function(resolve,reject){var data={type:"send",to:sendData.to,amount:sendData.amount,currency:sendData.currency,description:sendData.description};coinbaseApi.post("accounts/"+accountId+"/transactions",data).then(function(response){var data=response.data.data;resolve(data)}).catch(function(response){reject(getError(response,"sendTo"))})})},root.sendToWallet=function(accountId,walletId,note){var wallet,address;return session.getWalletById(walletId).then(function(w){return wallet=w,wallet.getAddress()}).then(function(a){return address=a,wallet.getFeeRate()}).then(function(feePerKb){var fee=.45*feePerKb.standard,netAmount=amount-fee;return coinbaseService.sendTo(accountId,{to:address,amount:netAmount,currency:wallet.currency,description:note})}).then(function(tx){return tx}).catch(function(error){throw error})},root}]),angular.module("owsWalletPlugin.services").factory("monitorDataService",["lodash","coinbaseService","monitorService","owsWalletPluginClient.api.Session",function(lodash,coinbaseService,monitorService,Session){function formatAsCoinbaseTx(wallet,walletTx){return{id:walletTx.txid,type:"exchange_deposit",status:"pending",amount:{amount:walletTx.outputs.amountStr.split(" ")[0],currency:walletTx.outputs.amountStr.split(" ")[1]},native_amount:{amount:walletTx.outputs.alternativeAmountStr.split(" ")[0],currency:walletTx.outputs.alternativeAmountStr.split(" ")[1]},description:null,created_at:new Date(1e3*tx.createdOn).toISOString(),updated_at:new Date(1e3*tx.createdOn).toISOString(),resource:void 0,resource_path:void 0,instant_exchange:void 0,details:{title:"Transferred to Coinbase",subtitle:"From "+wallet.name}}}var root={},session=Session.getInstance();return root.getPendingTransactions=function(walletId){return new Promise(function(resolve,reject){var txs=[],allMtxs=monitorService.getMonitors(),mtxs=lodash.filter(allMtxs,function(mtx){return mtx.walletId=walletId});lodash.forEach(mtxs,function(mtx){if(mtx.txId)coinbaseService.getTransactions(mtx.accountId,mtx.txId).then(function(tx){txs.push(tx)}).catch(function(error){reject(error)});else if(mtx.txHash){var wallet;session.getWalletById(mtx.walletId).then(function(w){return wallet=w,wallet.getTransactions(mtx.txHash)}).then(function(walletTx){txs.push(formatAsCoinbaseTx(wallet,walletTx))}).catch(function(error){reject(error)})}}),resolve(lodash.orderBy(txs,function(tx){return tx.created_at},["desc"]))})},root}]),angular.module("owsWalletPlugin.services").factory("monitorService",["$rootScope","$log","lodash","coinbaseService","owsWalletPluginClient.api.Session","owsWalletPluginClient.api.Storage",function($rootScope,$log,lodash,coinbaseService,Session,Storage){function monitorNow(){var mtxs=storage.getMonitor();mtxs.length>0&&(lodash.forEach(mtxs,function(mtx){monitor(mtx)}),$rootScope.$emit("Local/MonitorActive",!0))}function monitor(mtx){mtx.txId?coinbaseService.getTransactions(mtx.accountId,mtx.txId).then(function(tx){if("completed"==tx.status)switch(tx.type){case"buy":if(1==mtx.stage){var note=tx.title+" "+tx.subtitle;coinbaseService.sendToWallet(mtx.accountId,mtx.walletId,note).then(function(tx){if(mtx.log.push({txId:mtx.txId,status:"complete",stage:mtx.stage,timestamp:timestamp()}),delete mtx.txId,mtx.txHash=tx.network.hash,!mtx.txHash)throw{message:"No network transaction hash after send to wallet from Coinbase account"};root.startMonitor(mtx)}).catch(function(error){stopMonitor(mtx,"complete",{id:"SEND_TO_WALLET_FAILED",message:error.message})})}else 2==mtx.stage&&(mtx.log.push({txId:mtx.txId,status:"complete",stage:mtx.stage,timestamp:timestamp()}),delete mtx.txId,stopMonitor(mtx,"complete"));break;case"sell":mtx.log.push({txId:mtx.txId,status:"complete",stage:mtx.stage,date:timestamp()}),delete mtx.txId,stopMonitor(mtx,"complete")}else"failed"!=tx.status&&"expired"!=tx.status&&"canceled"!=tx.status||(mtx.log.push({txId:mtx.txId,status:statusMap[tx.status],stage:mtx.stage,timestamp:timestamp()}),delete mtx.txId,stopMonitor(mtx,status))}).catch(function(error){$log.error("Failed to get pending transaction from Coinbase: "+error.message)}):mtx.txHash&&coinbaseService.getTransactions(mtx.accountId).then(function(coinbaseTxs){var cbTx=lodash.find(coinbaseTxs,function(cbTx){return void 0!=lodash.get(cbTx,"cbTx.network.hash")});cbTx&&"completed"==cbTx.status?coinbaseService.sellRequest(mtx.accountId,{amount:cbTx.amount.amount,currency:cbTx.amount.currency,paymentMethodId:""}).then(function(sellRequest){if(parseFloat(sellRequest.total.amount)>=mtx.priceStopLimitAmount)return coinbaseService.sell(cbTx.accountId,cbTx.sellId)}).then(function(sellTx){mtx.log.push({txHash:mtx.txHash,status:"complete",stage:mtx.stage,timestamp:timestamp()}),delete mtx.txHash,mtx.txId=sellTx.id,root.startMonitor(mtx)}).catch(function(error){stopMonitor(mtx,"complete",{id:"SELL_COMMIT_FAILED",message:error.message})}):!cbTx||"failed"!=cbTx.status&&"expired"!=cbTx.status&&"canceled"!=cbTx.status||(mtx.log.push({txId:mtx.txHash,status:statusMap[cbTx.status],stage:mtx.stage,timestamp:timestamp()}),delete mtx.txHash,stopMonitor(mtx,cbTx.status))})}function stopMonitor(mtx,status,error){mtx.status=status,mtx.error=error;var mtxs=storage.getMonitor();lodash.remove(mtxs,function(storedMtx){return storedMtx.created==mtx.created}),mtxs.push(mtx),storage.setMonitor(mtxs)}function timestamp(){return new Date/1e3}var root={},session=Session.getInstance(),storage=new Storage(["monitor"],session.plugin.header.id),statusMap={failed:"failed",expired:"expired",canceled:"canceled",completed:"complete"};return function(){monitorNow(),owswallet.Plugin.onEvent("host.new-block",monitorNow)}(),root.addMonitor=function(monitor){var mtxs=storage.getMonitor();monitor.created?(monitor.stage+=monitor.stage,monitor.updated=timestamp()):(monitor.status="pending",monitor.stage=1,monitor.created=timestamp(),monitor.log=[],mtxs.push(monitor)),storage.setMonitor(mtxs),$rootScope.$emit("Local/MonitorActive",!0),monitorNow()},root.getMonitors=function(){return storage.getMonitor()},root}]),angular.module("owsWalletPlugin.apiHandlers").service("commitBuy",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,buyId=message.request.params.buyId,walletId=message.request.data.walletId,priceStopLimitAmount=message.request.data.priceStopLimitAmount;if(!accountId||!buyId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId and buyId."}},callback(message);if(walletId){var monitorData={pluginId:message.header.clientId,priceStopLimitAmount:priceStopLimitAmount};coinbaseService.buyCommitFromWallet(accountId,walletId,buyId,monitorData).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})}else coinbaseService.buyCommit(accountId,buyId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("commitSell",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,sellId=message.request.params.sellId,walletId=message.request.data.walletId,amount=message.request.data.amount,priceStopLimitAmount=message.request.data.priceStopLimitAmount;if(!accountId||!sellId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId and sellId."}},callback(message);if(walletId){var monitorData={pluginId:message.header.clientId,priceStopLimitAmount:priceStopLimitAmount};coinbaseService.sellCommitFromWallet(accountId,walletId,amount,monitorData).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})}else sellId&&coinbaseService.sellCommit(accountId,sellId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("createAddress",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId."}},callback(message);coinbaseService.createAddress(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getAccounts",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId;coinbaseService.getAccounts(accountId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getBuyPrice",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var currency=message.request.params.currency;if(!currency)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide currency."}},callback(message);coinbaseService.buyPrice(currency).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getCurrentUser",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var data={user:{},auth:{}};coinbaseService.getCurrentUser().then(function(response){data.user=response,coinbaseService.getUserAuth().then(function(response){return data.auth=response,message.response={statusCode:200,statusText:"OK",data:data},callback(message)})}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getExchangeRates",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var currency=message.request.params.currency;coinbaseService.getExchangeRates(currency).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getHistoricPrice",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var currencyPair=message.request.params.currencyPair,period=message.request.params.period;if(!currencyPair)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide currencyPair."}},callback(message);coinbaseService.historicPrice(currencyPair,period).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getPaymentMethods",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var paymentMethodId=message.request.params.paymentMethodId;coinbaseService.getPaymentMethods(paymentMethodId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getPendingTransactions",["monitorDataService",function(monitorDataService){var root={};return root.respond=function(message,callback){var walletId=message.request.params.walletId;monitorDataService.getPendingTransactions(walletId).then(function(pendingTransactions){return message.response={statusCode:200,statusText:"OK",data:pendingTransactions},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getSellPrice",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var currency=message.request.params.currency;if(!currency)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide currency."}},callback(message);coinbaseService.sellPrice(currency).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,
statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getSpotPrice",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){coinbaseService.spotPrice().then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getTransactions",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,transactionId=message.request.params.transactionId;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId."}},callback(message);coinbaseService.getTransactions(accountId,transactionId).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("getUrls",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){return message.response={statusCode:200,statusText:"OK",data:coinbaseService.getUrls()},callback(message)},root}]),angular.module("owsWalletPlugin.apiHandlers").service("requestBuy",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId."}},callback(message);coinbaseService.buyRequest(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("requestSell",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data;if(!accountId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId."}},callback(message);coinbaseService.sellRequest(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("savePendingTransaction",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var tx=message.request.data.tx,options=message.request.data.options;if(!tx)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide tx."}},callback(message);coinbaseService.savePendingTransaction(tx,options,function(error){return error?(message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)):(message.response={statusCode:200,statusText:"OK",data:{}},callback(message))})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("sendTo",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var accountId=message.request.params.accountId,data=message.request.data;if(!(accountId&&data.to&&data.amount&&data.currency))return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide accountId, to, amount, currency."}},callback(message);coinbaseService.sendTo(accountId,data).then(function(response){return message.response={statusCode:200,statusText:"OK",data:response},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)})},root}]),angular.module("owsWalletPlugin.apiHandlers").service("service",["coinbaseService",function(coinbaseService){var root={};return root.respond=function(message,callback){var clientId=message.header.clientId,state=message.request.data.state,oauthCode=message.request.data.oauthCode,pluginConfig=message.request.data.config;if(!state||!clientId)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required data, must provide state."}},callback(message);switch(state){case"initialize":if(!pluginConfig)return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Missing required configuration."}},callback(message);coinbaseService.init(clientId,pluginConfig,oauthCode).then(function(data){return message.response={statusCode:200,statusText:"OK",data:data},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)});break;case"logout":coinbaseService.logout().then(function(){return message.response={statusCode:200,statusText:"OK",data:{}},callback(message)}).catch(function(error){return message.response={statusCode:error.statusCode||500,statusText:error.statusText||"UNEXPECTED_ERROR",data:{message:error.message}},callback(message)});break;default:return message.response={statusCode:500,statusText:"REQUEST_NOT_VALID",data:{message:"Unrecognized state."}},callback(message)}},root}]);