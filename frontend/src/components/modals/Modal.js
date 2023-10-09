/* eslint-disable react/prop-types */
import { useState } from "react";

const Modal = ({
    title,
    content,
    onClose,
    onSubmit,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setIsOpen(true)}>Abrir modal</button>
            {isOpen && (
                <div>
                    <h2>{title}</h2>
                    {content}
                    <button onClick={onClose}>Cerrar</button>
                    {onSubmit && <button onClick={onSubmit}>Enviar</button>}
                </div>
            )}
        </div>
    );
};

export default Modal;