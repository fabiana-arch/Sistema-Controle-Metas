const express = require('express');
const router = express.Router();
const { registrar, login, perfil, listarUsuarios, alterarSenha } = require('../controllers/authController');
const { autenticar, soAdmin } = require('../middleware/auth');

router.post('/registrar', registrar);
router.post('/login', login);
router.get('/perfil', autenticar, perfil);
router.put('/senha', autenticar, alterarSenha);
router.get('/usuarios', autenticar, soAdmin, listarUsuarios);

module.exports = router;
