const express = require('express');
const router = express.Router();
const db = require('../db');
const stringSimilarity = require('string-similarity');

function limpiarTexto(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

function esSimilar(a, b, umbral = 0.6) {
  a = limpiarTexto(a);
  b = limpiarTexto(b);
  return stringSimilarity.compareTwoStrings(a, b) >= umbral;
}

router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const [misProductos] = await db.query("SELECT * FROM productos WHERE usuario_id = ?", [userId]);
    if (misProductos.length === 0) return res.status(200).json([]);

    const sqlOtros = `
      SELECT productos.*, usuarios.nickname AS nombreUsuario 
      FROM productos 
      JOIN usuarios ON productos.usuario_id = usuarios.id 
      WHERE productos.usuario_id != ?
    `;
    const [otrosProductos] = await db.query(sqlOtros, [userId]);

    const sugerencias = [];

    misProductos.forEach(mi => {
      otrosProductos.forEach(otro => {
        if (esSimilar(mi.busca, otro.ofrece)) {
          sugerencias.push({
            miProducto: mi.nombre,
            loQueBusco: mi.busca,
            encontrado: otro.nombre,
            loQueOfrece: otro.ofrece,
            loQueBusca: otro.busca,
            nombreUsuario: otro.nombreUsuario,
            imagen: otro.imagen,
            usuario_id: otro.usuario_id
          });
        }
      });
    });

    res.status(200).json(sugerencias);
  } catch (err) {
    console.error('Error en sugerencias:', err);
    res.status(500).json({ error: 'Error al obtener sugerencias' });
  }
});

module.exports = router;
