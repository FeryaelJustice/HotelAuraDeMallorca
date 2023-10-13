/* eslint-disable react/prop-types */
import { ReactNode } from "react"
interface BaseModalProps {

    children: ReactNode;
    onClose: () => void;
}


const BaseModal: React.FC<BaseModalProps> = ({ children, onClose }) => {
    return (
        <div className="modal">
            <div className="modal-content">
                {children}
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default BaseModal;