'use strict'; // http://www.w3schools.com/js/js_strict.asp

// web framework
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

// Perform an HTTP request with the global fetch API. Parses a JSON body when
// possible and, on a non-2xx response, throws an Error carrying `.statusCode`
// and the response body as its message (mirroring the behaviour the callers
// previously relied on from request-promise).
async function httpRequest(url, init) {
    const response = await fetch(url, init);

    const text = await response.text();
    let parsed = text;
    if (text) {
        try { parsed = JSON.parse(text); } catch (e) { /* keep raw text */ }
    }

    if (!response.ok) {
        const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        const err = new Error(message || `HTTP ${response.status}`);
        err.statusCode = response.status;
        err.error = parsed;
        throw err;
    }

    return parsed;
}

async function daRequest(req, path, method, headers, body) {
    headers = headers || {};
    if (!headers['Authorization']) {
        headers['Authorization'] = 'Bearer ' + req.session.access_token;
        headers['content-type'] = 'application/json';
    }

    let baseUrl = 'https://developer.api.autodesk.com/da/us-east/v3/' + path;
    let url = baseUrl;

    let init = {
        method: method,
        headers: headers
    };

    if (body) {
        init.body = JSON.stringify(body);
        if (!headers['content-type'] && !headers['Content-Type']) {
            headers['content-type'] = 'application/json';
        }
    }

    let data = [];
    while (true) {
        let response;
        try {
          response = await httpRequest(url, init);
        } catch (ex) {
          console.log(ex.message);
          throw ex;
        }

        if (response && response.paginationToken) {
            url = baseUrl + "?page=" + response.paginationToken;
            data = [...data, ...response.data];
        } else {
            if (data.length > 0) {
                response.data = [...response.data, ...data];
            }

            return response;
        }
    }
}

/////////////////////////////////////////////////////////////////
// Items (AppBundles and Activities)
/////////////////////////////////////////////////////////////////

function getNameParts(name) {
    var parts1 = name.split('.');
    var parts2 = parts1[1].split('+');

    return [parts1[0], parts2[0], parts2[1]];
}

function getFullName(nickName, name, alias) {
    return `${nickName}.${name}+${alias}`;
}

async function getItems(req, type, isPersonal) {
    let response = await daRequest(req, type, 'GET');
    let nickname = await daRequest(req, 'forgeapps/me', 'GET');
    // The response body structure depends on  whether we set a nickname or not
    nickname = nickname.nickname ? nickname.nickname : nickname;
    let items = [];

    response.data.forEach((item, index) => {
        if (!item.startsWith(nickname) ^ isPersonal) {
            // Show only personal items
            let nameParts = getNameParts(item);
            if (!includesItem(items, nameParts[1])) {
                items.push({
                    id: nameParts[1],
                    nickName: nameParts[0],
                    alias: nameParts[2],
                    children: isPersonal
                });
            }
        }
    })

    return items;
}

async function getItem(req, type, id) {
    let response = await daRequest(req, `${type}/${id}`, 'GET');

    return response;
}

async function uploadFile(inputUrl, uploadParameters) {
    // Download the bundle from its (OSS) URL
    const downloadResponse = await fetch(inputUrl);
    if (!downloadResponse.ok) {
        const err = new Error(`Failed to download bundle (HTTP ${downloadResponse.status})`);
        err.statusCode = downloadResponse.status;
        throw err;
    }
    const fileBlob = await downloadResponse.blob();

    // Re-upload it to the signed S3 form-data endpoint. The form fields must
    // come before the file part, and the Content-Type (with multipart
    // boundary) is set automatically by fetch when the body is a FormData.
    const form = new FormData();
    for (const [key, value] of Object.entries(uploadParameters.formData)) {
        form.append(key, value);
    }
    form.append('file', fileBlob);

    const uploadResponse = await fetch(uploadParameters.endpointURL, {
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache' },
        body: form
    });
    if (!uploadResponse.ok) {
        const err = new Error(`Failed to upload bundle (HTTP ${uploadResponse.status})`);
        err.statusCode = uploadResponse.status;
        throw err;
    }
}

async function createItem(req, type, body) {
    let response = await daRequest(req, `${type}`, 'POST', null, body);

    // Upload the file from OSS
    if (response.uploadParameters) {
        try {
            await uploadFile(body.bundle, response.uploadParameters)
        } catch { }
    }

    return response;
}

async function deleteItem(req, type, id) {
    let response = await daRequest(req, `${type}/${id}`, 'DELETE');

    return { response: 'done' };
}

function includesItem(list, id) {
    return list.find(item => {
        if (item.id === id) {
            return true;
        }
    });
}

function setItemVersionsChildren(versions, aliases) {
    aliases.forEach(alias => {
        versions.find(version => {
            if (version.id === alias.version) {
                version.children = true;
                return true;
            }
        });
    })
}

async function getItemVersions(req, type, id) {
    let versions = [];
    let page = '';

    while (true) {
        let response = await daRequest(req, `${type}/${id}/versions${page}`, 'GET');
        response.data.map((item) => {
            versions.push({ id: item, children: false });
        })

        if (!response.paginationToken)
            break;

        page = `?page=${response.paginationToken}`;
    }

    return versions;
}

async function createItemVersion(req, type, id, body) {
    let response = await daRequest(req, `${type}/${id}/versions`, 'POST', null, body);

    // Upload the file from OSS
    if (response.uploadParameters) {
        try {
            await uploadFile(body.bundle, response.uploadParameters)
        } catch { }
    }

    return response;
}

async function deleteItemVersion(req, type, id, version) {
    let response = await daRequest(req, `${type}/${id}/versions/${version}`, 'DELETE');

    return { response: 'done' };
}

async function getItemAliases(req, type, id) {
    let aliases = [];

    while (true) {
        let response = await daRequest(req, `${type}/${id}/aliases`, 'GET');

        aliases = aliases.concat(response.data);

        if (!response.paginationToken)
            break;
    }

    return aliases;
}

function getAliasesForVersion(aliases, version) {
    let versionAliases = [];

    aliases.forEach((item, index) => {
        if (item.version === version) {
            versionAliases.push(item);
        }
    })

    return versionAliases;
}

async function createItemAlias(req, type, id, version, alias, receiver) {
    let data = {
      "version": parseInt(version), // has to be numeric
      "id": alias
    };
    if (receiver && receiver != "")
      data.receiver = receiver;

    let response = await daRequest(req, `${type}/${id}/aliases`, 'POST', null, data);

    return response; 
}

async function deleteItemAlias(req, type, id, alias) {
    let response = await daRequest(req, `${type}/${id}/aliases/${alias}`, 'DELETE');

    return { response: 'done' };
}

router.get('/:type/treeNode', async function(req, res) {
    console.log('GET /:type/treeNode');
    try {
        var id = decodeURIComponent(req.query.id);
        var type = req.params.type;
        console.log(`GET /:type/treeNode, :type = ${type}, id = ${id}`);

        var folders = [
            { id: 'Personal', children: true },
            { id: 'Shared', children: true }
        ];
        var paths = id.split('/');
        var level = paths.length;

        // Levels are:
        // Root >> Personal/Shared >> Items >> Versions >> Aliases
        // Root >> Personal/Shared >> Activities >> Versions >> Aliases
        // e.g. "Personal/ChangeParams/98/prod"

        if (id === '#') {
            // # stands for ROOT
            res.json(makeTree(folders, 'folder', '', true));
        } else if (level === 1) {
            var items = await getItems(req, type, id === 'Personal');
            res.json(makeTree(items, 'item', `${id}/`));
        } else if (level === 2) {
            var appName = paths[1];
            var versions = await getItemVersions(req, type, appName);
            var aliases = await getItemAliases(req, type, appName);
            setItemVersionsChildren(versions, aliases);
            res.json(makeTree(versions, 'version', `${id}/`));
        } else if (level === 3) {
            var appName = paths[1];
            var aliases = await getItemAliases(req, type, appName);
            var versionAliases = getAliasesForVersion(aliases, parseInt(paths[2]));
            res.json(makeTree(versionAliases, 'alias', `${id}/`));
        }
    } catch (ex) {
        // Send details in the body: reason phrases are dropped over HTTP/2 (e.g. behind nginx on dokku)
        res.status(ex.statusCode ? ex.statusCode : 500).json(ex instanceof Error ? { message: ex.message } : ex);
    }
});

router.get('/:type/info', async function(req, res) {
    console.log('GET /:type/info');
    try {
        var id = decodeURIComponent(req.query.id);
        var type = req.params.type;
        console.log(`GET /:type/info, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            var info = await getItem(req, type, id);
            console.log(info);
            res.json(info);
        } else if (level === 2) {
            // item
            if (paths[0] === 'Shared') {
                var nickName = req.query.nickName;
                var alias = req.query.alias;
                var fullName = getFullName(nickName, paths[1], alias);
                var info = await getItem(req, type, fullName);
                console.log(info);
                res.json(info);
            }
        } else if (level === 3) {
            // version

        } else if (level === 4) {
            // alias
            var nickName = decodeURIComponent(req.query.nickName);
            var fullName = getFullName(nickName, paths[1], paths[3]);
            var info = await getItem(req, type, fullName);
            console.log(info);
            res.json(info);
        } else {
            // Bad daRequest
            res.status(400).end();
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.post('/:type', jsonParser, async function(req, res) {
    console.log('POST /:type');
    try {
        var id = req.body.id;
        var type = req.params.type;
        console.log(`POST /:type, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            // create item for folder
            var reply = await createItem(req, type, req.body.body);
            res.json(reply);
        } else if (level === 2) {
            // create version for item
            var reply = await createItemVersion(req, type, paths[1], req.body.body);
            res.json(reply);
        } else if (level === 3) {
            // create alias for version
            var reply = await createItemAlias(req, type, paths[1], paths[2], req.body.alias, req.body.receiver);
            res.json(reply);
        } else {
            // create workitem
            var reply = await createItem(req, type, req.body.body);
            res.json(reply);
        }
    } catch (ex) {
        console.log(ex);
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.delete('/:type/:id', async function(req, res) {
    console.log('DELETE /:type/:id');
    try {
        var id = decodeURIComponent(req.params.id);
        var type = req.params.type;
        console.log(`DELETE /:type, :type = ${type}, id = ${id}`);

        var paths = id.split('/');
        var level = paths.length;

        if (level === 1) {
            // item
            var reply = await deleteItem(req, type, paths[0]);
            res.json(reply);
        } else if (level === 2) {
            // item
            var reply = await deleteItem(req, type, paths[1]);
            res.json(reply);
        } else if (level === 3) {
            // version
            var reply = await deleteItemVersion(req, type, paths[1], paths[2]);
            res.json(reply);
        } else if (level === 4) {
            // version
            var reply = await deleteItemAlias(req, type, paths[1], paths[3]);
            res.json(reply);
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

/////////////////////////////////////////////////////////////////
// WorkItems
/////////////////////////////////////////////////////////////////

router.get('/workitems/treeNode', async function(req, res) {
    console.log('GET /workitems/treeNode');
    try {
        var id = decodeURIComponent(req.query.id);
        console.log("GET /workitems/treeNode, id = " + id);

        var tokenSession = new token(req.session);
        var folders = [
            { id: 'Personal', children: true },
            { id: 'Shared', children: true }
        ];
        var paths = id.split('/');
        var level = paths.length;

        // Levels are:
        // Root >> Personal/Shared >> Bundles >> Versions >> Aliases
        // e.g. "Personal/ChangeParams/98/prod"

        if (id === '#') {
            // # stands for ROOT
            res.json(makeTree(folders, 'folder', '', true));
        } else if (level === 1) {
            var items = await getItems(req, type, id === 'Personal');
            res.json(makeTree(items, 'appbundle', `${id}/`));
        } else if (level === 2) {
            var appName = paths[1];
            var versions = await getItemVersions(req, type, appName);
            var aliases = await getItemAliases(req, appName);
            setItemVersionsChildren(versions, aliases);
            res.json(makeTree(versions, 'version', `${id}/`));
        } else {
            var appName = paths[1];
            var aliases = await getItemAliases(req, appName);
            //var versionAliases = getVersionAliases(paths[2], aliases);
            res.json(makeTree(aliases, 'alias', `${id}/`));
        }
    } catch (ex) {
        res.status(ex.statusCode ? ex.statusCode : 500).json({ message: (ex.message ? ex.message : ex) });
    }
});

router.get('/report/:url', async function(req, res) {
    console.log('GET /report');
    var inputUrl = req.params.url;

    if (!req.session || !req.session.access_token) {
        res.status(401).end('Unauthorized');
        return;
    }

    if (!inputUrl.startsWith('https://dasprod-store.s3.us-east-1.amazonaws.com/workItem')) {
        res.status(400).end('Invalid URL');
        return;
    }

    try {
      var response = await fetch(inputUrl);
      if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
      }
      var result = await response.text();

      res.end(result);
    } catch (ex) {
      res.status(500).end(ex.message);
    }
});

/////////////////////////////////////////////////////////////////
// Collects the information that we need to pass to the
// file tree object on the client
/////////////////////////////////////////////////////////////////
function makeTree(items, type, prefix) {
    if (!items) return '';
    var treeList = [];
    items.forEach(function(item, index) {
        var treeItem = {
            id: prefix + item.id,
            nickName: item.nickName,
            alias: item.alias,
            text: item.id,
            type: type,
            children: item.children
        };
        console.log(treeItem);
        treeList.push(treeItem);
    });

    return treeList;
}

/////////////////////////////////////////////////////////////////
// Return the router object that contains the endpoints
/////////////////////////////////////////////////////////////////
module.exports = router;