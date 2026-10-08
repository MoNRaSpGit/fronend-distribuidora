# frontend-distribuidora

Toma de pedidos para una distribuidora, pensada para el celular.

- **Vendedor** (pantalla inicial): busca el cliente, lo selecciona, arma el pedido sumando productos y lo confirma. El pedido queda pendiente.
- **Oficina** (`#oficina`): ve los pedidos pendientes, abre uno y genera la boleta numerada, lista para imprimir. También da de alta clientes y productos.

No tiene login todavía: las dos pantallas se cambian desde la barra de arriba.

## Desarrollo

```
npm install
npm run dev
```

En `localhost` la app le pega al backend local (`http://localhost:3000`); publicada, al de Render. Se puede forzar otro con `VITE_API_BASE_URL`.

El backend es el módulo `distribuidora` del repo `backend` (`src/modules/distribuidora`, migración `104_saas_distribuidora_core.sql`).

## Datos de la distribuidora

El nombre, RUT, dirección y teléfono que salen en la boleta están en `src/features/distribuidora/distribuidora.shared.ts` (`EMPRESA`) y son de ejemplo. El logo es `public/logo.svg`.

Los precios se toman con IVA incluido: la boleta desglosa subtotal e IVA 22% a partir del total.

## Publicar

Cada push a `main` publica en GitHub Pages (`.github/workflows/deploy.yml`). El `base` de `vite.config.ts` tiene que coincidir con el nombre del repo.
