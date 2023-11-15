import BaseModal from './BaseModal';

interface ViewImageModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
    imagePreviewData: any;
}

const ViewImageModal = ({ colorScheme, show, onClose, imagePreviewData }: ViewImageModalProps) => {

    const handleClose = () => {
        onClose();
    }

    return (
        <BaseModal title={imagePreviewData.title} show={show} onClose={handleClose}>
            <img src={imagePreviewData.src} alt='Image' style={{ width: '100%', height: 'auto' }}></img>
            <p style={{ fontSize: '1.2em', textAlign: 'center', color: colorScheme == "dark" ? '#B7ADFF' : '#0000F0'}}><b>{imagePreviewData.description}</b></p>
        </BaseModal>
    )
};

export default ViewImageModal;