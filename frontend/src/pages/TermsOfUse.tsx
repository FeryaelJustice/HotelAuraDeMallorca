import { useTranslation } from "react-i18next";

export const TermsOfUse = () => {
    // Dependencies
    const { t } = useTranslation();
    const termsOfUseHtml = { __html: t("termsOfUse") };

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    return (
        <div dangerouslySetInnerHTML={termsOfUseHtml} style={{ padding:'20px' }}/>
    );
};
