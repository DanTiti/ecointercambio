const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;

  // Obtener productos del usuario actual
  const sqlMisProductos = "SELECT * FROM productos WHERE usuario_id = ?";
  db.query(sqlMisProductos, [userId], (err, misProductos) => {
    if (err) return res.status(500).json({ error: "Error al obtener mis productos" });
    if (misProductos.length === 0) return res.status(200).json([]);

    const misCoincidencias = [];
    let pendientes = misProductos.length;

    misProductos.forEach(producto => {
      const sqlBusqueda = `
        SELECT productos.*, usuarios.nickname 
        FROM productos 
        INNER JOIN usuarios ON productos.usuario_id = usuarios.id 
        WHERE productos.usuario_id != ? AND (
          (productos.busca = ? AND productos.ofrece = ?)
          OR (productos.busca = ? OR productos.ofrece = ?)
        )
      `;

      db.query(sqlBusqueda, [
        userId,
        producto.ofrece, producto.busca,
        producto.ofrece, producto.busca
      ], (err, resultados) => {
        if (!err) {
          resultados.forEach(r => {
            const tipo =
              r.busca === producto.ofrece && r.ofrece === producto.busca
                ? 'perfecto'
                : 'parcial';

            misCoincidencias.push({
              miProducto: producto.nombre,
              buscaYo: producto.busca,
              ofrezcoYo: producto.ofrece,
              buscaEl: r.busca,
              ofreceEl: r.ofrece,
              nombreProductoEl: r.nombre,
              nombreUsuario: r.nickname,
              tipo,
              imagen: r.imagen
            });
          });
        }

        pendientes--;
        if (pendientes === 0) {
          const ordenado = misCoincidencias.sort((a, b) => a.tipo === 'perfecto' ? -1 : 1);
          res.status(200).json(ordenado);
        }
      });
    });
  });
});

module.exports = router;
