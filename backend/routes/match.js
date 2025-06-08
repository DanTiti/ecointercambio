const express = require('express');
const router = express.Router();
const db = require('../db');
const stringSimilarity = require('string-similarity');

function limpiarTexto(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .trim();
}

function esSimilarFuzzy(a, b, umbral = 0.7) {
  a = limpiarTexto(a);
  b = limpiarTexto(b);
  const score = stringSimilarity.compareTwoStrings(a, b);
  return score >= umbral;
}

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;

  const sqlMisProductos = "SELECT * FROM productos WHERE usuario_id = ?";
  db.query(sqlMisProductos, [userId], (err, misProductos) => {
    if (err) return res.status(500).json({ error: "Error al obtener mis productos" });
    if (misProductos.length === 0) return res.status(200).json([]);

    const misCoincidencias = [];
    const clavesUnicas = new Map(); // clave -> índice en misCoincidencias
    let pendientes = misProductos.length;

    misProductos.forEach(producto => {
      const sqlBusqueda = `
        SELECT productos.*, usuarios.nickname 
        FROM productos 
        INNER JOIN usuarios ON productos.usuario_id = usuarios.id 
        WHERE productos.usuario_id != ?
      `;

      db.query(sqlBusqueda, [userId], (err, resultados) => {
        if (err) {
          pendientes--;
          if (pendientes === 0) {
            // Ordenar y enviar respuesta aunque haya errores
            const ordenado = misCoincidencias.sort((a, b) => a.tipo === 'perfecto' ? -1 : 1);
            return res.status(200).json(ordenado);
          }
          return;
        }

        resultados.forEach(r => {
          const buscaSimilarPerfecto = esSimilarFuzzy(producto.ofrece, r.busca);
          const ofreceSimilarPerfecto = esSimilarFuzzy(producto.busca, r.ofrece);

          const tipoNuevo = (buscaSimilarPerfecto && ofreceSimilarPerfecto) ? 'perfecto' : 'parcial';

          if (
            tipoNuevo === 'parcial' && 
            !(
              esSimilarFuzzy(producto.ofrece, r.busca, 0.5) || 
              esSimilarFuzzy(producto.busca, r.ofrece, 0.5)
            )
          ) {
            // Ni siquiera parcial, saltamos
            return;
          }

          // Crear clave ordenada para evitar duplicados cruzados
          const claveIds = [producto.id, r.id].sort((a, b) => a - b).join('-');
          // También incluir tipo para controlar reemplazos
          const clave = `${claveIds}`;

          if (clavesUnicas.has(clave)) {
            const idx = clavesUnicas.get(clave);
            const existente = misCoincidencias[idx];

            // Si ya hay una coincidencia, y la nueva es "perfecto" y la existente no,
            // reemplazamos para mantener la mejor coincidencia
            if (tipoNuevo === 'perfecto' && existente.tipo !== 'perfecto') {
              misCoincidencias[idx] = {
                miProducto: producto.nombre,
                buscaYo: producto.busca,
                ofrezcoYo: producto.ofrece,
                buscaEl: r.busca,
                ofreceEl: r.ofrece,
                nombreProductoEl: r.nombre,
                nombreUsuario: r.nickname,
                tipo: tipoNuevo,
                imagen: r.imagen
              };
            }
            // Si la existente es igual o mejor, no hacemos nada para evitar duplicados
          } else {
            // Agregamos nuevo match
            misCoincidencias.push({
              miProducto: producto.nombre,
              buscaYo: producto.busca,
              ofrezcoYo: producto.ofrece,
              buscaEl: r.busca,
              ofreceEl: r.ofrece,
              nombreProductoEl: r.nombre,
              nombreUsuario: r.nickname,
              tipo: tipoNuevo,
              imagen: r.imagen
            });
            clavesUnicas.set(clave, misCoincidencias.length - 1);
          }
        });

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
