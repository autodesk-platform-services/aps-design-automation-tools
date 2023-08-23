/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Autodesk Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

'use strict'; // http://www.w3schools.com/js/js_strict.asp

// web framework
var express = require('express');
var router = express.Router();

var apsSDK = require('forge-apis');

// APS config information, such as client ID and secret
var config = require('./config');

router.use(express.json());

// this end point will logoff the user by destroying the session
// as of now there is no APS endpoint to invalidate tokens
router.get('/user/logoff', function(req, res) {
    req.session.destroy();
    res.end('/');
});

async function getToken(session, client_id, client_secret) {
    var client = new apsSDK.AuthClientTwoLeggedV2(client_id, client_secret, config.scopeInternal);
    var credentials = await client.authenticate();

    session.client_id = client_id;
    session.client_secret = client_secret;
    session.access_token = credentials.access_token;

    console.log('Token: ' + credentials.access_token);

    return credentials;
}

// wait for Autodesk callback (oAuth callback)
router.post('/user/token', async function(req, res) {
    console.log('/user/token');
    try {
        var client_id = req.body.client_id;
        var client_secret = req.body.client_secret;

        var credentials = await getToken(req.session, client_id, client_secret);

        res.json({ token: credentials.access_token, expires_in: credentials.expires_in });

        // Will call it a bit earlier than the actual expiration time, that's why
        // multiplying it with 900 instead of 1000 to convert from s to ms 
        setTimeout(() => getToken(req.session, client_id, client_secret), credentials.expires_in * 900);
    } catch (err) {
        res.status(500).end(err.developerMessage);
    }
});

module.exports = router;