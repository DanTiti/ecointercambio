const express = require('express');
const router = express.Router();
const db = require('../db'); 

// =================================================================
// 1. OBTENER ESTADO DE LA PROPUESTA (Para el Chat)
// =================================================================
router.get('/estado-propuesta-chat/:usuario_id/:contacto_id', async (req, res) => {
    const { usuario_id, contacto_id } = req.params;
    try {
        const [trato] = await db.query(
            `SELECT t.*, 
                    p1.ofrece AS producto_original, 
                    p2.ofrece AS producto_ofrecido,
                    u.nickname AS nombre_proponente
             FROM transacciones t
             LEFT JOIN productos p1 ON t.producto_id = p1.id
             LEFT JOIN productos p2 ON t.producto_cambio_id = p2.id
             LEFT JOIN usuarios u ON t.usuario_busca_id = u.id
             WHERE (t.usuario_ofrece_id = ? AND t.usuario_busca_id = ?)
                OR (t.usuario_ofrece_id = ? AND t.usuario_busca_id = ?)
             ORDER BY t.id DESC LIMIT 1`, 
            [usuario_id, contacto_id, contacto_id, usuario_id]
        );

        if (trato.length === 0) return res.json({ status: 'ninguno' });
        
        const t = trato[0];
        const esReceptor = parseInt(usuario_id, 10) === parseInt(t.usuario_ofrece_id, 10);
        
        const miConfirmacion = esReceptor ? t.confirma_ofrece : t.confirma_busca;
        const miCalificacion = esReceptor ? t.calificacion_a_busca : t.calificacion_a_ofrece;
        
        if (t.estado === 'completado' && miCalificacion === null) {
            return res.json({ status: 'completado_pendiente_calificar', transaccion_id: t.id });
        }
        
        res.json({
            status: t.estado,
            es_receptor: esReceptor,
            mi_confirmacion: miConfirmacion,
            proponente: t.nombre_proponente || 'Un usuario',
            producto_ofrecido: t.producto_ofrecido || 'un artículo',
            producto_id: t.producto_id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar propuesta' });
    }
});

// =================================================================
// 2. ACEPTAR LA PROPUESTA
// =================================================================
router.post('/aceptar', async (req, res) => {
    const { producto_id } = req.body;
    try {
        await db.query("UPDATE transacciones SET estado = 'aceptado' WHERE producto_id = ? AND estado = 'propuesta_pendiente'", [producto_id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al aceptar el trato' });
    }
});

// =================================================================
// 3. CONFIRMAR ENTREGA FINAL
// =================================================================
router.post('/confirmar', async (req, res) => {
    const { producto_id, usuario_id } = req.body;
    try {
        const [existe] = await db.query("SELECT * FROM transacciones WHERE producto_id = ? AND estado = 'aceptado'", [producto_id]);
        if (existe.length > 0) {
            const t = existe[0];
            const esOfrece = parseInt(usuario_id, 10) === parseInt(t.usuario_ofrece_id, 10);
            if (esOfrece) {
                await db.query("UPDATE transacciones SET confirma_ofrece = 1 WHERE id = ?", [t.id]);
            } else {
                await db.query("UPDATE transacciones SET confirma_busca = 1 WHERE id = ?", [t.id]);
            }
            const [revisar] = await db.query("SELECT confirma_ofrece, confirma_busca, producto_cambio_id FROM transacciones WHERE id = ?", [t.id]);
            if (revisar[0].confirma_ofrece === 1 && revisar[0].confirma_busca === 1) {
                await db.query("UPDATE transacciones SET estado = 'completado' WHERE id = ?", [t.id]);
                await db.query("UPDATE productos SET estado = 'intercambiado' WHERE id = ?", [producto_id]);
                if (revisar[0].producto_cambio_id) {
                    await db.query("UPDATE productos SET estado = 'intercambiado' WHERE id = ?", [revisar[0].producto_cambio_id]);
                }
                return res.json({ status: 'completado', transaccion_id: t.id });
            }
            return res.json({ status: 'esperando' });
        }
        return res.json({ status: 'error', message: 'No se encontró un trato aceptado.' });
    } catch (err) {
        console.error("Error al confirmar el trato:", err);
        res.status(500).json({ error: 'Error interno al procesar la confirmación.' });
    }
});

// =================================================================
// 4. CALIFICAR UNA TRANSACCIÓN
// =================================================================
router.post('/calificar', async (req, res) => {
    const { transaccion_id, usuario_id, estrellas } = req.body;
    try {
        const [trans] = await db.query("SELECT * FROM transacciones WHERE id = ?", [transaccion_id]);
        if (trans.length === 0) return res.status(404).json({ error: "Transacción no encontrada." });
        const t = trans[0];
        const esOfrente = parseInt(usuario_id, 10) === parseInt(t.usuario_ofrece_id, 10);
        const columnaDestino = esOfrente ? 'calificacion_a_busca' : 'calificacion_a_ofrece';
        await db.query(`UPDATE transacciones SET ${columnaDestino} = ? WHERE id = ?`, [estrellas, transaccion_id]);
        res.json({ success: true, message: "Calificación guardada." });
    } catch (err) {
        console.error("❌ Error en /calificar:", err);
        res.status(500).json({ error: "Error interno." });
    }
});

// =================================================================
// 5. OBTENER HISTORIAL
// =================================================================
router.get('/historial-completo/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const [transacciones] = await db.query(
            `SELECT t.* FROM transacciones t 
             WHERE t.estado = 'completado' AND (t.usuario_ofrece_id = ? OR t.usuario_busca_id = ?)
             ORDER BY t.id DESC`,
            [usuario_id, usuario_id]
        );
        const [productos] = await db.query("SELECT id, ofrece, busca, imagen FROM productos");
        const [usuarios] = await db.query("SELECT * FROM usuarios");
        const mapaProductos = {};
        productos.forEach(p => { mapaProductos[p.id] = p; });
        const mapaUsuarios = {};
        usuarios.forEach(u => {
            mapaUsuarios[u.id] = u.nickname || u.nombreUsuario || u.nombre || "Usuario Desconocido";
        });
        const historialPersonalizado = transacciones.map(t => {
            const esOfrente = parseInt(usuario_id, 10) === parseInt(t.usuario_ofrece_id, 10);
            const idDelOtro = esOfrente ? t.usuario_busca_id : t.usuario_ofrece_id;
            const miProductoRealId = esOfrente ? t.producto_id : t.producto_cambio_id;
            const otroProductoRealId = esOfrente ? t.producto_cambio_id : t.producto_id;
            const miProducto = mapaProductos[miProductoRealId] || { ofrece: "Artículo no disponible", imagen: "" };
            const productoDelOtro = mapaProductos[otroProductoRealId] || { ofrece: "Artículo no disponible", imagen: "" };
            const miCalificacion = esOfrente ? t.calificacion_a_ofrece : t.calificacion_a_busca;
            return {
                transaccion_id: t.id,
                miProductoNombre: miProducto.ofrece,
                miProductoImagen: miProducto.imagen || "",
                productoObtenidoNombre: productoDelOtro.ofrece,
                productoObtenidoImagen: productoDelOtro.imagen || "",
                nombreUsuarioCambiado: mapaUsuarios[idDelOtro] || "Usuario Eliminado",
                MiCalificacion: miCalificacion || 0
            };
        });
        res.json(historialPersonalizado);
    } catch (err) {
        console.error("❌ Error crítico al procesar el historial:", err);
        res.status(500).json({ error: "Error interno al obtener el historial." });
    }
});

// =================================================================
// 6. OBTENER PENDIENTES (Notificaciones)
// =================================================================
router.get('/pendientes/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const sql = `
            SELECT t.*, 
                   u.nickname as otro_usuario_nickname,
                   p.ofrece as producto_nombre
            FROM transacciones t
            JOIN productos p ON t.producto_id = p.id
            JOIN usuarios u ON (u.id = t.usuario_busca_id OR u.id = t.usuario_ofrece_id)
            WHERE ((t.usuario_ofrece_id = ? AND t.estado = 'propuesta_pendiente')
               OR (t.usuario_busca_id = ? AND t.estado = 'aceptado'))
               AND u.id != ?
            LIMIT 1
        `;
        const [resultados] = await db.query(sql, [userId, userId, userId]);
        res.json(resultados.length > 0 ? resultados[0] : null);
    } catch (err) {
        console.error("Error en pendientes:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;