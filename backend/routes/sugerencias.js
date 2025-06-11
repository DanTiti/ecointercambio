// backend/routes/sugerencias.js
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

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  const sqlMisProductos = "SELECT * FROM productos WHERE usuario_id = ?";
  db.query(sqlMisProductos, [userId], (err, misProductos) => {
    if (err) return res.status(500).json({ error: 'Error al obtener productos' });
    if (misProductos.length === 0) return res.status(200).json([]);

    const sqlOtros = `
      SELECT productos.*, usuarios.nickname AS nombreUsuario 
      FROM productos 
      JOIN usuarios ON productos.usuario_id = usuarios.id 
      WHERE productos.usuario_id != ?
    `;
    db.query(sqlOtros, [userId], (err, otrosProductos) => {
      if (err) return res.status(500).json({ error: 'Error al obtener sugerencias' });

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
    });
  });
});

module.exports = router;
