const express = require('express');
const router = express.Router();
const { listar, buscarPorId, criar, atualizar, remover, resumo } = require('../controllers/metasController');
const { autenticar } = require('../middleware/auth');

router.get('/resumo', autenticar, resumo);
router.get('/', autenticar, listar);
router.get('/:id', autenticar, buscarPorId);
router.post('/', autenticar, criar);
router.put('/:id', autenticar, atualizar);
router.delete('/:id', autenticar, remover);

module.exports = router;
