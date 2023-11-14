import BaseModal from './BaseModal';

interface ViewImageModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
    imagePreviewData: any;
}

const ViewImageModal = ({ colorScheme, show, onClose, imagePreviewData }: ViewImageModalProps) => {
    console.log(colorScheme)

    const handleClose = () => {
        onClose();
    }

    return (
        <BaseModal title={imagePreviewData.title} show={show} onClose={handleClose}>
            <img src={imagePreviewData.src} alt='Image' style={{width:'100%', height: 'auto'}}></img>
        </BaseModal>
    )
};

export default ViewImageModal;