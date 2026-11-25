
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({
        mensaje: 'API de ETS iniciada correctamente'
    });
});

module.exports = router;
