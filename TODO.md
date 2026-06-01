# TODO - Continuación de la última tarea

## Objetivo
Corregir el bug identificado en el frontend ETL para que el flujo de **subida de dataset** funcione estable.

## Pasos
- [x] Revisar y editar `frontend/static/js/etl.js` eliminando duplicación de `subirDataset()` y dejando una sola implementación consistente.
- [x] Limpiar residuos no usados (p.ej. variables auxiliares) en el mismo archivo.

- [x] Verificar que el endpoint `/api/etl/upload/` se consume correctamente con JWT y multipart. (revisión estática)
- [ ] Ejecutar tests o correr el servidor y validar UI (requerirá Python disponible en el sistema).



