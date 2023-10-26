/* eslint-disable react/prop-types */
import { ReactNode } from "react"
import './BaseModal.css';
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal';

import { useTranslation } from "react-i18next";

interface BaseModalProps {
    title: String,
    children: ReactNode;
    show: boolean;
    onClose: () => void;
}


const BaseModal = ({ title, children, show, onClose }: BaseModalProps) => {
    const { t } = useTranslation();

    return (
        <Modal size="lg" show={show} onHide={onClose} backdrop="static" keyboard={false} arial-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {children}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>{t("close")}</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default BaseModal;