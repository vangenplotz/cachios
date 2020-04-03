var hash = require('object-hash');
var NodeCache = require('node-cache');
var extendPrototype = require('./extendPrototype');

function defaultCacheIdentifer(config) {
  return {
    method: config.method,
    url: config.url,
    params: config.params,
    data: config.data,
  };
}

function defaultResponseCopier(response) {
  return {
    status: response.status,
    data: response.data,
  };
}

function Cachios(axiosInstance, nodeCacheConf) {
  this.axiosInstance = axiosInstance;
  this.cache = new NodeCache(nodeCacheConf || {
    stdTTL: 30,
    checkperiod: 120,
  });
  // requests that have been fired but have not yet been completed
  this.stagingPromises = {};

  this.getCacheIdentifier = defaultCacheIdentifer;
  this.getResponseCopy = defaultResponseCopier;
}

Cachios.prototype.getCacheKey = function (config) {
  let configClone = JSON.parse(JSON.stringify(config))

  // If request is file upload use a random key instead
  if( config.data instanceof FormData ) {
    
    // Object.entries() polyfill
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries#Polyfill
    if (!Object.entries) {
      Object.entries = function( obj ){
        var ownProps = Object.keys( obj ),
          i = ownProps.length,
          resArray = new Array(i); // preallocate the Array
        while (i--)
          resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
      };
    }


    var res = Array.from(config.data.entries(), function([key, prop]) {
        [key]: {
          "ContentLength":
          typeof prop === "string"
          ? prop.length
          : prop.size
        }
      })

    // Basically the length of the file, but close enought to a unique key?
    configClone.data = JSON.stringify(res)
  }

  return hash(this.getCacheIdentifier(configClone));
};

Cachios.prototype.getCachedValue = function (cacheKey) {
  return this.cache.get(cacheKey);
};

Cachios.prototype.setCachedValue = function (cacheKey, value, ttl) {
  return this.cache.set(cacheKey, value, ttl);
};

Cachios.prototype.request = function request(config) {
  var ttl = config.ttl;
  var cacheKey = this.getCacheKey(config);
  var cachedValue = this.getCachedValue(cacheKey);

  // if we find a cached value, return it immediately
  if (cachedValue !== undefined) {
    return Promise.resolve(cachedValue);
  }

  // if we find a staging promise (a request that has not yet completed, so it is not yet in cache),
  // return it.
  if (this.stagingPromises[cacheKey]) {
    return this.stagingPromises[cacheKey];
  }

  // otherwise, send a real request and cache the value for later
  var me = this;
  var pendingPromise = this.axiosInstance.request(config);

  // store the promise in stagingPromises so it can be used before completing
  // we don't store it in the cache immediately because:
  // - we don't want it in the cache if the request fails
  // - our cache backend may not support promises
  this.stagingPromises[cacheKey] = pendingPromise;

  // once the request successfully copmletes, store it in cache
  pendingPromise.then(function (resp) {
    me.setCachedValue(cacheKey, me.getResponseCopy(resp), ttl);
  });

  // always delete the staging promise once the request is complete
  // (finished or failed)
  pendingPromise.catch(function () {}).then(function () {
    delete me.stagingPromises[cacheKey];
  });

  // return the original promise
  return pendingPromise;
};

extendPrototype(Cachios.prototype);

module.exports = Cachios;
