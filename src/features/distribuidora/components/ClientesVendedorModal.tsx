import { useState } from "react";
import { NuevoClienteModal } from "./NuevoClienteModal";

interface Props {
  onClose: () => void;
}

// Pestaña "Clientes" del menu de usuario para la vendedora (10/11/2026,
// pedido explicito): solo puede AGREGAR clientes, no buscarlos ni editarlos.
export function ClientesVendedorModal({ onClose }: Props) {
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  if (adding) {
    return (
      <NuevoClienteModal
        onClose={() => setAdding(false)}
        onCreated={(client) => {
          setAdding(false);
          setNotice(`Cliente "${client.name}" agregado.`);
        }}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>Clientes</h2>
        {notice && <p className="message message-ok">{notice}</p>}
        <p className="message">Acá podés sumar clientes nuevos. Para cambiar los datos de uno que ya existe, avisale a la oficina.</p>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="button button-primary" onClick={() => setAdding(true)}>
            + Agregar cliente
          </button>
        </div>
      </div>
    </div>
  );
}
