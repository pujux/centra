const path = require('path')
const choice = {
	http: require('http'),
	https: require('https')
}
const qs = require('querystring')
const zlib = require('zlib')
const { URL } = require('url')
const CentraResponse = require('./CentraResponse')

module.exports = class CentraRequest {
	constructor(url, method = 'GET') {
		this.url = typeof url === 'string' ? new URL(url) : url
		this.action = method
		this.data = null
		this.contentType = null
		this.reqHeaders = {}
		this.streamEnabled = false
		this.compressionEnabled = false
		this.coreOptions = {}
		return this
	}

	query(a1, a2) {
		if (typeof a1 === 'object') {
			Object.keys(a1).forEach(queryKey => {
				this.url.searchParams.append(queryKey, a1[queryKey])
			})
		} else {
			this.url.searchParams.append(a1, a2)
		}
		return this
	}

	path(relativePath) {
		this.url.pathname = path.join(this.url.pathname, relativePath)
		return this
	}

	body(data, contentType) {
		this.contentType = typeof data === 'object' && !contentType && !Buffer.isBuffer(data) ? 'json' : contentType ? contentType.toLowerCase() : 'buffer'
		this.data = this.contentType === 'form' ? qs.stringify(data) : this.contentType === 'json' ? JSON.stringify(data) : data
		return this
	}

	header(a1, a2) {
		if (typeof a1 === 'object') {
			Object.keys(a1).forEach(headerName => {
				this.reqHeaders[headerName.toLowerCase()] = a1[headerName]
			})
		} else {
			this.reqHeaders[a1.toLowerCase()] = a2
		}
		return this
	}

	method(method) {
		this.action = method
		return this
	}

	async json() {
		return (await this.send()).json
	}

	async raw() {
		return (await this.send()).body
	}

	async text() {
		return (await this.send()).text
	}

	send() {
		return new Promise((resolve, reject) => {
			if (this.data) {
				if (!this.reqHeaders.hasOwnProperty('content-type')) 
					if (this.contentType === 'json') 
						this.reqHeaders['content-type'] = 'application/json'
					else if (this.contentType === 'form') 
						this.reqHeaders['content-type'] = 'application/x-www-form-urlencoded'

				if (!this.reqHeaders.hasOwnProperty('content-length')) 
					this.reqHeaders['content-length'] = Buffer.byteLength(this.data)
			}

			const options = {
				protocol: this.url.protocol,
				host: this.url.hostname,
				port: this.url.port,
				path: this.url.pathname + this.url.search,
				method: this.action,
				headers: this.reqHeaders,
				...this.coreOptions
			}

			const resHandler = res => {
				let stream = res

				if (this.compressionEnabled) {
					if (res.headers['content-encoding'] === 'gzip') 
						stream = res.pipe(zlib.createGunzip())
					else if (res.headers['content-encoding'] === 'deflate') 
						stream = res.pipe(zlib.createInflate())
				}

				if (this.streamEnabled) {
					resolve(stream)
				} else {
					const centraRes = new CentraResponse(res)
					stream.on('error', reject)
					stream.on('data', centraRes._addChunk)
					stream.on('end', () => resolve(centraRes))
				}
			}

			let req
			if (choice[this.url.protocol.replace(/:/g, '')])
				choice[this.url.protocol.replace(/:/g, '')].request(options, resHandler)
			else 
				throw new Error(`Bad URL protocol: ${this.url.protocol}`)

			req.on('error', reject)
			this.data && req.write(this.data)
			req.end()
		})
	}
}
