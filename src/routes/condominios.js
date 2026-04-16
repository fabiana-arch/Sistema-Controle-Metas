const express = require('express');
const router = express.Router();
const { listar, criar, atualizar, remover } = require('../controllers/condominiosController');
const { autenticar, soAdmin } = require('../middleware/auth');

router.get('/', autenticar, listar);
router.post('/', autenticar, soAdmin, criar);
router.put('/:id', autenticar, soAdmin, atualizar);
router.delete('/:id', autenticar, soAdmin, remover);

module.exports = router;
