import 'dotenv/config'
import { URL, fileURLToPath } from 'node:url'
import { readFileSync, statSync } from 'node:fs'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
import { fillTemplate, fillTemplateText } from './templater.js'
import https from 'https';

const clientConfig = JSON.parse(readFileSync(fileURLToPath(new URL('../resources/clients.json', import.meta.url)), 'utf-8'))
const hitRatePerPortal = {}
setHitRatePerPortal(clientConfig.variantLabels, clientConfig.via)
console.log(hitRatePerPortal)
//
// Auxiliary functions
//
function setHitRatePerPortal(labels, via, prefix = '') {
    if (labels.length === 0) {
        hitRatePerPortal[prefix.slice(1)] = 0;
        return;
    }

    const [firstLabel, ...restLabels] = labels;
    const variants = Object.keys(via[firstLabel]);

    variants.forEach(variant => {
        setHitRatePerPortal(restLabels, via, `${prefix}-${variant}`);
    });
}

function checkPath(path) {
	return !!path.match(/^[a-zA-Z0-9][a-zA-Z0-9-]+$/)
}
function genericTemplateHandler(req, res, filename, baseURL, varianted = true, mode = 'text') {
	const template = readFileSync(fileURLToPath(new URL(filename, baseURL)), 'utf-8')
	// const clientConfig = JSON.parse(readFileSync(fileURLToPath(new URL('../resources/clients.json', import.meta.url)), 'utf-8'))
	const opts = {
		role: req.auth?.client ?? 'guest',
		roles: req.auth?.clients ?? [],
	}
	if(varianted) {
		opts.variant = req.params.variant
		if(Array.isArray(clientConfig.variantLabels)) {
			opts.variants = Object.fromEntries((req.params.variant?.split('-') || []).map((it, idx) => [ clientConfig.variantLabels[idx] ?? `variant-${idx + 1}`, it ]))
			// Check that there are no more keys than variant labels
			if(Object.keys(opts.variants).length > clientConfig.variantLabels.length) {
				res.sendStatus(404)
				return
			}
			// Check if root-level key for each variant label exists
			if(!clientConfig.variantLabels.every(label => clientConfig.via?.[label]?.[opts.variants[label]])) {
				res.sendStatus(404)
				return
			}
		} else {
			// Check if root-level variant key exists
			if(!clientConfig.via?.variant?.[opts.variant]) {
				res.sendStatus(404)
				return
			}
		}
	}
	res.send({
		text: it => fillTemplateText(it, clientConfig, opts),
		json: it => fillTemplate(JSON.parse(it), clientConfig, opts),
	}[mode](template))
}

//
// Fetch Keycloak address
//
const jwksUrl = await fetch(`${process.env.KEYCLOAK_ADDRESS}/.well-known/openid-configuration`)
	.then(stream => stream.json())
	.then(({ jwks_uri }) => jwks_uri)

//
// Express basic configuration
//
const app = express()
app.set('strict routing', true)
app.use(cookieParser())
app.use((req, res, next) => {
	res.set('Access-Control-Allow-Origin', '*')
	next()
})
app.use(async (req, res, next) => {
	if(!req.cookies.token) {
		next()
		return
	}
	try {
		const decodedToken = jwt.decode(req.cookies.token, { complete: true })
		const kid = decodedToken.header.kid
		const jwks = await fetch(jwksUrl).then(stream => stream.json())
		const jwk = jwks.keys.find(jwk => jwk.kid === kid)
		const publicKey = jwkToPem(jwk)
		req.auth = jwt.verify(req.cookies.token, publicKey)
		next()
	} catch(e) {
		console.log(e)
		delete req.cookies.token
		next()
	}
})
app.use(express.static('dist'))

//
// Rewrite to portal (variant-only)
//
if (process.env.VARIANT_ONLY) {
	app.use((req, res, next) => {
		if(req.url.startsWith('/resources/')) {
			next()
			return
		}
		if(req.url.startsWith('/portal/')) {
			res.redirect(308, req.url.slice(7))
			return
		}
		req.url = `/portal${req.url}`
		next()
	})
}

//
// Redirect for landing page
//
else {
	app.get('/', (req, res) => {
		res.redirect(308, '/portal/')
	})
}

//
// Resources folder
//
app.use('/resources/', (req, res, next) => {
	req.resourcesURL = new URL('../resources/', import.meta.url)
	next()
})
app.get('/resources/services-internet.json', (req, res) => {
	genericTemplateHandler(req, res, 'services-internet.json', req.resourcesURL, false, 'json')
})
app.get('/resources/rest-services-internet.json', (req, res) => {
	genericTemplateHandler(req, res, 'rest-services-internet.json', req.resourcesURL, false, 'json')
})
app.get('/resources/style_v3.json', (req, res) => {
	genericTemplateHandler(req, res, 'style_v3.json', req.resourcesURL, false, 'json')
})

// Fallback route
app.use('/resources', express.static('resources'))

//
// Portal folder
//
app.get('/:portal', (req, res) => {
	if(!checkPath(req.params.portal)) {
		res.sendStatus(404)
		return
	}
	res.redirect(308, `/${req.params.portal}/`)
})
app.use('/:portal/', (req, res, next) => {
	if(!checkPath(req.params.portal)) {
		res.sendStatus(404)
		return
	}
	req.portalURL = new URL(`${req.params.portal}/`, new URL('../portal/', import.meta.url))
	try {
		const stats = statSync(fileURLToPath(req.portalURL))
		if(!stats.isDirectory()) throw new Error()
	} catch(e) {
		res.sendStatus(404)
		return
	}
	next()
})

// Fix paths build with ../../-relative URLs
app.use('/:portal/mastercode', (req, res) => {
	res.redirect(308, `/mastercode/${req.url}`)
})
app.get('/:portal/favicon.ico', (req, res) => {
	res.redirect(308, '/favicon.ico')
})

// Portal file handler
function indexHandler(req, res) {
	if(hitRatePerPortal.hasOwnProperty(req.params.variant)) {
		hitRatePerPortal[req.params.variant] += 1;
	}
	genericTemplateHandler(req, res, 'index.html', req.portalURL, true, 'text')
}
function configJsHandler(req, res) {
	genericTemplateHandler(req, res, 'config.js', req.portalURL, true, 'text')
}
function configJsonHandler(req, res) {
	genericTemplateHandler(req, res, 'config.json', req.portalURL, true, 'json')
}

// Variant-free portal
app.get('/:portal/', indexHandler)
app.get('/:portal/config.js', configJsHandler)
app.get('/:portal/config.json', configJsonHandler)

// Fallback route
app.use('/:portal', express.static('portal'))

// Variant-based portal
app.get('/:portal/:variant', (req, res) => {
	if(!checkPath(req.params.variant)) {
		res.sendStatus(404)
		return
	}
	res.redirect(308, `/${req.params.portal}/${req.params.variant}/`)
})
app.use('/:portal/:variant/', (req, res, next) => {
	if(!checkPath(req.params.variant)) {
		res.sendStatus(404)
		return
	}
	next()
})
app.get('/:portal/:variant/', indexHandler)
app.get('/:portal/:variant/config.js', configJsHandler)
app.get('/:portal/:variant/config.json', configJsonHandler)


if (process.env.NODE_ENV === "development") {
	app.listen(9000, () => {
		console.info("App is running at PORT: 9000")
	})
}
else {
	app.listen(80, () => {
		console.info("App is running at PORT: 80")
	})
}

//
// UNTESTED
// 
function sendRequestCountsToApi() {
    const data = JSON.stringify({
        series: Object.keys(hitRatePerPortal).map(portal => ({
            metric: 'portal.hit.rates',
            points: [[Math.floor(Date.now() / 1000), hitRatePerPortal[portal]]],
            tags: [`portal:${portal}`]
        }))
    });

	const apiUrl = new URL(process.env.API_URL);

	const options = {
        hostname: apiUrl.hostname,
		port: '443',
        path: apiUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data, 'utf8'),
            'DD-API-KEY': process.env.API_KEY
        }
    };

	const req = https.request(options, res => {
        let responseData = '';

        res.on('data', chunk => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log('Hit rates sent to API:', responseData);
            Object.keys(hitRatePerPortal).forEach(portal => {
                hitRatePerPortal[portal] = 0;
            });
        });
    });

    req.on('error', error => {
        console.error('Error sending request counts to API:', error);
    });

    req.write(data);
    req.end();
}

// setInterval(sendRequestCountsToApi, 60 * 60 * 1000);