// El "- cantidad +" de un renglon de pedido. Lo usan el vendedor al armar
// el pedido y la oficina al editarlo.
export function QuantityStepper({ quantity, onChange }: { quantity: number; onChange: (quantity: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Restar" onClick={() => onChange(quantity - 1)}>
        −
      </button>
      <span>{quantity}</span>
      <button type="button" aria-label="Sumar" onClick={() => onChange(quantity + 1)}>
        +
      </button>
    </div>
  );
}
