import { useTranslation } from "react-i18next";

export const CookiePolicy = () => {
    // Dependencies
    const { t } = useTranslation();
    const cookiePolicyHtml = { __html: t("cookiePolicy") };

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
    
    return (
        <div dangerouslySetInnerHTML={cookiePolicyHtml} style={{ padding:'20px' }}/>
    );
};
