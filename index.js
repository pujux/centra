const CentraRequest = require('./lib/CentraRequest')

module.exports = {
	fetch: (url, method) => new CentraRequest(url, method),
	get: (url) => new CentraRequest(url),
	post: (url, data, contentType = 'json') => new CentraRequest(url, 'POST').body(data, contentType),
	put: (url, data, contentType = 'json') => new CentraRequest(url, 'PUT').body(data, contentType),
	delete: (url, data, contentType = 'json') => new CentraRequest(url, 'DELETE').body(data, contentType)
}
