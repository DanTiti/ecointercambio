// routes/match.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const stringSimilarity = require('string-similarity');

function limpiarTexto(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

function esSimilarFuzzy(a, b, umbral = 0.7) {
  a = limpiarTexto(a);
  b = limpiarTexto(b);
  const score = stringSimilarity.compareTwoStrings(a, b);
  return score >= umbral;
}

const CATEGORIAS_SIMILARES = [
  ['regla', 'escuadra', 'transportador', 'compás'],
  ['lapiz', 'bolígrafo', 'pluma', 'plumon'],
  ['colores', 'crayones', 'marcadores', 'borrador'],
  ['cuaderno', 'libreta', 'hojas'],
  ['mochila', 'estuche']
];

function sonDeCategoriaSimilar(a, b) {
  a = limpiarTexto(a);
  b = limpiarTexto(b);
  return CATEGORIAS_SIMILARES.some(grupo => grupo.includes(a) && grupo.includes(b));
}

router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const sqlMisProductos = "SELECT * FROM productos WHERE usuario_id = ? AND estado = 'activo'";
    const [misProductos] = await db.query(sqlMisProductos, [userId]);

    if (misProductos.length === 0) {
      return res.status(200).json([]);
    }

    const misCoincidencias = [];
    const clavesUnicas = new Map();

    await Promise.all(
      misProductos.map(async producto => {
        const sqlBusqueda = `
          SELECT productos.*, usuarios.nickname 
          FROM productos 
          INNER JOIN usuarios ON productos.usuario_id = usuarios.id 
          WHERE productos.usuario_id != ? AND productos.estado = 'activo'
        `;

        const [resultados] = await db.query(sqlBusqueda, [userId]);

        resultados.forEach(r => {
          const buscaPerfecto = esSimilarFuzzy(producto.ofrece, r.busca);
          const ofrecePerfecto = esSimilarFuzzy(producto.busca, r.ofrece);

          const buscaCategoria = sonDeCategoriaSimilar(producto.ofrece, r.busca);
          const ofreceCategoria = sonDeCategoriaSimilar(producto.busca, r.ofrece);

          let tipoNuevo = null;
          if (buscaPerfecto && ofrecePerfecto) {
            tipoNuevo = 'perfecto';
          } else if ((buscaCategoria && ofrecePerfecto) || (buscaPerfecto && ofreceCategoria)) {
            tipoNuevo = 'categoria';
          } else if (buscaPerfecto || ofrecePerfecto) {
            tipoNuevo = 'parcial';
          }

          if (!tipoNuevo) return;

          const claveIds = [producto.id, r.id].sort((a, b) => a - b).join('-');
          const clave = `${claveIds}`;

          if (clavesUnicas.has(clave)) {
            const idx = clavesUnicas.get(clave);
            const existente = misCoincidencias[idx];
            if (tipoNuevo === 'perfecto' && existente.tipo !== 'perfecto') {
              misCoincidencias[idx] = crearMatch(producto, r, tipoNuevo);
            } else if (tipoNuevo === 'categoria' && existente.tipo === 'parcial') {
              misCoincidencias[idx] = crearMatch(producto, r, tipoNuevo);
            }
          } else {
            misCoincidencias.push(crearMatch(producto, r, tipoNuevo));
            clavesUnicas.set(clave, misCoincidencias.length - 1);
          }
        });
      })
    );

    const ordenado = misCoincidencias.sort((a, b) => {
      if (a.tipo === b.tipo) return 0;
      if (a.tipo === 'perfecto') return -1;
      if (b.tipo === 'perfecto') return 1;
      if (a.tipo === 'categoria') return -1;
      return 1;
    });

    res.status(200).json(ordenado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener coincidencias" });
  }
});

function crearMatch(producto, r, tipo) {
  return {
    miProducto: producto.nombre,
    miImagen: producto.imagen,
    buscaYo: producto.busca,
    ofrezcoYo: producto.ofrece,
    buscaEl: r.busca,
    ofreceEl: r.ofrece,
    nombreProductoEl: r.nombre,
    nombreUsuario: r.nickname,
    usuario: r.usuario_id,
    tipo: tipo,
    imagen: r.imagen
  };
}

module.exports = router;
