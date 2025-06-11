const express = require('express');
const router = express.Router();
const db = require('../db'); // ← asegúrate que es mysql2/promise
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

router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const sqlMisProductos = "SELECT * FROM productos WHERE usuario_id = ?";
    const [misProductos] = await db.query(sqlMisProductos, [userId]);

    if (misProductos.length === 0) {
      return res.status(200).json([]);
    }

    const misCoincidencias = [];
    const clavesUnicas = new Map();

    // Usamos Promise.all para esperar todas las búsquedas en paralelo
    await Promise.all(
      misProductos.map(async producto => {
        const sqlBusqueda = `
          SELECT productos.*, usuarios.nickname 
          FROM productos 
          INNER JOIN usuarios ON productos.usuario_id = usuarios.id 
          WHERE productos.usuario_id != ?
        `;

        const [resultados] = await db.query(sqlBusqueda, [userId]);

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
            return; // No es ni siquiera parcial
          }

          const claveIds = [producto.id, r.id].sort((a, b) => a - b).join('-');
          const clave = `${claveIds}`;

          if (clavesUnicas.has(clave)) {
            const idx = clavesUnicas.get(clave);
            const existente = misCoincidencias[idx];

            if (tipoNuevo === 'perfecto' && existente.tipo !== 'perfecto') {
              misCoincidencias[idx] = {
                miProducto: producto.nombre,
                miImagen: producto.imagen,
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
          } else {
            misCoincidencias.push({
              miProducto: producto.nombre,
              miImagen: producto.imagen,
              buscaYo: producto.busca,
              ofrezcoYo: producto.ofrece,
              buscaEl: r.busca,
              ofreceEl: r.ofrece,
              nombreProductoEl: r.nombre,
              nombreUsuario: r.nickname,
              usuario: r.usuario_id,
              tipo: tipoNuevo,
              imagen: r.imagen
            });
            clavesUnicas.set(clave, misCoincidencias.length - 1);
          }
        });
      })
    );

    const ordenado = misCoincidencias.sort((a, b) => a.tipo === 'perfecto' ? -1 : 1);
    res.status(200).json(ordenado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener coincidencias" });
  }
});

module.exports = router;
