const express = require('express');
const ejs = require('ejs');
const SERVER_ENV = require('../config.json');
const axios = require('axios');

const router = express.Router();

router.get('/', (req, res) => {
  return res.send('it works');
});

router.post('/generate-message', async (req, res) => {

  let _identifierName  = req.body.identifierName || 'unknown';
  let _mode           = req.body.mode || 'general';
  let _channelID      = req.body.channelID || SERVER_ENV.DISCORD.CHANNEL_DEFAULT;
  let _mentionUserID  = req.body.mentionUserID || null;
  let _clientKey      = req.body.accessKey || null;
  let _flushTime      = req.body.flushTime || new Date().getTime();
  let _onFailureRetry = req.body.retry || false;
  let _message        = req.body.message || null;
  let _directMessage  = req.body.dm || req.body.directMessage || false;
  // TODO: !!!!!!!!!!!!!!!!1
  let _embed          = req.body.embed || false; 

  let ret = {};
  ret.error = true;
  ret.message = 'Not defined';
  ret.status = 0;
  
  if (_clientKey !== SERVER_ENV.DISCORD.IDENTIFIERKEY && _clientKey !== SERVER_ENV.PROGMA.MASTERKEY) {
    ret.message = 'Permission denied';
    return res.status(403).json(ret);
  }

  if (_embed) {
    // TODO::::::::::
  }

  try {
    
    const json = {
      source: {
        mode: _mode,
        channelID: _channelID,
        mentionUserID: _mentionUserID,
        message: _message,
        directMessage: _directMessage,
        embed: _embed
      },
      accessKey: SERVER_ENV.DISCORD.QUEUEKEY,
      flushTime: _flushTime,
      onFailureRetry: _onFailureRetry,
      identifierName: _identifierName
    }
    
    const sendQueue = await axios.post(SERVER_ENV.DISCORD.QUEUE_ENDPOINT, JSON.stringify(json), {
      headers: {'Content-Type': 'application/json'}
    });
    
    if (sendQueue) {
      ret.error = false;
      ret.message = 'Success';
      ret.status = 1;
      return res.json(ret);
    }
    
    
  } catch (e) {
    console.error(e);
    ret.message = 'backend transport error';
    return res.status(500).json(ret);
  }

});

module.exports = router;
