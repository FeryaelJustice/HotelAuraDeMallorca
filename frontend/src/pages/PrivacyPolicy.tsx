import { useTranslation } from "react-i18next";

export const PrivacyPolicy = () => {
    // Dependencies
    const { t } = useTranslation();
    const privacyPolicyHtml = { __html: t("privacyPolicy") };

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    return (
        <div dangerouslySetInnerHTML={privacyPolicyHtml} style={{ padding:'20px' }}/>
    );
};
