import { useTranslation } from "react-i18next";

export const LegalNotice = () => {
    // Dependencies
    const { t } = useTranslation();
    const legalNoticeHtml = { __html: t("legalNotice") };

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    return (
        <div dangerouslySetInnerHTML={legalNoticeHtml} style={{ padding: '20px' }} />
    );
};
