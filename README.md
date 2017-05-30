# Cachios

A simple `axios` cache wrapper using `node-cache`.

## Description

Cachios is meant to be an easy drop-in for `axios` and adds caching capabilites to the following methods:

* request
* get
* delete
* head
* options
* post
* put
* patch

The entire response is not cached, and is instead trimmed down (by default) to `status` and `data`. To configure this, see ["Custom Response Copier"](#custom-response-copier).

## Installation

`npm install --save cachios`

## Examples

Basic:

```
const cachios = require('cachios');

cachios.get('https://jsonplaceholder.typicode.com/posts/1', {
  ttl: 300 /* seconds */,
}).then(console.log);

```

Custom axios client:

```
// your normal, non-cached axios instance that is already setup.
import axios from './configured-axios';

const cachios = require('cachios');
const cachiosInstance = cachios.create(axios);

const postData = {/* your postdata here */};

cachiosInstance.post('/posts/1', postData, {
  ttl: 30, // persist 30 seconds
}).then((resp) => {
  console.log(resp.status);

  const data = resp.data;
  console.log(data.title);
  console.log(data.body);
});

```

## Configuration

### TTL

To set the cache TTL, pass it in with your request config:

```
const cachios = require('cachios');

cachios.get('url', {
  ttl: /* time to live in seconds */,
});

const postData = {};
cachios.post('url', postData, {
  headers: /* your custom headers */
  ...
  ttl: 60, // persist this result for 60 seconds
});
```

### Custom Axios Instance

Cachios also supports using a pre-configured `axios` instance:

```
const cachios = require('cachios');
const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
});

// all requests will now use this axios instance
const cachiosInstance = cachios.create(axiosInstance);
```

### Custom Cache Configuration

Internally, Cachios uses `node-cache` with sane defaults. To configure it yourself, pass it during `cachios.create`:

```
const cachios = require('cachios');
const axios = require('axios');

// configure `node-cache` to keep cache forever!
const cachiosInstance = cachios.create(axios, {
  stdTTL: 0, 
  checkperiod: 0,
});
```

### Custom Response Copier

By default, Cachios uses the following function to trim responses:

```
function defaultResponseCopier(response) {
  return {
    status: response.status,
    data: response.data,
  };
}
```

This was originally implemented because of errors during response storage.

To change what is saved, set the `getResponseCopy` property of your Cachios instance:

```
const cachios = require('cachios');

cachios.getResponseCopy = function (response) {
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
  };
};
```

### Custom Cache Identifier

By default, Cachios uses the following function to create a unique cache identifier:

```
function defaultCacheIdentifer(config) {
  return {
    method: config.method,
    url: config.url,
    params: config.params,
    data: config.data,
  };
}
```

To override this, set the `getCacheIdentifier` property of your Cachios instance:

```
const cachios = require('cachios');

cachios.getCacheIdentifier = function (config) {
  return {
    method: config.method,
    url: config.url,
    params: config.params,
    data: config.data,
    headers: config.headers,
  };
};
```

## License

[MIT](LICENSE.md)
